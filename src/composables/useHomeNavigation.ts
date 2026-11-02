import { ref, computed, watch } from 'vue';
import { comparableYearsBeforePresent } from '@temporal';
import { storeToRefs } from 'pinia';
import { useLatestRequest } from './useLatestRequest';
import { useDataStore } from '@/stores/useDataStore';
import type { ListPeriod, ListEvent, StoryAnchor, NavigationContext } from '@/types/database';
import { storyChildrenOf, resolvePeriodNavFromSnapshot, type StoryPeriodNavSnapshot } from '@/lib/homeStoryPeriodNav';

import { timelineLevel, levelNeighbors, timelinePeriodPath, contextPeriodNeighbors, periodPresentationTargets, type TimelineTarget } from '@/lib/timelineNavigation';
import { universeStoryTrail } from '@/lib/universeStoryTrail';

const ENTRY_STORY_ID = '1';

export function useHomeNavigation(navigateTo?: (target: TimelineTarget) => void) {
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
  const navigationContexts = ref<NavigationContext[]>([]);
  const contextId = ref<string | null>(null);
  const selectedContext = computed(() => navigationContexts.value.find(c => c.id === contextId.value) ?? null);
  const navigationChoices = ref<Array<TimelineTarget & { title: string }>>([]);
  let requestedTarget: TimelineTarget | undefined;
  // Chemin des frises (reconstruit à l'entrée du catalogue), puis hiérarchie locale des périodes.
  const visitedStories = ref<TimelineTarget[]>([]);
  const storyBreadcrumb = computed(() => visitedStories.value.map(target => {
    const title = stories.value.find(story => String(story.id) === target.storyId)?.title;
    return { id: `story:${target.storyId}`, title: title?.fr || title?.en || 'Frise', kind: 'story' as const };
  }));
  const periodPath = computed(() => [...parentStack.value, ...(currentPeriod.value ? [currentPeriod.value] : [])]);
  const breadcrumb = computed(() => periodPath.value.map(period => ({
    id: `story:${currentStoryId.value}/period:${period.id}`,
    title: period.label.fr || period.label.en || 'Période sans nom', kind: 'period' as const,
  })));

  function recordStoryVisit() {
    const target = positionTarget(currentPeriod.value?.id);
    const index = visitedStories.value.findIndex(entry => entry.storyId === target.storyId);
    visitedStories.value = [...(index < 0 ? visitedStories.value : visitedStories.value.slice(0, index)), target];
  }
  const usesContextNeighbors = computed(() => !!currentPeriod.value && !!selectedContext.value &&
    (selectedContext.value.id === currentStoryId.value || selectedContext.value.presentations.some(view => view.storyId === currentStoryId.value && view.periodId === currentPeriod.value!.id)));
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

  // Parcourir un même rang de la hiérarchie, y compris au-delà de son parent direct.
  const adjacentPeriods = computed(() => {
    if (!currentPeriod.value) return { previous: null, next: null };
    const context = selectedContext.value;
    if (usesContextNeighbors.value && context) return contextPeriodNeighbors(context, currentPeriod.value.id);
    return levelNeighbors(timelineLevel(currentStoryPeriods.value, parentStack.value.length), currentPeriod.value.id);
  });
  const previousPeriod = computed(() => adjacentPeriods.value.previous?.period ?? null);
  const nextPeriod = computed(() => adjacentPeriods.value.next?.period ?? null);

  const navigateAdjacentPeriod = (direction: 'previous' | 'next') => {
    if (loading.value) return;
    const target = adjacentPeriods.value[direction];
    if (!target) return;
    const context = selectedContext.value;
    if (usesContextNeighbors.value && context) {
      const choices = periodPresentationTargets(context, target.period.id);
      if (choices.length > 1) { navigationChoices.value = choices; return; }
      void chooseNavigationTarget(choices[0]);
      return;
    }
    void chooseNavigationTarget(positionTarget(target.period.id));
  };

  function positionTarget(periodId?: string): TimelineTarget {
    return { storyId: currentStoryId.value, ...(periodId ? { periodId } : { view: 'overview' as const }),
      ...(contextId.value ? { contextId: contextId.value } : {}) };
  }

  function showPeriod(path: ListPeriod[] | null) {
    parentStack.value = path?.slice(0, -1) ?? [];
    currentPeriod.value = path?.[path.length - 1] ?? null;
    displayedPeriods.value = childrenOf(currentPeriod.value?.id ?? null);
    storyEvents.value = eventsForPeriod(currentPeriod.value);
    recordStoryVisit();
  }

  // Cached HomeView remains subscribed to canonical saves and deletions.
  watch(periods, () => {
    const byId = new Map(periods.value.map(period => [period.id, period]));
    currentStoryPeriods.value = currentStoryPeriods.value.filter(period => byId.has(period.id)).map(period => ({ ...byId.get(period.id)!, hasChildren: period.hasChildren, ...(period.storyParentId !== undefined ? { storyParentId: period.storyParentId } : {}) }));
    const placed = new Map(currentStoryPeriods.value.map(period => [period.id, period]));
    parentStack.value = parentStack.value.filter(period => byId.has(period.id)).map(period => placed.get(period.id) ?? byId.get(period.id)!);
    if (currentPeriod.value && !byId.has(currentPeriod.value.id)) currentPeriod.value = parentStack.value.pop() ?? null;
    else if (currentPeriod.value) currentPeriod.value = placed.get(currentPeriod.value.id) ?? byId.get(currentPeriod.value.id)!;
    displayedPeriods.value = childrenOf(currentPeriod.value?.id ?? null);
    storyEvents.value = eventsForPeriod(currentPeriod.value);
  });
  watch(events, () => {
    const byId = new Map(events.value.map(event => [event.id, event]));
    // L'importance appartient au lien frise–événement, absent des fiches du catalogue.
    currentStoryAllEvents.value = currentStoryAllEvents.value.map(event => {
      const updated = byId.get(event.id);
      return updated ? { ...updated, ...(event.importance ? { importance: event.importance } : {}) } : event;
    });
    storyEvents.value = eventsForPeriod(currentPeriod.value);
  });

  const loadInitialData = async (restorePeriodNav?: StoryPeriodNavSnapshot | null, expandSingleRoot = false, verifyStory = false) => {
    const isCurrent = navigation.begin();
    const storyId = currentStoryId.value;
    const target = requestedTarget;
    retry = () => loadInitialData(restorePeriodNav, expandSingleRoot, verifyStory);
    loading.value = true;
    error.value = null;
    if (target?.entry === 'universe') visitedStories.value = [];
    try {
      const [story] = await Promise.all([
        dataStore.ensureStoryLoaded(storyId),
        dataStore.ensureStoriesLoaded(),
      ]);
      if (!isCurrent()) return;
      if (verifyStory) {
        if (!dataStore.storyById(storyId)) throw new Error('Cette frise est introuvable ou n’est pas accessible.');
      }
      navigationChoices.value = [];
      navigationContexts.value = story.navigationContexts ?? [];
      const requestedContext = requestedTarget?.contextId;
      const explicitContext = requestedContext ? navigationContexts.value.find(c => c.id === requestedContext) : null;
      if (requestedContext && !explicitContext) throw new Error('Ce parcours est introuvable ou n’est plus accessible depuis cette frise.');
      const context = explicitContext ?? (navigationContexts.value.length === 1 ? navigationContexts.value[0] : null);
      contextId.value = context?.id ?? null;
      const referenceIds = context?.presentations.filter(view => view.storyId === storyId).map(view => view.periodId) ?? [];
      const overview = requestedTarget?.view === 'overview';
      const focusId = !overview ? requestedTarget?.periodId ?? (!restorePeriodNav && referenceIds.length === 1 && storyChildrenOf(referenceIds[0], story.periods).length > 0 ? referenceIds[0] : undefined) : undefined;
      const focusPath = focusId ? timelinePeriodPath(story.periods, focusId) : null;
      if (focusId && !focusPath) throw new Error('Cette période n’appartient plus à la frise.');
      const entryTrail = target?.entry === 'universe'
        ? await universeStoryTrail(story, new Set(stories.value.map(story => story.id)), dataStore.ensureStoryLoaded, isCurrent)
        : null;
      if (!isCurrent()) return;
      const storyPeriods = story.periods;
      const storyEventRows = story.events;
      currentStoryPeriods.value = storyPeriods;
      currentStoryAllEvents.value = storyEventRows;
      const bounds = [...storyPeriods.flatMap(period => [period.startYearsBP, period.endYearsBP]), ...storyEventRows.map(event => event.dateYearsBP)]
        .filter((value): value is number => value != null && Number.isFinite(value));
      currentStoryBounds.value = bounds.length ? { startYearsBP: Math.max(...bounds), endYearsBP: Math.min(...bounds) } : null;
      const restored = focusPath ? { stack: focusPath.slice(0,-1), current: focusPath[focusPath.length-1] } : restorePeriodNav ? resolvePeriodNavFromSnapshot(storyPeriods, restorePeriodNav) : null;
      parentStack.value = restored?.stack ?? [];
      currentPeriod.value = restored?.current ?? null;
      if (!restored && !overview && expandSingleRoot) {
        const roots = childrenOf(null);
        if (roots.length === 1 && roots[0].hasChildren) currentPeriod.value = roots[0];
      }
      displayedPeriods.value = childrenOf(currentPeriod.value?.id ?? null);
      storyEvents.value = eventsForPeriod(currentPeriod.value);
      if (entryTrail) visitedStories.value = entryTrail;
      recordStoryVisit();
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Erreur lors du chargement initial';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  };
  retry = () => loadInitialData(undefined, true);

  const handlePeriodClick = async (period: ListPeriod) => {
    if (loading.value || childrenOf(period.id).length === 0 || !timelinePeriodPath(currentStoryPeriods.value, period.id)) return;
    await chooseNavigationTarget(positionTarget(period.id));
  };

  const goBack = async () => {
    if (loading.value) return;
    const context = selectedContext.value;
    const parent = parentStack.value[parentStack.value.length - 1];
    if (context && context.id !== currentStoryId.value && (usesContextNeighbors.value || !parent)) {
      await chooseNavigationTarget({ storyId: context.id, contextId: context.id, view: 'overview' });
    } else {
      await chooseNavigationTarget(positionTarget(parent?.id));
    }
  };

  const loadStory = async (id: string, restorePeriodNav?: StoryPeriodNavSnapshot, verifyStory = false) => {
    currentStoryId.value = id;
    navigationChoices.value = [];
    currentStoryBounds.value = null;
    currentStoryPeriods.value = [];
    currentStoryAllEvents.value = [];
    parentStack.value = [];
    currentPeriod.value = null;
    displayedPeriods.value = [];
    storyEvents.value = [];
    await loadInitialData(restorePeriodNav, !restorePeriodNav, verifyStory);
  };

  const openStory = async (id: string, target?: TimelineTarget) => {
    requestedTarget = target;
    if (id === currentStoryId.value && currentStoryPeriods.value.length) await loadInitialData(undefined, true, true);
    else await loadStory(id, undefined, true);
  };

  const selectStory = async (storyId: string | number, anchor?: StoryAnchor) => {
    const id = String(storyId);
    if (id === currentStoryId.value) return;
    const visited = visitedStories.value.find(entry => entry.storyId === id);
    if (visited) { await chooseNavigationTarget(visited); return; }
    const isCurrent = navigation.begin();
    retry = () => selectStory(id, anchor);
    loading.value = true;
    error.value = null;
    try {
      const story = await dataStore.ensureStoryLoaded(id);
      if (!isCurrent()) return;
      const context = selectedContext.value;
      const sharedContext = context && story.navigationContexts?.some(c => c.id === context.id) ? context : null;
      const anchorId = anchor?.type === 'period' ? anchor.id : !anchor ? currentPeriod.value?.id : undefined;
      const views = sharedContext?.presentations.filter(view => view.storyId === id) ?? [];
      const candidateId = anchorId && timelinePeriodPath(story.periods, anchorId) ? anchorId : views.length === 1 ? views[0].periodId : undefined;
      const periodId = candidateId && storyChildrenOf(candidateId, story.periods).length > 0 ? candidateId : undefined;
      await chooseNavigationTarget({ storyId: id,
        ...(periodId ? { periodId } : candidateId ? { view: 'overview' as const } : {}),
        ...(sharedContext ? { contextId: sharedContext.id } : {}),
      });
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible d’ouvrir cette frise.';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  };

  const chooseNavigationTarget = async (target: TimelineTarget) => {
    navigation.cancel();
    loading.value = false;
    error.value = null;
    navigationChoices.value = [];
    if (navigateTo) { navigateTo(target); return; }
    // Les usages sans routeur conservent la même sémantique et le même chemin.
    if (!target.entry && target.storyId === currentStoryId.value && (target.periodId || target.view === 'overview') &&
      (!target.contextId || target.contextId === contextId.value)) {
      const path = target.periodId ? timelinePeriodPath(currentStoryPeriods.value, target.periodId) : null;
      if (target.periodId && !path) { error.value = 'Cette période n’appartient plus à la frise.'; return; }
      requestedTarget = target;
      showPeriod(path);
      return;
    }
    await openStory(target.storyId, target);
  };

  const selectNavigationContext = async (id: string) => {
    if (!navigationContexts.value.some(c => c.id === id) || loading.value) return;
    await chooseNavigationTarget({ ...positionTarget(currentPeriod.value?.id), contextId: id });
  };

  const navigateToBreadcrumb = async (index: number) => {
    if (loading.value || !Number.isInteger(index) || index < 0 || index >= periodPath.value.length - 1) return;
    await chooseNavigationTarget(positionTarget(periodPath.value[index].id));
  };
  const navigateToStoryBreadcrumb = async (index: number) => {
    if (loading.value || !Number.isInteger(index) || index < 0 || index >= visitedStories.value.length - 1) return;
    await chooseNavigationTarget(visitedStories.value[index]);
  };
  // EventCard/PeriodGrid handles event suggestions and emits story-select.
  const handleEventClick = async (_event: ListEvent) => {};

  return {
    loading, error, retryLoad, parentStack, currentPeriod, displayedPeriods, storyEvents,
    currentStoryId, breadcrumb, storyBreadcrumb, currentStoryBounds, previousPeriod, nextPeriod, navigationContexts, contextId, navigationChoices, chooseNavigationTarget, selectNavigationContext,
    loadInitialData, openStory, handlePeriodClick, handleEventClick, goBack, selectStory, navigateToBreadcrumb, navigateToStoryBreadcrumb, navigateAdjacentPeriod,
  };
}
