import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import type { ListPeriod, ListEvent } from '@/types/database';

/** ID de la story "Univers moderne" utilisée comme point d'entrée de la timeline. */
const ENTRY_STORY_ID = '1';

export function useHomeNavigation() {
  const dataStore = useDataStore();
  const { periods, events } = storeToRefs(dataStore);

  const loading = ref(false);
  const error = ref<string | null>(null);
  const parentStack = ref<ListPeriod[]>([]);
  const currentPeriod = ref<ListPeriod | null>(null);
  const displayedPeriods = ref<ListPeriod[]>([]);
  const storyEvents = ref<ListEvent[]>([]);

  /**
   * Filtre les événements du store global selon les bornes temporelles de la période.
   * Utilise dateYearsBP pour la comparaison — cohérent avec startYearsBP/endYearsBP.
   */
  function eventsForPeriod(period: ListPeriod | null): ListEvent[] {
    if (!period) return [];
    const start = period.startYearsBP ?? Infinity;
    const end   = period.endYearsBP   ?? 0;
    return events.value.filter(e => {
      const bp = e.dateYearsBP ?? 0;
      return bp <= start && bp >= end;
    });
  }

  // ─── Chargement initial ────────────────────────────────────────────────────

  const loadInitialData = async () => {
    loading.value = true;
    error.value = null;
    try {
      // 1. Charger tous les événements en parallèle (non-bloquant pour l'affichage)
      dataStore.ensureEventsLoaded().then(() => {
        storyEvents.value = eventsForPeriod(currentPeriod.value);
      });

      // 2. Récupérer les périodes de la story "Univers moderne"
      const storyPeriods = await dataStore.ensureStoryPeriodsLoaded(ENTRY_STORY_ID);

      if (storyPeriods.length === 0) {
        // Fallback : afficher les périodes racines
        await dataStore.ensureRootsLoaded();
        displayedPeriods.value = dataStore.rootPeriods ?? [];
        return;
      }

      // 3. Utiliser la première période de la story comme contexte parent
      //    (ex. "Terre") et afficher ses enfants directs
      const entryPeriod = storyPeriods[0];
      currentPeriod.value = entryPeriod;
      displayedPeriods.value = await dataStore.ensureChildrenLoaded(entryPeriod.id);
      storyEvents.value = eventsForPeriod(currentPeriod.value);
    } catch (e: any) {
      error.value = e?.message || 'Erreur lors du chargement initial';
    } finally {
      loading.value = false;
    }
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const handlePeriodClick = async (period: ListPeriod) => {
    if (!period.hasChildren) return;

    if (currentPeriod.value) {
      parentStack.value.push(currentPeriod.value);
    }
    currentPeriod.value = period;
    loading.value = true;
    error.value = null;
    try {
      displayedPeriods.value = await dataStore.ensureChildrenLoaded(period.id);
      storyEvents.value = eventsForPeriod(period);
    } catch (e: any) {
      error.value = e?.message || 'Erreur lors du chargement';
    } finally {
      loading.value = false;
    }
  };

  const goBack = async () => {
    const parent = parentStack.value.pop();
    if (!parent) {
      // Retour à la racine : recharger l'état initial
      parentStack.value = [];
      currentPeriod.value = null;
      await loadInitialData();
      return;
    }
    currentPeriod.value = parent;
    // Les enfants sont déjà dans le store
    displayedPeriods.value = periods.value.filter(p => p.parentId === parent.id);
    storyEvents.value = eventsForPeriod(parent);
  };

  return {
    loading,
    error,
    parentStack,
    currentPeriod,
    displayedPeriods,
    storyEvents,
    loadInitialData,
    handlePeriodClick,
    goBack,
  };
}
