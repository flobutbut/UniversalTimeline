<template>
  <div class="home-view">
    <div class="home-view__header">
      <div class="home-view__breadcrumbs">
        <StoryBreadcrumb class="home-view__story-breadcrumb" :items="storyBreadcrumb" :max-visible="3" label="Fil d’Ariane des frises" current-navigable :loading="loading" @navigate="onStoryBreadcrumb">
          <template v-if="headerStories.length" #current="{ item }">
            <Select class="home-view__story-selector" :model-value="null" :placeholder="item.title" compact :searchable="false" :disabled="loading"
              :options="[{ value: currentStoryId, label: 'Vue d’ensemble de la frise' }, ...headerStories.map(story => ({ value: story.id, label: story.title.fr || story.title.en }))]"
              @update:model-value="value => typeof value === 'string' && (value === currentStoryId ? onStoryBreadcrumb(storyBreadcrumb.length - 1) : onHeaderStorySelect(value))" />
          </template>
        </StoryBreadcrumb>
        <StoryBreadcrumb class="home-view__period-breadcrumb" :items="breadcrumb" :loading="loading" @navigate="onBreadcrumb" />
      </div>
      <div class="home-view__header-actions">
        <Switch v-model="showPeriodChildren" label="Étendre" label-first variant="sm" :disabled="loading" />
        <Button v-if="!routeError && !error" variant="tertiary" size="sm" :disabled="loading"
          :to="{ name: 'database', query: { story: currentStoryId } }">Détail de la frise</Button>
      </div>
    </div>
    <div v-if="routeError || error" role="alert">
      {{ routeError || error }} <Button variant="tertiary" size="sm" v-if="!routeError" type="button" :disabled="loading" @click="retry">Réessayer</Button><RouterLink v-else :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
    </div>
    <Select v-if="navigationContexts.length > 1" :model-value="contextId" label="Parcours chronologique" placeholder="Choisir un parcours"
      :options="navigationContexts.map(context => ({ value: context.id, label: context.title.fr || context.title.en }))"
      :disabled="loading" @update:model-value="value => typeof value === 'string' && onContext(value)" />
    <Teleport to="body">
      <ModalShell v-if="navigationChoices.length" title="Choisir une frise pour cette période" height="auto" @close="closeNavigationChoices">
        <p>Plusieurs frises présentent cette période.</p>
        <div class="home-view__choices">
          <Button v-for="choice in navigationChoices" :key="choice.storyId" variant="tertiary" size="sm" @click="onChoice(choice)">{{ choice.title }}</Button>
        </div>
      </ModalShell>
    </Teleport>
    <div ref="timelineViewport" class="home-view__viewport"
      :class="{ 'home-view__viewport--waiting': slidePhase === 'waiting', 'home-view__viewport--sliding': slidePhase !== 'idle' }"
      :inert="slidePhase !== 'idle' || undefined" :aria-busy="slidePhase !== 'idle' || undefined">
      <PeriodGrid
        v-if="!routeError"
        ref="periodGrid"
        :key="currentStoryId"
        class="home-view__timeline"
        :periods="displayedPeriods"
        :child-periods="periodChildren"
        :child-linked-periods="childLinkedPeriods"
        :show-children="showPeriodChildren"
        :linked-periods="linkedPeriods"
        :events="storyEvents"
        :loading="loading"
        :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
        :current-period="currentPeriod"
        :overview-navigation="!!returnTitle"
        :overview-period="contextBar"
        :previous-period="previousPeriod"
        :next-period="nextPeriod"
        :story-bounds="currentStoryBounds"
        :current-story-id="currentStoryId"
        :load-story-details="dataStore.ensureStoryLoaded"
        period-tooltips
        @period-click="onPeriodClick"
        @event-click="onEventClick"
        @go-back="onGoBack"
        @navigate-period="slideToAdjacentPeriod"
        @story-select="onStorySelect"
      >
        <template v-if="contextBar" #overview-context="{ style, continuation }">
          <PeriodCard variant="parent" :period="contextBar" :style="style" :continues-before="continuation.before" :continues-after="continuation.after" :is-selected="false" :loading="loading" @back="onGoBack">
            <template #title-actions>
              <span class="home-view__context-label">{{ returnPath.length ? 'Retour' : 'Période de référence' }}</span>
              <AssociatedStoriesBadge :story-id="currentStoryId" :period-id="contextBar.id" :period-label="contextBar.label.fr"
                :stories="contextStories" :disabled="loading" @select="id => onStorySelect(id, contextAnchor)" />
            </template>
          </PeriodCard>
        </template>
      </PeriodGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import Switch from '@/components/base/Switch.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { readStoryTarget, readTimelinePosition, readTimelineReturnPath, timelineLocation } from '@/router/storyTarget';
