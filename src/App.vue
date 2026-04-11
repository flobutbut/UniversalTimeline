<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import HomeView from '@/views/HomeView.vue'
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue'
import PeriodsView from '@/views/GraphView/Periods.vue'
import EventsView from '@/views/EventsView/EventsView.vue'
import DesignSystemView from '@/views/DesignSystemView/DesignSystemView.vue'
import Toast from '@/components/Toast.vue'
import ConfirmModal from '@/components/base/ConfirmModal.vue'
const route = useRoute()
const router = useRouter()
const currentView = ref<'timeline' | 'database' | 'graph' | 'events' | 'designSystem'>('timeline')

watch(() => route.path, (newPath) => {
  if (newPath === '/database') currentView.value = 'database'
  else if (newPath === '/graph') currentView.value = 'graph'
  else if (newPath === '/events') currentView.value = 'events'
  else if (newPath === '/design-system') currentView.value = 'designSystem'
  else currentView.value = 'timeline'
}, { immediate: true })

const pathForView = (view: typeof currentView.value): string => {
  switch (view) {
    case 'database': return '/database'
    case 'graph': return '/graph'
    case 'events': return '/events'
    case 'designSystem': return '/design-system'
    default: return '/'
  }
}

const handleViewChange = (view: typeof currentView.value) => {
  currentView.value = view
  router.push(pathForView(view))
}

const toast = ref<InstanceType<typeof Toast> | null>(null)
const confirmModal = ref<InstanceType<typeof ConfirmModal> | null>(null)

window.toast = {
  show: (message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) => {
    toast.value?.show(message, type, duration)
  },
  hide: () => { toast.value?.hide() }
}
window.showToast = window.toast.show

window.showConfirm = async (title: string, message: string): Promise<boolean> => {
  if (confirmModal.value) return await confirmModal.value.show(title, message)
  return window.confirm(`${title}\n${message}`)
}
</script>

<template>
  <div class="app">
    <Header
      :current-view="currentView"
      @change-view="handleViewChange"
    />
    <main class="main-content">
      <!-- v-show : garde l’instance (état useHomeNavigation) en changeant de vue -->
      <HomeView v-show="currentView === 'timeline'" />
      <DatabaseView v-if="currentView === 'database'" />
      <PeriodsView v-else-if="currentView === 'graph'" />
      <EventsView v-else-if="currentView === 'events'" />
      <DesignSystemView v-else-if="currentView === 'designSystem'" />
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
</style>
