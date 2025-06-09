<script setup lang="ts">
import BackButton from './components/BackButton.vue'
import Header from './components/Header.vue'
import PeriodGrid from './components/PeriodGrid.vue'
import Toast from './components/Toast.vue'
import { ref, onMounted } from 'vue'
import { WikidataQueryService, StoryService } from './services'
import type { Period } from './types/geological'
import { MAIN_STORY } from './types/geological'

const timelineService = WikidataQueryService.getInstance()
const storyService = StoryService.getInstance()
const parentStack = ref<Period[]>([])
const currentPeriod = ref<Period | null>(null)
const displayedPeriods = ref<Period[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentLanguage = ref('fr')
const selectedLanguage = ref('fr')
const toast = ref<InstanceType<typeof Toast> | null>(null)

const handlePeriodClick = async (period: Period) => {
  if (currentPeriod.value) {
    parentStack.value.push(currentPeriod.value)
  }
  currentPeriod.value = period
  await loadPeriod(period.id)
}

const loadPeriod = async (periodId: string) => {
  console.log(`[App] Chargement de la période:`, periodId);
  loading.value = true
  error.value = null
  try {
    const period = await timelineService.loadPeriod(periodId)
    console.log(`[App] Période chargée:`, {
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
    console.error(`[App] Erreur lors du chargement de la période:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const goBack = async () => {
  if (parentStack.value.length === 0) {
    // Retour à la racine
    console.log(`[App] Retour à la racine - Chargement de la story Planète Terre`);
    loading.value = true
    error.value = null
    try {
      const story = await storyService.loadPlanetEarth()
      console.log(`[App] Story Planète Terre chargée:`, {
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
      console.error(`[App] Erreur lors du chargement de la story:`, e);
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
  console.log(`[App] Montage du composant - Chargement initial`);
  loading.value = true
  error.value = null
  try {
    const story = await storyService.loadPlanetEarth()
    console.log(`[App] Story Planète Terre chargée initialement:`, {
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
    console.error(`[App] Erreur lors du chargement initial:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
})

// Exposer le toast pour qu'il soit accessible globalement
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  toast.value?.show(message, type)
}

// Exposer la fonction showToast globalement
window.showToast = showToast
</script>

<template>
  <div class="app">
    <Header 
      v-model="selectedLanguage"
    />
    <main class="main-content">
      <PeriodGrid 
        :periods="displayedPeriods"
        :loading="loading"
        :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
        :current-period="currentPeriod"
        @period-click="handlePeriodClick"
        @go-back="goBack"
      />
    </main>
    <Toast ref="toast" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-background);
  color: var(--color-text);
}

.main-content {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background);
}

.main-content > * {
  height: 100%;
  min-height: 0;
}

:global(body) {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--color-background);
  color: var(--color-text);
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
}
</style>
