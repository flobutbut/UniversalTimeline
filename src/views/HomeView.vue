<template>
  <div class="home-view">
    <div ref="timelineViewport" class="home-view__viewport"
      :class="{ 'home-view__viewport--waiting': slidePhase === 'waiting', 'home-view__viewport--sliding': slidePhase !== 'idle', 'home-view__viewport--comparing': comparing }"
      :inert="slidePhase !== 'idle' || undefined" :aria-busy="slidePhase !== 'idle' || undefined"
      @scroll.capture="scheduleComparisonLinks" @transitionend="scheduleComparisonLinks" @animationend="scheduleComparisonLinks"
      @mouseover="trackComparisonLink" @focusin="trackComparisonLink" @mouseleave="clearComparisonLink">
      <section class="home-view__frise" :aria-label="comparing ? `Première frise : ${primaryLane.title.value}` : undefined">
        <div class="home-view__header">
          <div class="home-view__breadcrumbs">
            <StoryBreadcrumb class="home-view__story-breadcrumb" :items="primaryLane.storyCrumbs.value" :max-visible="3" label="Fil d’Ariane des frises" current-navigable :loading="loading" @navigate="primaryLane.actions.storyCrumb">
              <template v-if="primaryLeads && headerStories.length" #current="{ item }">
                <Select class="home-view__story-selector" :model-value="null" :placeholder="item.title" compact :searchable="false" :disabled="loading"
                  :options="[{ value: currentStoryId, label: 'Vue d’ensemble de la frise' }, ...headerStories.map(story => ({ value: story.id, label: story.title.fr || story.title.en }))]"
                  @update:model-value="value => typeof value === 'string' && (value === currentStoryId ? onStoryBreadcrumb(storyBreadcrumb.length - 1) : onHeaderStorySelect(value))" />
              </template>
            </StoryBreadcrumb>
            <StoryBreadcrumb class="home-view__period-breadcrumb" :items="primaryLane.periodCrumbs.value" :current-navigable="!primaryLeads" :loading="loading" @navigate="primaryLane.actions.periodCrumb" />
          </div>
          <div class="home-view__header-actions">
            <Select v-if="!routeError && primaryLane.eventFilter.available.value" class="home-view__subject" compact :searchable="false" placeholder="Sujets des événements"
              :model-value="primaryLane.eventFilter.subject.value" :options="primaryLane.eventFilter.options.value" @update:model-value="primaryLane.eventFilter.select" />
            <Switch v-model="showPeriodChildren" label="Étendre" label-first variant="sm" :disabled="loading" />
            <Button v-if="auth.signedIn && !routeError && !error" variant="tertiary" size="sm" :disabled="loading"
              :to="{ name: 'database', query: { story: primaryLane.storyId.value ?? currentStoryId } }">Détail de la frise</Button>
          </div>
        </div>
        <div v-if="primaryLeads && (routeError || error)" role="alert">
          {{ routeError || error }} <Button variant="tertiary" size="sm" v-if="!routeError" type="button" :disabled="loading" @click="retry">Réessayer</Button><RouterLink v-else :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
        </div>
        <Select v-if="primaryLeads && navigationContexts.length > 1" :model-value="contextId" label="Parcours chronologique" placeholder="Choisir un parcours"
          :options="navigationContexts.map(context => ({ value: context.id, label: context.title.fr || context.title.en }))"
          :disabled="loading" @update:model-value="value => typeof value === 'string' && onContext(value)" />
        <PeriodGrid
          v-if="!routeError"
          ref="periodGrid"
          :key="primaryLane.grid.value.currentStoryId"
          class="home-view__timeline"
          v-bind="primaryLane.grid.value"
          :show-children="primaryLeads && showPeriodChildren"
          :compact="comparing"
          :external-focus="secondaryFocus"
          :load-story-details="dataStore.ensureStoryLoaded"
          period-tooltips
          @period-click="primaryLane.actions.periodClick"
          @event-click="onEventClick"
          @go-back="primaryLane.actions.goBack"
          @navigate-period="primaryLane.actions.navigatePeriod"
          @story-select="primaryLane.actions.storySelect"
        >
          <template v-if="primaryLeads && contextBar" #overview-context="{ style, continuation }">
            <PeriodCard variant="parent" :compact="comparing" :period="contextBar" :style="style" :continues-before="continuation.before" :continues-after="continuation.after" :is-selected="false" :loading="loading" @back="onGoBack">
              <template #title-actions>
                <span v-if="!returnPath.length" class="home-view__context-label">Période de référence</span>
                <AssociatedStoriesBadge :story-id="currentStoryId" :period-id="contextBar.id" :period-label="contextBar.label.fr"
                  :stories="contextStories" :disabled="loading" @select="id => onStorySelect(id, contextAnchor, contextStoryId)" />
              </template>
            </PeriodCard>
          </template>
        </PeriodGrid>
        <!-- Comparer : une seconde frise, sur la même échelle. -->
        <div v-if="!comparing && !routeError" class="home-view__add">
          <Button v-if="!pickingStory" variant="secondary" size="sm" :disabled="loading" @click="pickingStory = true">
            <template #icon><Icon icon="mdi:plus" aria-hidden="true" /></template>Ajouter une frise
          </Button>
          <template v-else>
            <Select class="home-view__story-picker" compact :model-value="null" placeholder="Choisir la frise à comparer" :options="comparisonOptions"
              dropdown-class="base-select__dropdown--above" @update:model-value="value => typeof value === 'string' && addComparedStory(value)" />
            <Button variant="ghost" size="sm" @click="pickingStory = false">Annuler</Button>
          </template>
        </div>
      </section>

      <section v-if="comparing" class="home-view__frise" :aria-label="`Seconde frise : ${secondaryLane.title.value}`">
        <div class="home-view__header">
          <div class="home-view__breadcrumbs">
            <StoryBreadcrumb class="home-view__story-breadcrumb" :items="secondaryLane.storyCrumbs.value" :max-visible="3" label="Fil d’Ariane de la seconde frise" current-navigable
              :loading="secondaryNav.loading.value" @navigate="secondaryLane.actions.storyCrumb" />
            <StoryBreadcrumb class="home-view__period-breadcrumb" :items="secondaryLane.periodCrumbs.value" label="Périodes de la seconde frise" :current-navigable="!secondaryLeads"
              :loading="secondaryNav.loading.value" @navigate="secondaryLane.actions.periodCrumb" />
          </div>
          <div class="home-view__header-actions">
            <Select v-if="secondaryLane.eventFilter.available.value" class="home-view__subject" compact :searchable="false" placeholder="Sujets des événements de la seconde frise"
              :model-value="secondaryLane.eventFilter.subject.value" :options="secondaryLane.eventFilter.options.value" @update:model-value="secondaryLane.eventFilter.select" />
            <Button variant="ghost" size="xs" icon-only aria-label="Retirer la seconde frise" title="Retirer la seconde frise" @click="removeComparedStory">
              <template #icon><Icon icon="mdi:close" aria-hidden="true" /></template>
            </Button>
          </div>
        </div>
        <div v-if="secondaryLeads && secondaryNav.error.value" role="alert">
          {{ secondaryNav.error.value }} <Button variant="tertiary" size="sm" type="button" :disabled="secondaryNav.loading.value" @click="secondaryNav.retryLoad">Réessayer</Button>
        </div>
        <PeriodGrid
          ref="secondaryGrid"
          :key="secondaryLane.grid.value.currentStoryId"
          class="home-view__timeline"
          v-bind="secondaryLane.grid.value"
          :show-children="secondaryLeads && showPeriodChildren"
          compact
          :external-focus="primaryFocus"
          :load-story-details="dataStore.ensureStoryLoaded"
          period-tooltips
          @period-click="secondaryLane.actions.periodClick"
          @go-back="secondaryLane.actions.goBack"
          @navigate-period="secondaryLane.actions.navigatePeriod"
          @story-select="secondaryLane.actions.storySelect"
        >
          <template v-if="secondaryLeads && secondaryNav.contextBar.value" #overview-context="{ style, continuation }">
            <PeriodCard variant="parent" compact :period="secondaryNav.contextBar.value" :style="style" :continues-before="continuation.before" :continues-after="continuation.after"
              :is-selected="false" :loading="secondaryNav.loading.value" @back="secondaryLane.actions.goBack">
              <template #title-actions>
                <AssociatedStoriesBadge :story-id="secondaryNav.currentStoryId.value" :period-id="secondaryNav.contextBar.value.id" :period-label="secondaryNav.contextBar.value.label.fr"
                  :stories="secondaryNav.contextStories.value" :disabled="secondaryNav.loading.value"
                  @select="id => secondaryLane.actions.storySelect(id, undefined, secondaryNav.contextStoryId.value)" />
              </template>
            </PeriodCard>
          </template>
        </PeriodGrid>
      </section>

      <!-- Un même événement dans les deux frises : même date, donc un trait vertical entre ses deux points. -->
      <svg v-if="comparing && slidePhase === 'idle'" class="home-view__links" aria-hidden="true">
        <line v-for="link in comparisonLinkLines" :key="link.id" :class="{ 'is-active': link.id === activeComparisonEventId }"
          :x1="link.x" :x2="link.x" :y1="link.y1" :y2="link.y2" />
      </svg>
    </div>
    <Teleport to="body">
      <ModalShell v-if="leaderNav.navigationChoices.value.length" title="Choisir une frise pour cette période" height="auto" @close="closeNavigationChoices">
        <p>Plusieurs frises présentent cette période.</p>
        <div class="home-view__choices">
          <Button v-for="choice in leaderNav.navigationChoices.value" :key="choice.storyId" variant="tertiary" size="sm" @click="chooseLeaderTarget(choice)">{{ choice.title }}</Button>
        </div>
      </ModalShell>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import Switch from '@/components/base/Switch.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import { Icon } from '@iconify/vue';
