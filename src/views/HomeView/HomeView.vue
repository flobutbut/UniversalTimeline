<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PeriodGrid from './PeriodGrid.vue'
import { WikidataQueryService, StoryService } from '@/services'
import type { Period } from '@/types/geological'

const timelineService = WikidataQueryService.getInstance()
const storyService = StoryService.getInstance()
const parentStack = ref<Period[]>([])
const currentPeriod = ref<Period | null>(null)
const displayedPeriods = ref<Period[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const handlePeriodClick = async (period: Period) => {
  if (currentPeriod.value) {
    parentStack.value.push(currentPeriod.value)
  }
  currentPeriod.value = period
  await loadPeriod(period.id)
}

const loadPeriod = async (periodId: string) => {
  console.log(`[HomeView] Chargement de la période:`, periodId);
  loading.value = true
  error.value = null
  try {
    const period = await timelineService.loadPeriod(periodId)
    console.log(`[HomeView] Période chargée:`, {
      id: period.id,
      label: period.label,
      childrenCount: period.children.length,
      children: period.children.map(child => ({
        id: child.id,
        label: child.label
      }))
    });
    displayedPeriods.value = period.children
  } catch (e) {
    console.error(`[HomeView] Erreur lors du chargement de la période:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const goBack = async () => {
  if (parentStack.value.length === 0) {
    // Retour à la racine
    console.log(`[HomeView] Retour à la racine - Chargement de la story Planète Terre`);
    loading.value = true
    error.value = null
    try {
      const story = await storyService.loadPlanetEarth()
      console.log('[HomeView] Story Planète Terre brute:', story);
      console.log(`[HomeView] Story Planète Terre chargée:`, {
        id: story.id,
        label: story.label,
        childrenCount: story.children ? story.children.length : 'undefined',
        children: story.children ? story.children.map(child => ({
          id: child.id,
          label: child.label
        })) : 'undefined'
      });
      displayedPeriods.value = story.children
      currentPeriod.value = null
      parentStack.value = []
    } catch (e) {
      console.error(`[HomeView] Erreur lors du chargement de la story:`, e);
      error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
    } finally {
      loading.value = false
    }
    return
  }
  const parent = parentStack.value.pop()
  if (parent) {
    currentPeriod.value = parent
    await loadPeriod(parent.id)
  }
}

onMounted(async () => {
  console.log(`[HomeView] Montage du composant - Chargement initial`);
  loading.value = true
  error.value = null
  try {
    const story = await storyService.loadPlanetEarth()
    console.log('[HomeView] Story Planète Terre brute:', story);
    // Si la story a des enfants, on les utilise
    if (story.children && Array.isArray(story.children) && story.children.length > 0) {
      displayedPeriods.value = story.children
    } else {
      // Sinon, on charge les éons principaux (ou une autre racine)
      const timelineService = WikidataQueryService.getInstance()
      const MAIN_EONS = ['Q104460', 'Q104168', 'Q104162', 'Q101313'] // IDs des éons principaux
      const mainEons = await Promise.all(MAIN_EONS.map(id => timelineService.loadPeriod(id)))
      displayedPeriods.value = mainEons.filter(Boolean)
    }
    console.log('displayedPeriods après fallback:', displayedPeriods.value);
  } catch (e) {
    console.error(`[HomeView] Erreur lors du chargement initial:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home-view">
    <PeriodGrid 
      :periods="displayedPeriods"
      :loading="loading"
      :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
      :current-period="currentPeriod"
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