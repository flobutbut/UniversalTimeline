import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import type { ListPeriod, ListEvent, StorySummary, Story, DeletePeriodResult, EventImportance } from '@/types/database';
import { withEventImportance } from '@/lib/eventImportance';
import { isPeriodDescendant } from '@/lib/periodHierarchy';
import { createRequestCache, type RequestStatus } from '@/lib/requestCache';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';

export const useDataStore = defineStore('data', () => {
  const periods = ref<ListPeriod[]>([]);
  const events = ref<ListEvent[]>([]);
  const stories = ref<StorySummary[]>([]);
  const requests = reactive<Record<string, RequestStatus>>({});
  const reads = createRequestCache((key, status) => { requests[key] = status; });
  const loading = computed(() => requests.roots?.loading ?? false);
  const error = computed(() => requests.roots?.error ?? null);
  const storyPeriodsCache = new Map<string, ListPeriod[]>();
  const storyDetailsCache = new Map<string, Story>();
  const storyEventsCache = new Map<string, ListEvent[]>();
  const deletedPeriodIds = new Set<string>();

  const rootPeriods = computed(() => periods.value.filter(p => !p.hasParent && !p.parentId));
  const periodById = (id: string) => periods.value.find(p => p.id === id) ?? null;
  const eventById = (id: string) => events.value.find(e => e.id === id) ?? null;
  const storyById = (id: string) => stories.value.find(s => s.id === id) ?? null;
  const childrenOf = (parentId: string) => periods.value.filter(p => p.parentId === parentId);

  function upsertById<T extends { id: string }>(items: T[], saved: T): T[] {
    const index = items.findIndex(item => item.id === saved.id);
    if (index < 0) return [...items, saved];
    return items.map((item, position) => position === index ? saved : item);
  }

  function mergePeriods(rows: ListPeriod[]) {
    for (const period of rows) {
      if (!deletedPeriodIds.has(period.id)) {
        const cataloguePeriod = { ...period };
        if (cataloguePeriod.storyParentId !== undefined) {
          cataloguePeriod.parentId = null;
          cataloguePeriod.hasParent = false;
          cataloguePeriod.hasChildren = false;
        }
        delete cataloguePeriod.storyParentId;
        periods.value = upsertById(periods.value, cataloguePeriod);
      }
    }
    // A saved period replaces its temporary Wikidata suggestion.
    const savedQids = new Set(periods.value.filter(p => !p.id.startsWith('wikidata:')).map(p => p.wikidata_id).filter(Boolean));
    periods.value = periods.value.filter(p => !p.id.startsWith('wikidata:') || !savedQids.has(p.wikidata_id));
  }

  async function ensureRootsLoaded(force = false): Promise<void> {
    await reads.load('roots', () => PeriodApiService.getInstance().getListPeriods(), rows => {
      if (force) periods.value = periods.value.filter(period => period.id.startsWith('wikidata:'));
      mergePeriods(rows);
    }, force);
  }

  async function ensureChildrenLoaded(parentId: string): Promise<ListPeriod[]> {
    await reads.load(`children:${parentId}`, () => PeriodApiService.getInstance().loadChildren(parentId), rows => {
      mergePeriods(rows);
      periods.value = periods.value.map(p => p.id === parentId ? { ...p, hasChildren: rows.length > 0 } : p);
    });
    return childrenOf(parentId);
  }

  async function ensureStoryPeriodsLoaded(storyId: string): Promise<ListPeriod[]> {
    await reads.load(`story-periods:${storyId}`, () => StoryApiService.getInstance().getStoryPeriods(storyId), raw => {
      const mapped = raw.map(source => {
        const period = PeriodApiService.mapPeriod(source);
        const known = periodById(period.id);
        // This endpoint omits categories and child flags: absence is not emptiness.
        if (known && source.categories === undefined) period.categories = known.categories;
        if (known && source.has_children === undefined && source.hasChildren === undefined) period.hasChildren = known.hasChildren;
        return period;
      }).filter(p => !deletedPeriodIds.has(p.id));
      mergePeriods(mapped);
      storyPeriodsCache.set(storyId, mapped);
    });
    return storyPeriodsCache.get(storyId) ?? [];
  }

  async function ensureStoryEventsLoaded(storyId: string): Promise<ListEvent[]> {
    await reads.load(`story-events:${storyId}`, () => EventApiService.getInstance().getStoryListEvents(storyId), rows => {
      storyEventsCache.set(storyId, rows);
      for (const event of rows) events.value = upsertById(events.value, event);
    });
    return (storyEventsCache.get(storyId) ?? []).map(event => eventById(event.id) ?? event);
  }

  async function ensureStoryLoaded(storyId: string): Promise<Story> {
    await reads.load(`story-detail:${storyId}`, () => StoryApiService.getInstance().getStory(storyId), story => {
      mergePeriods(story.periods);
      const byId = new Map(events.value.map(event => [event.id, event]));
      // L'importance appartient à cette frise : le catalogue partagé n'en garde pas trace.
      for (const { importance: _importance, ...event } of story.events) byId.set(event.id, event);
      events.value = [...byId.values()];
      storyDetailsCache.set(storyId, story);
    });
    return storyDetailsCache.get(storyId)!;
  }

  async function ensureEventsLoaded(force = false): Promise<void> {
    await reads.load('events', () => EventApiService.getInstance().getListEvents(), rows => { events.value = rows; }, force);
  }

  async function ensureStoriesLoaded(force = false): Promise<void> {
    await reads.load('stories', () => StoryApiService.getInstance().getListStories(), rows => { stories.value = rows; }, force);
  }

  function invalidateStory(storyId: string) {
    reads.invalidate(`story-periods:${storyId}`);
    // Shared-content links in any snapshot may change when one membership or title changes.
    reads.invalidateMatching(key => key.startsWith('story-detail:'));
    reads.invalidate(`story-events:${storyId}`);
    storyEventsCache.delete(storyId);
    reads.invalidate('stories');
    storyPeriodsCache.delete(storyId);
    storyDetailsCache.clear();
  }

  function invalidateStories() {
    reads.invalidateMatching(key => key.startsWith('story-'));
    reads.invalidate('stories');
    storyPeriodsCache.clear();
    storyDetailsCache.clear();
    storyEventsCache.clear();
  }
  function invalidateCatalogue(kind: 'period' | 'event') {
    reads.invalidate(kind === 'period' ? 'roots' : 'events');
    invalidateStories();
  }

  function invalidatePeriodLists(parentIds?: (string | null | undefined)[]) {
    // A period read can include a saved entity through roots, children or a story.
    reads.invalidate('roots');
    if (parentIds) {
      for (const id of new Set(parentIds)) if (id) reads.invalidate(`children:${id}`);
    } else {
      reads.invalidateMatching(key => key.startsWith('children:'));
    }
    invalidateStories();
  }

  function addPeriodSuggestions(suggestions: ListPeriod[]) {
    mergePeriods(suggestions.filter(period => period.id.startsWith('wikidata:')));
  }

  function updatePeriods(newPeriods: ListPeriod[]) {
    periods.value = newPeriods;
    invalidatePeriodLists();
  }

  function updateEvents(newEvents: ListEvent[]) {
    events.value = newEvents;
    reads.invalidate('events');
    invalidateStories();
  }

  function updateStories(newStories: StorySummary[]) {
    const remainingIds = new Set(newStories.map(story => story.id));
    for (const previous of stories.value) if (!remainingIds.has(previous.id)) invalidateStory(previous.id);
    stories.value = newStories;
    reads.invalidate('stories');
  }

  function upsertSavedPeriod(period: ListPeriod) {
    const previousParent = periodById(period.id)?.parentId;
    deletedPeriodIds.delete(period.id);
    mergePeriods([period]);
    if (period.parentId) {
      periods.value = periods.value.map(p => p.id === period.parentId ? { ...p, hasChildren: true } : p);
    }
    invalidatePeriodLists([previousParent, period.parentId]);
  }

  function removeDeletedPeriod(deleted: DeletePeriodResult) {
    deletedPeriodIds.add(deleted.id);
    const previous = periods.value;
    periods.value = previous
      .filter(period => period.id !== deleted.id && !(period.id.startsWith('wikidata:') && isPeriodDescendant(previous, period.id, deleted.id)))
      .map(period => period.id === deleted.parent?.id ? { ...period, hasChildren: deleted.parent.hasChildren } : period);
    invalidatePeriodLists([deleted.id, deleted.parent?.id]);
  }

  function upsertSavedEvent(event: ListEvent) {
    updateEvents(upsertById(events.value, event));
  }

  function upsertSavedStory(story: StorySummary) {
    const previous = storyById(story.id);
    stories.value = upsertById(stories.value, { ...previous, ...story });
    invalidateStory(story.id);
  }

  /** Après une écriture confirmée : corrige le détail en cache sans relire la frise ni la liste. */
  function patchStoryEventImportance(storyId: string, eventId: string, importance: EventImportance) {
    const story = storyDetailsCache.get(storyId);
    if (story) storyDetailsCache.set(storyId, withEventImportance(story, eventId, importance));
  }

  function resetData() {
    reads.clear();
    for (const key of Object.keys(requests)) delete requests[key];
    periods.value = [];
    events.value = [];
    stories.value = [];
    storyPeriodsCache.clear();
    storyDetailsCache.clear();
    storyEventsCache.clear();
    deletedPeriodIds.clear();
  }

  return {
    periods, events, stories, loading, error, requests,
    rootPeriods, periodById, eventById, storyById, childrenOf,
    ensureRootsLoaded, ensureChildrenLoaded, ensureStoryPeriodsLoaded, ensureStoryEventsLoaded, ensureStoryLoaded,
    ensureEventsLoaded, ensureStoriesLoaded, invalidateCatalogue,
    cachePeriod: (period: ListPeriod) => mergePeriods([period]),
    updatePeriods, updateEvents, updateStories, resetData, addPeriodSuggestions,
    upsertSavedPeriod, removeDeletedPeriod, upsertSavedEvent, upsertSavedStory, invalidateStory, invalidateStories,
    patchStoryEventImportance,
  };
});