import { computed, onActivated, onDeactivated, ref, shallowRef, watch } from 'vue';
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { readStoryTarget, readTimelinePosition, readTimelineReturnPath, timelineLocation } from '@/router/storyTarget';
import PeriodCard from './HomeView/PeriodCard.vue';
import AssociatedStoriesBadge from './HomeView/AssociatedStoriesBadge.vue';

// KeepAlive includes this page by name; navigation and history stay in its instance.
defineOptions({ name: 'HomeView' });
import PeriodGrid from './HomeView/PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useTimelineSlide } from '@/composables/useTimelineSlide';
import { useTimelineComparisonLane, type TimelineLaneKey } from '@/composables/useTimelineComparisonLane';
import { useTimelineComparisonLinks } from '@/composables/useTimelineComparisonLinks';
import type { ScaleFrame } from '@/lib/timelineComparison';
import type { TimelineTarget } from '@/lib/timelineNavigation';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { track, type TimelineVia } from '@/lib/analytics';
import { entryVia, eventProperties, periodProperties, positionShape, storyProperties, takeAnnouncedEntry, type StoryScope } from '@/lib/explorationAnalytics';
import type { ListEvent } from '@/types/database';

const dataStore = useDataStore();
const showPeriodChildren = ref(false);
const auth = useAuthStore();
const router = useRouter();
// Cause of the next in-page navigation: set by the action, handed to the route change it pushes.
let actionVia: TimelineVia | null = null;
let routeVia: TimelineVia | null = null;

