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
  if (loaded) return;
  loading.value = true;
  error.value = null;
  try {
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
    resetData
  };
} 