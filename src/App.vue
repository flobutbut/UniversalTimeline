<script setup lang="ts">
import GeologicalPeriods from './components/GeologicalPeriods.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import BackButton from './components/BackButton.vue'
import { ref, onMounted } from 'vue'
import { WikidataTimelineService } from './services'
import type { Period } from './types/geological'

const timelineService = WikidataTimelineService.getInstance()
const currentPeriod = ref<Period | null>(null)
const displayedPeriods = ref<Period[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentLanguage = ref('fr')

const handlePeriodClick = async (period: Period) => {
  currentPeriod.value = period
  await loadChildren(period.id)
}

const loadChildren = async (parentId: string) => {
  loading.value = true
  error.value = null
  try {
    const period = await timelineService.loadPeriod(parentId)
    displayedPeriods.value = period.children
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const goBack = async () => {
  if (!currentPeriod.value) return
  const parentId = currentPeriod.value.id
  currentPeriod.value = null
  await loadChildren(parentId)
}

onMounted(async () => {
  await loadChildren('Q123456') // ID de la racine
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1 class="header-title">Timeline Géologique</h1>
        <LanguageSelector v-model="currentLanguage" />
      </div>
    </header>

    <main class="main-content">
      <BackButton v-if="currentPeriod" @click="goBack" />
      <GeologicalPeriods
        :periods="displayedPeriods"
        :loading="loading"
        :error="error"
        @period-click="handlePeriodClick"
      />
    </main>
  </div>
</template>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  color: #2c3e50;
  font-size: 2.5em;
  margin: 0;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f0f2f5;
}
</style>