/** The compared frise travels in the URL with the main one; its own position stays in memory. */
function withComparison(location: RouteLocationRaw): RouteLocationRaw {
  const compared = secondaryLane.storyId.value;
  if (!compared || typeof location !== 'object' || !('query' in location)) return location;
  return { ...location, query: { ...location.query, compare: compared } };
}

const nav = useHomeNavigation(target => {
  routeVia = actionVia ?? 'app'; actionVia = null;
  // A refused or duplicate navigation changes no route: its cause must not label the next one.
  void router.push(withComparison(timelineLocation(target))).then(failure => { if (failure) routeVia = null; });
});
const {
  loading,
  error,
  retryLoad,
  parentStack,
  currentPeriod,
  previousPeriod,
  nextPeriod,
  navigationContexts, contextId, chooseNavigationTarget, selectNavigationContext,
  currentStoryId,
  displayedPeriods,
  storyEvents,
  currentStoryPeriods,
  storyBreadcrumb,
  contextBar, contextStories, contextStoryId, headerStories, returnPath, referencePeriodId,
  loadInitialData,
  openStory,
  handlePeriodClick,
  handleEventClick,
  goBack,
  selectStory,
  navigateToBreadcrumb,
  navigateToStoryBreadcrumb,
} = nav;
function onHeaderStorySelect(id: string) {
  const story = headerStories.value.find(story => story.id === id);
  if (story) return onStorySelect(id, story.anchor);
}
const contextAnchor=computed(()=>{
  const frame=returnPath.value[returnPath.value.length-1];
  return referencePeriodId.value?{type:'period' as const,id:referencePeriodId.value}:frame?.anchor;
});
function as<A extends unknown[]>(via: TimelineVia, run: (...args: A) => unknown) {
  return (...args: A) => { actionVia = via; return run(...args); };
}
const onPeriodClick = as('period', handlePeriodClick);
const onGoBack = as('back', goBack);
const onBreadcrumb = as('breadcrumb', navigateToBreadcrumb);
const onStoryBreadcrumb = as('story_breadcrumb', navigateToStoryBreadcrumb);
const onContext = as('context', selectNavigationContext);
const onChoice = as('story_choice', chooseNavigationTarget);
async function onStorySelect(...args: Parameters<typeof selectStory>) {
  actionVia = 'associated_story';
  await selectStory(...args);
  // Still unconsumed after an error: the associated frise could not be opened.
  if (actionVia === 'associated_story' && error.value) {
    actionVia = null;
    track('timeline_load_failed', { reason: 'story_unavailable', via: 'associated_story' });
  }
}

