<template>
  <div class="home-view">
    <PeriodGrid
      :periods="displayedPeriods"
      :events="storyEvents"
      :loading="loading"
      :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
      :current-period="currentPeriod"
      @period-click="handlePeriodClick"
      @go-back="goBack"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import PeriodGrid from './HomeView/PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';

const {
  loading,
  parentStack,
  currentPeriod,
  displayedPeriods,
  storyEvents,
  loadInitialData,
  handlePeriodClick,
  goBack,
} = useHomeNavigation();

onMounted(loadInitialData);
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
</style>
