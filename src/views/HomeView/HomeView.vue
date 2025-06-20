<script setup lang="ts">
import { onMounted } from 'vue';
import PeriodGrid from './PeriodGrid.vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';

// Utilisation du composable
const {
  state,
  handlePeriodClick,
  goBack,
  loadInitialData
} = useHomeNavigation();

// Charger les données au montage du composant
onMounted(() => {
  loadInitialData();
});
</script>

<template>
  <div class="home-view">
    <PeriodGrid 
      :periods="state.displayedPeriods"
      :loading="state.loading"
      :parent-period="state.parentStack.length > 0 ? state.parentStack[state.parentStack.length - 1] : null"
      :current-period="state.currentPeriod"
      @period-click="handlePeriodClick"
      @go-back="goBack"
    />
  </div>
</template>

<style scoped>
.home-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background);
}
</style> 