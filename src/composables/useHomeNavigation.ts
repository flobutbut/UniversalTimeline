import { periodCoordinates } from '@/services/TimelineScalingService';
import { listEventYearsBP } from '@/lib/listEventTableHelpers';
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLatestRequest } from './useLatestRequest';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod, ListEvent, StorySuggestion } from '@/types/database';
import { storyChildrenOf, resolvePeriodNavFromSnapshot, type StoryPeriodNavSnapshot } from '@/lib/homeStoryPeriodNav';

const ENTRY_STORY_ID = '1';

export function useHomeNavigation() {
  const dataStore = useDataStore();
  const { periods, events, stories } = storeToRefs(dataStore);
  const storyService = StoryApiService.getInstance();
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
  const storyStack = ref<string[]>([]);
  const storyNavSnapshots = ref<Record<string, StoryPeriodNavSnapshot>>({});
  const allowCatalogueFallback = ref(true);
  const breadcrumb = computed(() => [
    ...[...storyStack.value, currentStoryId.value].map(id => {
      const title = stories.value.find(story => story.id === id)?.title;
      return { id: `story:${id}`, title: title?.fr || title?.en || 'Timeline' };
    }),
    ...[...parentStack.value, ...(currentPeriod.value ? [currentPeriod.value] : [])].map(period => ({
      id: `period:${period.id}`, title: period.label.fr || period.label.en || 'Période sans nom',
    })),
  ]);
  let retry: () => Promise<void>;
  const retryLoad = () => retry();

  function eventsForPeriod(period: ListPeriod | null): ListEvent[] {
    if (!period) return currentStoryAllEvents.value;
    const { start, end } = periodCoordinates(period);
    if (start === null || end === null) return [];
    return currentStoryAllEvents.value.filter(event => {
      const bp = listEventYearsBP(event);
      return bp !== null && bp <= start && bp >= end;
    });
  }

  function childrenOf(parentId: string | null) {
    return currentStoryPeriods.value.length || !allowCatalogueFallback.value
      ? storyChildrenOf(parentId, currentStoryPeriods.value)
      : parentId ? dataStore.childrenOf(parentId) : dataStore.rootPeriods;
  }

  // Cached HomeView remains subscribed to canonical saves and deletions.
  watch(periods, () => {
    const byId = new Map(periods.value.map(period => [period.id, period]));
    currentStoryPeriods.value = currentStoryPeriods.value.filter(period => byId.has(period.id)).map(period => ({ ...byId.get(period.id)!, ...(period.storyParentId !== undefined ? { storyParentId: period.storyParentId } : {}) }));
    parentStack.value = parentStack.value.filter(period => byId.has(period.id)).map(period => byId.get(period.id)!);
    if (currentPeriod.value && !byId.has(currentPeriod.value.id)) currentPeriod.value = parentStack.value.pop() ?? null;
    else if (currentPeriod.value) currentPeriod.value = byId.get(currentPeriod.value.id)!;
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
      if (verifyStory) {
        await dataStore.ensureStoriesLoaded();
        if (!isCurrent()) return;
        if (!dataStore.storyById(storyId)) throw new Error('Cette frise est introuvable ou n’est pas accessible.');
      }
      const [storyPeriods, storyEventRows] = await Promise.all([
        dataStore.ensureStoryPeriodsLoaded(storyId),
        dataStore.ensureStoryEventsLoaded(storyId),
        dataStore.ensureStoriesLoaded(),
      ]);
      if (!isCurrent()) return;
      if (!storyPeriods.length && allowCatalogueFallback.value) {
        await dataStore.ensureRootsLoaded();
        if (!isCurrent()) return;
      }
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
        const ids = [...parentStack.value.map(parent => parent.id), currentPeriod.value?.id, period.id].filter((id): id is string => !!id);
        const suggestions = await storyService.getSuggestions(currentStoryId.value, ids);
        if (!isCurrent()) return;
        if (suggestions.length === 1) { await selectStory(suggestions[0].id); return; }
        storySuggestions.value = suggestions;
        return;
      }
      const children = currentStoryPeriods.value.length ? childrenOf(period.id) : await dataStore.ensureChildrenLoaded(period.id);
      if (!isCurrent() || !dataStore.periodById(period.id)) return;
      if (currentPeriod.value) parentStack.value.push(currentPeriod.value);
      currentPeriod.value = dataStore.periodById(period.id);
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
        await navigateToBreadcrumb(storyStack.value.length - 1);
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
    allowCatalogueFallback.value = false;
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
    storyStack.value = id === ENTRY_STORY_ID ? [] : [ENTRY_STORY_ID];
    storyNavSnapshots.value = {};
    await loadStory(id, undefined, true);
  };

  const selectStory = async (storyId: string | number) => {
    const id = String(storyId);
    if (id === currentStoryId.value) return;
    storyNavSnapshots.value[currentStoryId.value] = {
      parentStackIds: parentStack.value.map(period => period.id), currentPeriodId: currentPeriod.value?.id ?? null,
    };
    storyStack.value = [...storyStack.value, currentStoryId.value];
    await loadStory(id);
  };

  const navigateToBreadcrumb = async (index: number) => {
    const ids = [...storyStack.value, currentStoryId.value];
    if (!Number.isInteger(index) || index < 0 || index >= breadcrumb.value.length - 1) return;
    if (index < storyStack.value.length) {
      const targetId = ids[index];
      storyStack.value = ids.slice(0, index);
      await loadStory(targetId, storyNavSnapshots.value[targetId]);
      return;
    }
    // Retour direct aux périodes déjà chargées, sans ajouter un ancêtre à la pile.
    navigation.cancel();
    loading.value = false;
    error.value = null;
    storySuggestions.value = [];
    const periodIndex = index - ids.length;
    const target = periodIndex >= 0 ? parentStack.value[periodIndex] : null;
    parentStack.value = periodIndex >= 0 ? parentStack.value.slice(0, periodIndex) : [];
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