// ─── Comparaison : deux frises, une échelle ─────────────────────────────────
// La frise qui mène fixe le cadre ; l’autre le suit et descend seule au niveau qui le couvre.
const periodGrid = shallowRef<InstanceType<typeof PeriodGrid> | null>(null);
const secondaryGrid = shallowRef<InstanceType<typeof PeriodGrid> | null>(null);
const leader = ref<TimelineLaneKey>('primary');
let lastFrame: ScaleFrame | null = null;
/** Cadre affiché par la frise qui mène ; pendant son chargement, l’autre garde le cadre précédent. */
const scaleFrame = computed<ScaleFrame | null>(() => {
  const current = (leader.value === 'primary' ? periodGrid : secondaryGrid).value?.getScaleFrame?.() ?? null;
  if (current) lastFrame = current;
  return current ?? lastFrame;
});
const primaryLane = useTimelineComparisonLane({ key: 'primary', nav, leader, frame: scaleFrame, handlers: {
  periodClick: onPeriodClick, goBack: onGoBack, storySelect: onStorySelect,
  storyCrumb: onStoryBreadcrumb, periodCrumb: onBreadcrumb, navigatePeriod: direction => slideToAdjacentPeriod('primary', direction),
} });
const secondaryNav = useHomeNavigation();
const secondaryLane = useTimelineComparisonLane({ key: 'secondary', nav: secondaryNav, leader, frame: scaleFrame, handlers: {
  navigatePeriod: direction => slideToAdjacentPeriod('secondary', direction),
} });
const lanes = { primary: primaryLane, secondary: secondaryLane };
const primaryLeads = computed(() => leader.value === 'primary');
const secondaryLeads = computed(() => leader.value === 'secondary');
const leaderNav = computed(() => lanes[leader.value].nav);
const comparing = computed(() => !!secondaryLane.storyId.value);