import PeriodCard from './HomeView/PeriodCard.vue';
import AssociatedStoriesBadge from './HomeView/AssociatedStoriesBadge.vue';

// KeepAlive includes this page by name; navigation and history stay in its instance.
defineOptions({ name: 'HomeView' });
import PeriodGrid from './HomeView/PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useTimelineSlide } from '@/composables/useTimelineSlide';
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

const {
  loading,
  error,
  retryLoad,
  parentStack,
  currentPeriod,
  previousPeriod,
  nextPeriod,
  navigateAdjacentPeriod,
  navigationContexts, contextId, navigationChoices, chooseNavigationTarget, selectNavigationContext,
  currentStoryId,
  displayedPeriods,
  periodChildren,
  storyEvents,
  currentStoryPeriods,
  breadcrumb,
  storyBreadcrumb,
  currentStoryBounds,
  contextBar, contextStories, headerStories, linkedPeriods, childLinkedPeriods, returnTitle, returnPath, referencePeriodId,
  loadInitialData,
  openStory,
  handlePeriodClick,
  handleEventClick,
  goBack,
  selectStory,
  navigateToBreadcrumb,
  navigateToStoryBreadcrumb,
} = useHomeNavigation(target => {
  routeVia = actionVia ?? 'app'; actionVia = null;
  // A refused or duplicate navigation changes no route: its cause must not label the next one.
  void router.push(timelineLocation(target)).then(failure => { if (failure) routeVia = null; });
});
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
const periodGrid = ref<InstanceType<typeof PeriodGrid> | null>(null);
const slide = useTimelineSlide(
  () => timelineViewport.value,
  () => periodGrid.value?.getSlideLayers() ?? [],
  () => ({ storyId: currentStoryId.value, periodId: currentPeriod.value?.id ?? referencePeriodId.value ?? undefined, contextId: contextId.value }),
  () => loading.value,
  () => routeError.value || error.value,
);
const { phase: slidePhase } = slide;
function slideToAdjacentPeriod(direction: 'previous' | 'next') {
  const destination = direction === 'previous' ? previousPeriod.value : nextPeriod.value;
  if (loading.value || !destination) return;
  slide.prepare(direction, destination.id);
  actionVia = 'slide';
  navigateAdjacentPeriod(direction);
}
function closeNavigationChoices() { slide.cancel(); navigationChoices.value = []; }
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
    void reportPosition(openStory(storyId ?? '1', { storyId: storyId ?? '1', ...position }), via);
  } catch (cause) {
    routeError.value = cause instanceof Error ? cause.message : 'La frise demandée est invalide.';
    track('timeline_load_failed', { reason: 'invalid_link', via });
  }
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
.home-view__story-selector :deep(.base-select__trigger) { min-height: 0; padding: var(--spacing-xs) 0; background: transparent; border-color: transparent; color: var(--color-text-primary); }
.home-view__story-selector :deep(.base-select__placeholder) { color: var(--color-text-primary); opacity: 1; font-weight: var(--font-weight-semibold); }
.home-view__story-selector :deep(.base-select__indicators) { margin-left: var(--spacing-xs); }
.home-view__story-selector :deep(.base-select__dropdown) { right: auto; width: max-content; min-width: 100%; max-width: min(320px, 85vw); }
.home-view__header-actions { grid-column: 2; grid-row: 1; min-width: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--spacing-sm); margin-block: var(--spacing-sm) var(--spacing-xs); }
@media (max-width: 768px) {
  .home-view__header { grid-template-columns: minmax(0, 1fr) auto; }
  .home-view__header-actions { grid-column: 2; grid-row: 1; }
}
.home-view__breadcrumbs > .story-breadcrumb + .story-breadcrumb { padding-top: 0; }
.home-view__story-breadcrumb :deep(.story-breadcrumb__item) { padding-bottom: 0; }
.home-view__period-breadcrumb :deep(.story-breadcrumb__item) { padding-top: 0; }
.home-view__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.home-view__timeline { height: 100%; }
.home-view__context-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-right: var(--spacing-sm); }
.home-view__viewport--waiting > .home-view__timeline { visibility: hidden; }
.home-view__viewport--sliding :deep(.timeline-card),
.home-view__viewport :deep(.timeline-slide-snapshot *) {
  animation: none !important;
  transition: none !important;
}
</style>
