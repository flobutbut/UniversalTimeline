import { ref, computed, watch } from 'vue';
import { comparableYearsBeforePresent } from '@temporal';
import { storeToRefs } from 'pinia';
import { useLatestRequest } from './useLatestRequest';
import { useDataStore } from '@/stores/useDataStore';
import type { ListPeriod, ListEvent, StorySuggestion } from '@/types/database';
import { storyChildrenOf, resolvePeriodNavFromSnapshot, buildTimelineBreadcrumb, storyAncestorIds, type StoryFrame, type StoryPeriodNavSnapshot } from '@/lib/homeStoryPeriodNav';

const ENTRY_STORY_ID = '1';

export function useHomeNavigation() {
  const dataStore = useDataStore();
  const { periods, events, stories } = storeToRefs(dataStore);
  const navigation = useLatestRequest();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const parentStack = ref<ListPeriod[]>([]);
  const currentPeriod = ref<ListPeriod | null>(null);
  const displayedPeriods = ref<ListPeriod[]>([]);
  const storyEvents = ref<ListEvent[]>([]);
  const currentStoryId = ref(ENTRY_STORY_ID);
  const currentStoryPeriods = ref<ListPeriod[]>([]);
  const currentStoryAllEvents = ref<ListEvent[]>([]);
  const currentStoryBounds = ref<{ startYearsBP?: number; endYearsBP?: number } | null>(null);
  const storySuggestions = ref<StorySuggestion[]>([]);
  // Frises quittées, chacune avec le chemin de périodes ouvert au moment du départ.
  const storyStack = ref<StoryFrame[]>([]);
  const crumbs = computed(() => buildTimelineBreadcrumb(
    [...storyStack.value, { id: currentStoryId.value, path: [...parentStack.value, ...(currentPeriod.value ? [currentPeriod.value] : [])] }],
    id => { const title = stories.value.find(story => story.id === id)?.title; return title?.fr || title?.en || 'Timeline'; },
  ));
  const breadcrumb = computed(() => crumbs.value.map(({ id, title, kind }) => ({ id, title, kind })));
  let retry: () => Promise<void>;
  const retryLoad = () => retry();

  function eventsForPeriod(period: ListPeriod | null): ListEvent[] {
    if (!period) return currentStoryAllEvents.value;
    const now = Date.now();
    const start = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
    const end = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
    if (start === null || end === null) return [];
    return currentStoryAllEvents.value.filter(event => {
      const bp = comparableYearsBeforePresent(event.date, event.dateYearsBP, now);
      return bp !== null && bp <= start && bp >= end;
    });
  }

  function childrenOf(parentId: string | null) {
    return storyChildrenOf(parentId, currentStoryPeriods.value);
  }

  // Cached HomeView remains subscribed to canonical saves and deletions.
  watch(periods, () => {
    const byId = new Map(periods.value.map(period => [period.id, period]));
    currentStoryPeriods.value = currentStoryPeriods.value.filter(period => byId.has(period.id)).map(period => ({ ...byId.get(period.id)!, hasChildren: period.hasChildren, ...(period.storyParentId !== undefined ? { storyParentId: period.storyParentId } : {}) }));
    const placed = new Map(currentStoryPeriods.value.map(period => [period.id, period]));
    parentStack.value = parentStack.value.filter(period => byId.has(period.id)).map(period => placed.get(period.id) ?? byId.get(period.id)!);
    // Les chemins des frises quittées sont revalidés au retour ; seuls les libellés suivent ici.
    storyStack.value = storyStack.value.map(frame => ({ ...frame, path: frame.path.map(period => byId.get(period.id) ?? period) }));
    if (currentPeriod.value && !byId.has(currentPeriod.value.id)) currentPeriod.value = parentStack.value.pop() ?? null;
    else if (currentPeriod.value) currentPeriod.value = placed.get(currentPeriod.value.id) ?? byId.get(currentPeriod.value.id)!;
    displayedPeriods.value = childrenOf(currentPeriod.value?.id ?? null);
    storyEvents.value = eventsForPeriod(currentPeriod.value);
  });
  watch(events, () => {
    const byId = new Map(events.value.map(event => [event.id, event]));
    currentStoryAllEvents.value = currentStoryAllEvents.value.map(event => byId.get(event.id) ?? event);
    storyEvents.value = eventsForPeriod(currentPeriod.value);
  });

  const loadInitialData = async (restorePeriodNav?: StoryPeriodNavSnapshot | null, expandSingleRoot = false, verifyStory = false) => {
    const isCurrent = navigation.begin();
    const storyId = currentStoryId.value;
    retry = () => loadInitialData(restorePeriodNav, expandSingleRoot, verifyStory);
    loading.value = true;
    error.value = null;
    try {
      const [story] = await Promise.all([
        dataStore.ensureStoryLoaded(storyId),
        dataStore.ensureStoriesLoaded(),
      ]);
      if (!isCurrent()) return;
      if (verifyStory) {
        if (!dataStore.storyById(storyId)) throw new Error('Cette frise est introuvable ou n’est pas accessible.');
        storyStack.value = storyAncestorIds(storyId, dataStore.storyById).map(id => ({ id, path: [] }));
      }
      const storyPeriods = story.periods;
      const storyEventRows = story.events;
      currentStoryPeriods.value = storyPeriods;
      currentStoryAllEvents.value = storyEventRows;
      const bounds = [...storyPeriods.flatMap(period => [period.startYearsBP, period.endYearsBP]), ...storyEventRows.map(event => event.dateYearsBP)]
        .filter((value): value is number => value != null && Number.isFinite(value));
      currentStoryBounds.value = bounds.length ? { startYearsBP: Math.max(...bounds), endYearsBP: Math.min(...bounds) } : null;
      const restored = restorePeriodNav ? resolvePeriodNavFromSnapshot(storyPeriods, restorePeriodNav) : null;
      parentStack.value = restored?.stack ?? [];
      currentPeriod.value = restored?.current ?? null;
      if (!restored && expandSingleRoot) {
        const roots = childrenOf(null);
        if (roots.length === 1 && roots[0].hasChildren) currentPeriod.value = roots[0];
      }
      displayedPeriods.value = childrenOf(currentPeriod.value?.id ?? null);
      storyEvents.value = eventsForPeriod(currentPeriod.value);
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Erreur lors du chargement initial';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  };
  retry = () => loadInitialData(undefined, true);

  const handlePeriodClick = async (period: ListPeriod) => {
    const isCurrent = navigation.begin();
    retry = () => handlePeriodClick(period);
    loading.value = true;
    error.value = null;
    storySuggestions.value = [];
    try {
      if (!period.hasChildren) {
        // Seules les frises ancrées sur la période cliquée ; celles d'un ancêtre restent sur sa carte.
        const story = await dataStore.ensureStoryLoaded(currentStoryId.value);
        const suggestions = (story.childStories ?? [])
          .filter(child => child.anchors.some(anchor => anchor.type === 'period' && anchor.id === period.id))
          .map(child => ({ id: child.id, title: child.title, parentStoryId: currentStoryId.value }));
        if (!isCurrent()) return;
        if (suggestions.length === 1) { await selectStory(suggestions[0].id); return; }
        storySuggestions.value = suggestions;
        return;
      }
      const children = childrenOf(period.id);
      if (!isCurrent() || !dataStore.periodById(period.id)) return;
      if (currentPeriod.value) parentStack.value.push(currentPeriod.value);
      currentPeriod.value = currentStoryPeriods.value.find(p => p.id === period.id) ?? null;
      displayedPeriods.value = children;
      storyEvents.value = eventsForPeriod(currentPeriod.value);
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Erreur lors du chargement';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  };

  const goBack = async () => {
    navigation.cancel();
    loading.value = false;
    error.value = null;
    if (storySuggestions.value.length) { storySuggestions.value = []; return; }
    const parent = parentStack.value.pop();
    if (!parent) {
      const roots = childrenOf(null);
      const atStoryRoot = currentPeriod.value && roots.length === 1 && roots[0].id === currentPeriod.value.id;
      if (storyStack.value.length && (!currentPeriod.value || atStoryRoot)) {
        await returnToStory(storyStack.value.length - 1, null);
        return;
      }
      currentPeriod.value = null;
      displayedPeriods.value = roots;
    } else {
      currentPeriod.value = parent;
      displayedPeriods.value = childrenOf(parent.id);
    }
    storyEvents.value = eventsForPeriod(currentPeriod.value);
  };

  const loadStory = async (id: string, restorePeriodNav?: StoryPeriodNavSnapshot, verifyStory = false) => {
    currentStoryId.value = id;
    storySuggestions.value = [];
    currentStoryBounds.value = null;
    currentStoryPeriods.value = [];
    currentStoryAllEvents.value = [];
    parentStack.value = [];
    currentPeriod.value = null;
    displayedPeriods.value = [];
    storyEvents.value = [];
    await loadInitialData(restorePeriodNav, !restorePeriodNav, verifyStory);
  };

  const openStory = async (id: string) => {
    storyStack.value = [];
    await loadStory(id, undefined, true);
  };

  const selectStory = async (storyId: string | number) => {
    const id = String(storyId);
    if (id === currentStoryId.value) return;
    storyStack.value = [...storyStack.value, { id: currentStoryId.value, path: [...parentStack.value, ...(currentPeriod.value ? [currentPeriod.value] : [])] }];
    await loadStory(id);
  };

  /** Rouvre une frise quittée à `depth` dans son chemin (-1 : vue d'ensemble, null : là où on l'a quittée). */
  const returnToStory = async (frameIndex: number, depth: number | null) => {
    const frame = storyStack.value[frameIndex];
    const path = (depth === null ? frame.path : frame.path.slice(0, depth + 1)).map(period => period.id);
    storyStack.value = storyStack.value.slice(0, frameIndex);
    await loadStory(frame.id, { parentStackIds: path.slice(0, -1), currentPeriodId: path[path.length - 1] ?? null });
  };

  const navigateToBreadcrumb = async (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= crumbs.value.length - 1) return;
    const { frame, depth } = crumbs.value[index];
    if (frame < storyStack.value.length) { await returnToStory(frame, depth); return; }
    // Retour direct aux périodes déjà chargées, sans ajouter un ancêtre à la pile.
    navigation.cancel();
    loading.value = false;
    error.value = null;
    storySuggestions.value = [];
    const target = depth >= 0 ? parentStack.value[depth] : null;
    parentStack.value = depth >= 0 ? parentStack.value.slice(0, depth) : [];
    currentPeriod.value = target;
    displayedPeriods.value = childrenOf(target?.id ?? null);
    storyEvents.value = eventsForPeriod(target);
  };
  // EventCard/PeriodGrid handles event suggestions and emits story-select.
  const handleEventClick = async (_event: ListEvent) => {};

  return {
    loading, error, retryLoad, parentStack, currentPeriod, displayedPeriods, storyEvents,
    currentStoryId, breadcrumb, storySuggestions, currentStoryBounds,
    loadInitialData, openStory, handlePeriodClick, handleEventClick, goBack, selectStory, navigateToBreadcrumb,
  };
}
