<template>
  <div class="home-view">
    <StoryBreadcrumb :items="breadcrumb" :loading="loading" @navigate="navigateToBreadcrumb" />
    <div v-if="routeError || error" role="alert">
      {{ routeError || error }} <button v-if="!routeError" type="button" :disabled="loading" @click="retryLoad">Réessayer</button><RouterLink v-else :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
    </div>
    <PeriodGrid
      v-if="!routeError"
      :key="currentStoryId"
      class="home-view__timeline"
      :periods="displayedPeriods"
      :events="storyEvents"
      :loading="loading"
      :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
      :current-period="currentPeriod"
      :story-bounds="currentStoryBounds"
      :story-suggestions="storySuggestions"
      :current-story-id="currentStoryId"
      :load-story-details="dataStore.ensureStoryLoaded"
      period-tooltips
      @period-click="handlePeriodClick"
      @event-click="handleEventClick"
      @go-back="goBack"
      @story-select="selectStory"
    />
  </div>
</template>

<script setup lang="ts">
import { onActivated, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { readStoryTarget } from '@/router/storyTarget';

// KeepAlive includes this page by name; navigation and history stay in its instance.
defineOptions({ name: 'HomeView' });
import PeriodGrid from './HomeView/PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';

const dataStore = useDataStore();

const {
  loading,
  error,
  retryLoad,
  parentStack,
  currentPeriod,
  currentStoryId,
  displayedPeriods,
  storyEvents,
  breadcrumb,
  storySuggestions,
  currentStoryBounds,
  loadInitialData,
  openStory,
  handlePeriodClick,
  handleEventClick,
  goBack,
  selectStory,
  navigateToBreadcrumb,
} = useHomeNavigation();

const route = useRoute();
const routeError = ref('');
let initialized = false;
let consumedStory: string | null = null;
watch([() => route.query.story, () => route.name], () => {
  if (route.name !== 'timeline') return;
  routeError.value = '';
  try {
    const storyId = readStoryTarget(route.query.story);
    if (initialized && storyId === consumedStory) return;
    const hadStory = consumedStory !== null;
    consumedStory = storyId;
    initialized = true;
    if (storyId) void openStory(storyId);
    else if (hadStory) void openStory('1');
    else void loadInitialData(undefined, true);
  } catch (cause) {
    routeError.value = cause instanceof Error ? cause.message : 'La frise demandée est invalide.';
  }
}, { immediate: true });

let activatedOnce = false;
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

.home-view__timeline {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
