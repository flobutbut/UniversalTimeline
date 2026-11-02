<template>
  <div class="home-view">
    <StoryBreadcrumb class="home-view__story-breadcrumb" :items="storyBreadcrumb" label="Fil d’Ariane des frises" :loading="loading" @navigate="navigateToStoryBreadcrumb" />
    <StoryBreadcrumb class="home-view__period-breadcrumb" :items="breadcrumb" :loading="loading" @navigate="navigateToBreadcrumb" />
    <div v-if="routeError || error" role="alert">
      {{ routeError || error }} <Button variant="tertiary" size="sm" v-if="!routeError" type="button" :disabled="loading" @click="retryLoad">Réessayer</Button><RouterLink v-else :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
    </div>
    <Select v-if="navigationContexts.length > 1" :model-value="contextId" label="Parcours chronologique" placeholder="Choisir un parcours"
      :options="navigationContexts.map(context => ({ value: context.id, label: context.title.fr || context.title.en }))"
      :disabled="loading" @update:model-value="value => typeof value === 'string' && selectNavigationContext(value)" />
    <Teleport to="body">
      <ModalShell v-if="navigationChoices.length" title="Choisir une frise pour cette période" height="auto" @close="closeNavigationChoices">
        <p>Plusieurs frises présentent cette période.</p>
        <div class="home-view__choices">
          <Button v-for="choice in navigationChoices" :key="choice.storyId" variant="tertiary" size="sm" @click="chooseNavigationTarget(choice)">{{ choice.title }}</Button>
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
        :events="storyEvents"
        :loading="loading"
        :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
        :current-period="currentPeriod"
        :previous-period="previousPeriod"
        :next-period="nextPeriod"
        :story-bounds="currentStoryBounds"
        :current-story-id="currentStoryId"
        :load-story-details="dataStore.ensureStoryLoaded"
        period-tooltips
        @period-click="handlePeriodClick"
        @event-click="handleEventClick"
        @go-back="goBack"
        @navigate-period="slideToAdjacentPeriod"
        @story-select="selectStory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import { onActivated, onDeactivated, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { readStoryTarget, readTimelinePosition, timelineLocation } from '@/router/storyTarget';

// KeepAlive includes this page by name; navigation and history stay in its instance.
defineOptions({ name: 'HomeView' });
import PeriodGrid from './HomeView/PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useTimelineSlide } from '@/composables/useTimelineSlide';
import { useDataStore } from '@/stores/useDataStore';

const dataStore = useDataStore();
const router = useRouter();

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
  storyEvents,
  breadcrumb,
  storyBreadcrumb,
  currentStoryBounds,
  loadInitialData,
  openStory,
  handlePeriodClick,
  handleEventClick,
  goBack,
  selectStory,
  navigateToBreadcrumb,
  navigateToStoryBreadcrumb,
} = useHomeNavigation(target => { void router.push(timelineLocation(target)); });

const route = useRoute();
const routeError = ref('');
const timelineViewport = ref<HTMLElement | null>(null);
const periodGrid = ref<InstanceType<typeof PeriodGrid> | null>(null);
const slide = useTimelineSlide(
  () => timelineViewport.value,
  () => periodGrid.value?.getSlideLayers() ?? [],
  () => ({ storyId: currentStoryId.value, periodId: currentPeriod.value?.id, contextId: contextId.value }),
  () => loading.value,
  () => routeError.value || error.value,
);
const { phase: slidePhase } = slide;
function slideToAdjacentPeriod(direction: 'previous' | 'next') {
  const destination = direction === 'previous' ? previousPeriod.value : nextPeriod.value;
  if (loading.value || !destination) return;
  slide.prepare(direction, destination.id);
  navigateAdjacentPeriod(direction);
}
function closeNavigationChoices() { slide.cancel(); navigationChoices.value = []; }
let initialized = false;
let consumedPosition = '';
watch([() => route.query.story, () => route.query.period, () => route.query.context, () => route.query.view, () => route.query.entry, () => route.name], () => {
  if (route.name !== 'timeline') return;
  routeError.value = '';
  try {
    const storyId = readStoryTarget(route.query.story);
    const position = readTimelinePosition(route.query);
    const key = JSON.stringify([storyId, position]);
    if (initialized && key === consumedPosition) return;
    consumedPosition = key;
    initialized = true;
    void openStory(storyId ?? '1', { storyId: storyId ?? '1', ...position });
  } catch (cause) {
    routeError.value = cause instanceof Error ? cause.message : 'La frise demandée est invalide.';
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
.home-view > .story-breadcrumb + .story-breadcrumb { padding-top: 0; }
.home-view__story-breadcrumb :deep(.story-breadcrumb__item) { padding-bottom: 0; }
.home-view__period-breadcrumb :deep(.story-breadcrumb__item) { padding-top: 0; }
.home-view__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.home-view__timeline { height: 100%; }
.home-view__viewport--waiting > .home-view__timeline { visibility: hidden; }
.home-view__viewport--sliding :deep(.timeline-card),
.home-view__viewport :deep(.timeline-slide-snapshot *) {
  animation: none !important;
  transition: none !important;
}
</style>