const pickingStory = ref(false);
const comparisonOptions = computed(() => [...dataStore.stories].filter(story => story.id !== primaryLane.storyId.value)
  .sort((a, b) => (a.title.fr || '').localeCompare(b.title.fr || '', 'fr')).map(story => ({ value: story.id, label: story.title.fr || story.title.en })));
function replaceComparison(id: string | null) {
  const { compare: _compare, ...query } = route.query;
  const returns = router.options.history.state?.timelineReturnPath;
  void router.replace({ name: 'timeline', query: { ...query, ...(id ? { compare: id } : {}) },
    ...(Array.isArray(returns) ? { state: { timelineReturnPath: JSON.parse(JSON.stringify(returns)) } } : {}) });
}
function addComparedStory(id: string) {
  pickingStory.value = false;
  secondaryLane.storyId.value = id;
  replaceComparison(id);
}
/** Retirer la seconde frise rend la main à la première, au niveau qu’elle affichait. */
function removeComparedStory() {
  const level = primaryLane.ancestors.value[primaryLane.ancestors.value.length - 1];
  const wasLeading = secondaryLeads.value;
  secondaryLane.storyId.value = null;
  if (wasLeading) primaryLane.leadAt(level);
  else replaceComparison(null);
  leader.value = 'primary';
}
// Ouvrir la frise comparée dans la première rend la comparaison sans objet.
watch(() => primaryLane.storyId.value, id => { if (id && id === secondaryLane.storyId.value) removeComparedStory(); });

const primaryFocus = computed(() => periodGrid.value?.getFocus?.() ?? null);
const secondaryFocus = computed(() => secondaryGrid.value?.getFocus?.() ?? null);
const gridElement = (grid: InstanceType<typeof PeriodGrid> | null) => (grid?.$el as HTMLElement | undefined) ?? null;

const storyScope = (): StoryScope => ({
  story: dataStore.stories.find(story => String(story.id) === currentStoryId.value),
  username: auth.profile?.username, signedIn: auth.signedIn,
});
const depth = () => parentStack.value.length + (currentPeriod.value ? 1 : 0);
function onEventClick(event: ListEvent) {
  const scope = storyScope();
  track('timeline_event_opened', { ...storyProperties(scope), ...eventProperties(scope, event), depth: depth() });
  return handleEventClick(event);
}
/** One event per position actually displayed; a navigation replaced by a newer one reports nothing. */
let positionToken = 0;
async function reportPosition(loaded: Promise<unknown>, via: TimelineVia) {
  const token = ++positionToken;
  await loaded;
  if (token !== positionToken) return;
  if (error.value) { track('timeline_load_failed', { reason: 'load_failed', via }); return; }
  const scope = storyScope();
  track('timeline_position_viewed', {
    ...storyProperties(scope), ...periodProperties(scope, currentPeriod.value),
    view: currentPeriod.value ? 'period' : 'overview', depth: depth(), via, has_context: !!contextId.value,
    ...positionShape({
      storyPeriods: currentStoryPeriods.value, displayedPeriods: displayedPeriods.value, events: storyEvents.value,
      hasPrevious: !!previousPeriod.value, hasNext: !!nextPeriod.value,
    }),
  });
}
function retry() { actionVia = 'retry'; void reportPosition(retryLoad(), 'retry'); }


