import { localizedText } from '@/i18n';
import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import type { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';
import type { TimelineTarget } from '@/lib/timelineNavigation';
import { eventsInFrame, followLevel, storyOutsideFrame, type ScaleFrame } from '@/lib/timelineComparison';
import type { ListPeriod, Story, StoryAnchor } from '@/types/database';
import { useTimelineEventFilter } from './useTimelineEventFilter';

/** Identité stable du panneau, indépendante de sa place et de la frise qu’il visite. */
export type TimelineLaneKey = string;
type HomeNavigation = ReturnType<typeof useHomeNavigation>;

/** Actions de la frise quand elle mène ; la vue peut y brancher sa mesure d’audience et son animation. */
export interface TimelineLaneHandlers {
  periodClick(period: ListPeriod): unknown;
  goBack(): unknown;
  navigatePeriod(direction: 'previous' | 'next'): unknown;
  storySelect(id: string, anchor?: StoryAnchor, sourceStoryId?: string): unknown;
  storyCrumb(index: number): unknown;
  periodCrumb(index: number): unknown;
}

/**
 * Une frise de la comparaison. En tête, elle garde toute la navigation de la timeline. Quand
 * l’autre frise mène, elle suit l’échelle imposée et descend seule au niveau qui couvre le cadre.
 * Agir sur une frise qui suit la fait mener à l’endroit choisi, sans changer de place.
 */
export function useTimelineComparisonLane(options: {
  key: TimelineLaneKey;
  nav: HomeNavigation;
  leader: Ref<TimelineLaneKey>;
  frame: Ref<ScaleFrame | null>;
  handlers?: Partial<TimelineLaneHandlers>;
}) {
  const { key, nav, leader, frame } = options;
  const dataStore = useDataStore();
  const storyId = ref<string | null>(null);
  const story = shallowRef<Story | null>(null);
  const leads = computed(() => leader.value === key);
  const followingLoading = ref(false);
  const followingError = ref<string | null>(null);
  let request = 0;
  onScopeDispose(() => { request++; }, true);

  // En tête, la frise peut changer d’elle-même (frise associée, parcours) : son identifiant suit.
  watch(nav.currentStoryId, id => { if (leads.value && storyId.value !== null) storyId.value = id; });
  // Le détail n’est lu que pour suivre : en tête, la navigation de la timeline a déjà le sien.
  async function loadFollowing() {
    const token = ++request;
    const id = storyId.value;
    followingError.value = null;
    followingLoading.value = false;
    if (story.value?.id !== id) story.value = null;
    if (!id || leads.value || story.value?.id === id) return;
    followingLoading.value = true;
    try {
      const loaded = await dataStore.ensureStoryLoaded(id);
      if (request === token) story.value = loaded;
    } catch (cause) {
      if (request === token) followingError.value = cause instanceof Error ? cause.message : 'Impossible de charger cette frise.';
    } finally {
      if (request === token) followingLoading.value = false;
    }
  }
  watch([storyId, leads], loadFollowing, { immediate: true });
  const loading = computed(() => leads.value ? nav.loading.value : followingLoading.value);
  const error = computed(() => leads.value ? nav.error.value : followingError.value);
  function retry() { if (leads.value) void nav.retryLoad(); else void loadFollowing(); }

  const followed = computed(() => !leads.value && story.value && frame.value
    ? followLevel(story.value, frame.value, dataStore.stories, Date.now()) : null);
  const ancestors = computed(() => followed.value?.ancestors ?? []);

  // La règle de départ se calcule sur toute la frise, pas sur le niveau affiché.
  const eventFilter = useTimelineEventFilter(() => {
    const current = nav.currentStory.value;
    // Le passage meneuse/suiveuse ne doit pas exposer temporairement une source nulle,
    // qui effacerait le sujet choisi pendant la lecture du détail de suivi.
    if (current?.id === storyId.value && (leads.value || !story.value)) return { id: current.id, tags: current.tags, events: nav.currentStoryAllEvents.value };
    return story.value;
  });

  /** Mener depuis cette frise, à la position demandée. */
  function lead(target: TimelineTarget) {
    leader.value = key;
    storyId.value = target.storyId;
    void nav.chooseNavigationTarget(target);
  }
  function leadAt(period?: ListPeriod) {
    const id = storyId.value;
    if (id) lead(period ? { storyId: id, periodId: period.id } : { storyId: id, view: 'overview' });
  }

  /** Propriétés de PeriodGrid : celles de la timeline en tête, le niveau suivi sinon. */
  const grid = computed(() => {
    if (leads.value) return {
      periods: nav.displayedPeriods.value, childPeriods: nav.periodChildren.value, childLinkedPeriods: nav.childLinkedPeriods.value,
      linkedPeriods: nav.linkedPeriods.value, events: eventFilter.apply(nav.storyEvents.value, nav.focusedEventId.value), focusEventId: nav.focusedEventId.value, loading: nav.loading.value,
      parentPeriod: nav.parentStack.value[nav.parentStack.value.length - 1] ?? null, currentPeriod: nav.currentPeriod.value,
      overviewNavigation: !!nav.returnTitle.value, overviewPeriod: nav.contextBar.value,
      previousPeriod: nav.previousPeriod.value, nextPeriod: nav.nextPeriod.value,
      storyBounds: nav.currentStoryBounds.value, scaleFrame: null, outsideFrame: false, hideEndBound: false, currentStoryId: nav.currentStoryId.value,
    };
    const level = followed.value;
    return {
      periods: level?.periods ?? [], childPeriods: [], childLinkedPeriods: [], linkedPeriods: level?.linked ?? [],
      events: story.value && frame.value ? eventFilter.apply(eventsInFrame(story.value.events, frame.value, Date.now())) : [], focusEventId: null, loading: followingLoading.value,
      parentPeriod: ancestors.value[ancestors.value.length - 2] ?? null, currentPeriod: ancestors.value[ancestors.value.length - 1] ?? null,
      overviewNavigation: false, overviewPeriod: null, previousPeriod: null, nextPeriod: null,
      // Sa vue est bornée par l’autre frise : la fin de sa période de contexte n’est pas celle de la vue.
      storyBounds: frame.value, scaleFrame: frame.value,
      outsideFrame: !!(story.value && frame.value && storyOutsideFrame(story.value, frame.value, dataStore.stories, Date.now())),
      hideEndBound: true, currentStoryId: story.value?.id ?? storyId.value ?? '',
    };
  });

  const title = computed(() => {
    const summary = dataStore.stories.find(row => row.id === storyId.value);
    return localizedText(summary?.title) || localizedText(story.value?.title) || 'Frise';
  });
  const storyCrumbs = computed(() => leads.value ? nav.storyBreadcrumb.value
    : storyId.value ? [{ id: `story:${storyId.value}`, title: title.value, kind: 'story' as const }] : []);
  const periodCrumbs = computed(() => leads.value ? nav.breadcrumb.value : ancestors.value.map(period => ({
    id: `story:${storyId.value}/period:${period.id}`, title: localizedText(period.label) || 'Période sans nom', kind: 'period' as const,
  })));

  // ─── En tête, les actions de la timeline ; en suiveuse, elles font mener cette frise ───
  const handlers: TimelineLaneHandlers = {
    periodClick: period => nav.handlePeriodClick(period),
    goBack: () => nav.goBack(),
    navigatePeriod: direction => nav.navigateAdjacentPeriod(direction),
    storySelect: (id, anchor, sourceStoryId) => nav.selectStory(id, anchor, sourceStoryId),
    storyCrumb: index => nav.navigateToStoryBreadcrumb(index),
    periodCrumb: index => nav.navigateToBreadcrumb(index),
    ...options.handlers,
  };
  const actions = {
    periodClick(period: ListPeriod) { if (leads.value) void handlers.periodClick(period); else leadAt(period); },
    goBack() { if (leads.value) void handlers.goBack(); else leadAt(ancestors.value[ancestors.value.length - 2]); },
    navigatePeriod(direction: 'previous' | 'next') { if (leads.value) void handlers.navigatePeriod(direction); },
    storySelect(id: string, anchor?: StoryAnchor, sourceStoryId?: string) {
      if (leads.value) void handlers.storySelect(id, anchor, sourceStoryId); else lead({ storyId: id, view: 'overview' });
    },
    storyCrumb(index: number) { if (leads.value) void handlers.storyCrumb(index); else leadAt(); },
    periodCrumb(index: number) { if (leads.value) void handlers.periodCrumb(index); else leadAt(ancestors.value[index]); },
  };

  return { key, nav, storyId, story, leads, ancestors, grid, title, storyCrumbs, periodCrumbs, actions, lead, leadAt, eventFilter, loading, error, retry };
}
