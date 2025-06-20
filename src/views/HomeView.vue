<template>
  <PeriodGrid 
    :periods="displayedPeriods"
    :loading="loading"
    :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
    :current-period="currentPeriod"
    @period-click="handlePeriodClick"
    @go-back="goBack"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PeriodGrid from './HomeView/PeriodGrid.vue'
import { WikidataQueryService, StoryService } from '../services'
import type { Period } from '../types/geological'

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
      console.log(`[HomeView] Story Planète Terre chargée:`, {
        id: story.id,
        label: story.label,
        childrenCount: story.children.length,
        children: story.children.map(child => ({
          id: child.id,
          label: child.label
        }))
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
  // Charger la story Planète Terre
  console.log(`[HomeView] Montage du composant - Chargement initial`);
  loading.value = true
  error.value = null
  try {
    const story = await storyService.loadPlanetEarth()
    console.log(`[HomeView] Story Planète Terre chargée initialement:`, {
      id: story.id,
      label: story.label,
      childrenCount: story.children.length,
      children: story.children.map(child => ({
        id: child.id,
        label: child.label
      }))
    });
    displayedPeriods.value = story.children
  } catch (e) {
    console.error(`[HomeView] Erreur lors du chargement initial:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
})
</script> 