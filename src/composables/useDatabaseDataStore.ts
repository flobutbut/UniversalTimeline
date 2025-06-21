import { ref } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import type { ListPeriod, ListEvent, ListStory } from '@/types/database';

const periods = ref<ListPeriod[]>([]);
const events = ref<ListEvent[]>([]);
const stories = ref<ListStory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let loaded = false;

async function loadInitialData() {
  if (loaded && periods.value.length > 0) {
    console.log('[DatabaseDataStore] Données déjà chargées, pas de rechargement');
    return;
  }
  
  loading.value = true;
  error.value = null;
  try {
    console.log('[DatabaseDataStore] Chargement des données depuis l\'API');
    await DatabaseViewService.getInstance().loadListData();
    periods.value = DatabaseViewService.getInstance().getPeriods();
    events.value = DatabaseViewService.getInstance().getEvents();
    stories.value = DatabaseViewService.getInstance().getStories();
    loaded = true;
  } catch (e: any) {
    error.value = e?.message || 'Erreur lors du chargement des données';
  } finally {
    loading.value = false;
  }
}

// Fonction pour s'assurer que les données sont chargées (sans recharger si déjà en cache)
async function ensureDataLoaded() {
  if (!loaded || periods.value.length === 0) {
    console.log('[DatabaseDataStore] Données non chargées, chargement nécessaire');
    await loadInitialData();
  } else {
    console.log('[DatabaseDataStore] Données déjà en cache, pas de chargement');
  }
}

function updatePeriods(newPeriods: ListPeriod[]) {
  periods.value = newPeriods;
}

function updateEvents(newEvents: ListEvent[]) {
  events.value = newEvents;
}

function updateStories(newStories: ListStory[]) {
  stories.value = newStories;
}

function resetData() {
  periods.value = [];
  events.value = [];
  stories.value = [];
  loaded = false;
}

export function useDatabaseDataStore() {
  return {
    periods,
    events,
    stories,
    loading,
    error,
    loadInitialData,
    ensureDataLoaded,
    updatePeriods,
    updateEvents,
    updateStories,
    resetData
  };
} 