const route = useRoute();
const routeError = ref('');
const timelineViewport = ref<HTMLElement | null>(null);
// Les deux frises glissent ensemble ; la frise qui mène donne la position attendue.
const slide = useTimelineSlide(
  () => timelineViewport.value,
  () => [periodGrid.value, comparing.value ? secondaryGrid.value : null].flatMap(grid => grid?.getSlideLayers?.() ?? []),
  () => {
    const leading = leaderNav.value;
    return { storyId: leading.currentStoryId.value, periodId: leading.currentPeriod.value?.id ?? leading.referencePeriodId.value ?? undefined, contextId: leading.contextId.value };
  },
  () => leaderNav.value.loading.value,
  () => (primaryLeads.value && routeError.value) || leaderNav.value.error.value,
);
const { phase: slidePhase } = slide;
function slideToAdjacentPeriod(key: TimelineLaneKey, direction: 'previous' | 'next') {
  const leading = lanes[key].nav;
  const destination = direction === 'previous' ? leading.previousPeriod.value : leading.nextPeriod.value;
  if (leading.loading.value || !destination) return;
  slide.prepare(direction, destination.id,
    'linkedStoryId' in destination && typeof destination.linkedStoryId === 'string' ? destination.linkedStoryId : undefined);
  if (key === 'primary') actionVia = 'slide';
  leading.navigateAdjacentPeriod(direction);
}
function closeNavigationChoices() { slide.cancel(); leaderNav.value.navigationChoices.value = []; }
function chooseLeaderTarget(choice: TimelineTarget) {
  if (primaryLeads.value) void onChoice(choice);
  else void secondaryNav.chooseNavigationTarget(choice);
}

const {
  links: comparisonLinkLines, activeEventId: activeComparisonEventId,
  schedule: scheduleComparisonLinks, track: trackComparisonLink, clear: clearComparisonLink,
} = useTimelineComparisonLinks(
  timelineViewport,
  () => [gridElement(periodGrid.value), gridElement(secondaryGrid.value)],
  () => [primaryLane.grid.value.events, comparing.value ? secondaryLane.grid.value.events : []],
  [scaleFrame, primaryFocus, secondaryFocus, leader, slidePhase, comparing, showPeriodChildren],
);

let initialized = false;
let consumedPosition = '';
let previousRouteName: unknown = null;
watch([() => route.query.story, () => route.query.period, () => route.query.context, () => route.query.reference, () => route.query.view, () => route.query.entry, () => route.name], () => {
  const from = previousRouteName; previousRouteName = route.name;
  if (route.name !== 'timeline') return;
  // An in-page action, an announced search, the browser history inside the page, or an entry from elsewhere.
  const via = routeVia ?? takeAnnouncedEntry() ?? (initialized && from === 'timeline' ? 'history' : entryVia(window.history.state?.back));
  routeVia = null;
  routeError.value = '';
  try {
    const storyId = readStoryTarget(route.query.story);
    const state=router.options.history.state;
    const position = { ...readTimelinePosition(route.query), ...(Array.isArray(state?.timelineReturnPath)?{returnPath:readTimelineReturnPath(state)}:{}) };
    const key = JSON.stringify([storyId, position]);
    if (initialized && key === consumedPosition) return;
    consumedPosition = key;
    initialized = true;
    // Une position de l’URL est toujours celle de la première frise : elle reprend la main.
    leader.value = 'primary';
    primaryLane.storyId.value = storyId ?? '1';
    void reportPosition(openStory(storyId ?? '1', { storyId: storyId ?? '1', ...position }), via);
  } catch (cause) {
    routeError.value = cause instanceof Error ? cause.message : 'La frise demandée est invalide.';
    track('timeline_load_failed', { reason: 'invalid_link', via });
  }
}, { immediate: true });
// La frise comparée suit le paramètre `compare` ; un lien invalide ou vers la même frise est ignoré.
watch(() => route.query.compare, value => {
  if (route.name !== 'timeline') return;
  let id: string | null = null;
  try { id = readStoryTarget(value); } catch { id = null; }
  if (id === primaryLane.storyId.value) id = null;
  if (id === secondaryLane.storyId.value) return;
  if (secondaryLeads.value) leader.value = 'primary';
  secondaryLane.storyId.value = id;
}, { immediate: true });

