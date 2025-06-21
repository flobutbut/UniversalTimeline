<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '@/components/Header.vue'
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue'
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue'
import GraphView from '@/views/GraphView/GraphView.vue'
import Toast from '@/components/Toast.vue'
import ConfirmModal from '@/components/base/ConfirmModal.vue'
import { WikidataQueryService, StoryService } from '@/services'
import type { Period } from '@/types/geological'

const route = useRoute()
const currentView = ref<'timeline' | 'database' | 'graph'>('timeline')

// Mettre à jour currentView quand la route change
watch(() => route.path, (newPath) => {
  if (newPath === '/database') {
    currentView.value = 'database'
  } else if (newPath === '/graph') {
    currentView.value = 'graph'
  } else {
    currentView.value = 'timeline'
  }
}, { immediate: true })

const handleViewChange = (view: 'timeline' | 'database' | 'graph') => {
  currentView.value = view
}

const timelineService = WikidataQueryService.getInstance()
const storyService = StoryService.getInstance()
const parentStack = ref<Period[]>([])
const currentPeriod = ref<Period | null>(null)
const displayedPeriods = ref<Period[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const toast = ref<InstanceType<typeof Toast> | null>(null)
const confirmModal = ref<InstanceType<typeof ConfirmModal> | null>(null)

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
      console.log('[App] Story Planète Terre brute:', story);
      console.log(`[App] Story Planète Terre chargée:`, {
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
  console.log(`[App] Montage du composant - Chargement initial`);
  loading.value = true
  error.value = null
  try {
    const story = await storyService.loadPlanetEarth()
    console.log('[App] Story Planète Terre brute:', story);
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
    console.error(`[App] Erreur lors du chargement initial:`, e);
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
})

// Exposer le toast pour qu'il soit accessible globalement
window.toast = {
  show: (message: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 3000) => {
    toast.value?.show(message, type, duration)
  },
  hide: () => {
    toast.value?.hide()
  }
}

// Pour la compatibilité ascendante, on garde window.showToast
window.showToast = window.toast.show;

// Exposer la modale de confirmation
window.showConfirm = async (title: string, message: string): Promise<boolean> => {
  if (confirmModal.value) {
    return await confirmModal.value.show(title, message);
  }
  // Fallback au cas où la modale n'est pas prête
  console.warn('ConfirmModal non trouvé, retour à window.confirm');
  return window.confirm(`${title}\n${message}`);
};
</script>

<template>
  <div class="app">
    <Header 
      :current-view="currentView"
      @change-view="handleViewChange"
    />
    <main class="main-content">
      <PeriodGrid 
        v-if="currentView === 'timeline'"
        :periods="displayedPeriods"
        :loading="loading"
        :parent-period="parentStack.length > 0 ? parentStack[parentStack.length - 1] : null"
        :current-period="currentPeriod"
        @period-click="handlePeriodClick"
        @go-back="goBack"
      />
      <DatabaseView v-else-if="currentView === 'database'" />
      <GraphView v-else />
    </main>
    <Toast ref="toast" />
    <ConfirmModal ref="confirmModal" />
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
  min-height: 0;
  height: 100%;
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

.graph-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