let activatedOnce = false;
onDeactivated(closeNavigationChoices);
onActivated(() => {
  if (!activatedOnce) { activatedOnce = true; return; }
  if (loading.value || routeError.value) return;
  void loadInitialData({ parentStackIds: parentStack.value.map(period => period.id), currentPeriodId: currentPeriod.value?.id ?? null }, true);
});
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}

.home-view__choices { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-md); }
.home-view__header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--spacing-sm); flex-shrink: 0; padding-inline: var(--spacing-md); }
.home-view__breadcrumbs { flex: 1; min-width: 0; }
.home-view__story-selector { width: auto; min-width: 0; }
.home-view__story-selector :deep(.base-select__trigger) { min-height: 0; padding: 0; border: 0; background: transparent; color: var(--color-text-primary); font: inherit; }
.home-view__story-selector :deep(.base-select__value) { font: inherit; }
.home-view__story-selector :deep(.base-select__placeholder) { color: var(--color-text-primary); opacity: 1; font-weight: var(--font-weight-semibold); }
.home-view__story-selector :deep(.base-select__indicators) { margin-left: var(--spacing-xs); }
.home-view__story-selector :deep(.base-select__dropdown) { right: auto; width: max-content; min-width: 100%; max-width: min(320px, 85vw); }
/* Sujet des événements : un select discret, aligné à droite avec les actions de la frise. */
.home-view__subject { width: auto; min-width: 0; }
.home-view__subject :deep(.base-select__trigger) { min-height: 0; padding: var(--spacing-xs) var(--spacing-sm); border: 0; background: transparent; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.home-view__subject :deep(.base-select__trigger:hover) { background: var(--color-interaction-hover); }
.home-view__subject :deep(.base-select__value) { font: inherit; }
.home-view__subject :deep(.base-select__dropdown) { left: auto; right: 0; width: max-content; min-width: 100%; max-width: min(320px, 85vw); }
.home-view__header-actions { grid-column: 2; grid-row: 1; min-width: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: var(--spacing-sm); margin-block: var(--spacing-sm) var(--spacing-xs); }
@media (max-width: 768px) {
  .home-view__header { grid-template-columns: minmax(0, 1fr) auto; }
  .home-view__header-actions { grid-column: 2; grid-row: 1; }
  /* Avec le select, les actions passent sous le fil d'Ariane pour ne pas le recouvrir. */
  .home-view__header:has(.home-view__subject) .home-view__header-actions { grid-column: 1 / -1; grid-row: 2; }
}
.home-view__breadcrumbs > .story-breadcrumb + .story-breadcrumb { padding-top: 0; }
.home-view__story-breadcrumb :deep(.story-breadcrumb__item) { padding-bottom: 0; }
.home-view__period-breadcrumb :deep(.story-breadcrumb__item) { padding-top: 0; }
/* Hôte du glissement : une frise seule, ou deux frises qui se partagent la hauteur. */
.home-view__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.home-view__frise { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; background: var(--color-background-default); }
/* Le fond du conteneur forme une bande entre les deux frises. */
.home-view__viewport--comparing { gap: var(--spacing-lg); background: var(--color-timeline-separator); }
.home-view__timeline { flex: 1 1 0; min-height: 0; height: auto; }
.home-view__add { display: flex; justify-content: center; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; padding: 0 var(--spacing-md) var(--spacing-md); }
.home-view__story-picker { width: min(360px, 100%); }
.home-view__links { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
/* Traits discrets ; celui de l’événement survolé ressort. */
.home-view__links line { stroke: var(--color-data-event); stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.3; transition: opacity var(--transition-fast), stroke-width var(--transition-fast); }
.home-view__links line.is-active { opacity: 1; stroke-width: 2; }
.home-view__context-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-right: var(--spacing-sm); }
.home-view__viewport--waiting .home-view__timeline { visibility: hidden; }
.home-view__viewport--sliding :deep(.timeline-card),
.home-view__viewport :deep(.timeline-slide-snapshot *) {
  animation: none !important;
  transition: none !important;
}
</style>
