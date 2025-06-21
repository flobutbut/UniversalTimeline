import { ref } from 'vue';
import { WikidataQueryService, StoryService } from '@/services';
import type { Period } from '@/types/geological';
import { useDatabaseDataStore } from './useDatabaseDataStore';

export interface HomeNavigationState {
  loading: boolean;
  error: string | null;
  parentStack: Period[];
  currentPeriod: Period | null;
  displayedPeriods: Period[];
}

export function useHomeNavigation() {
  const timelineService = WikidataQueryService.getInstance();
  const storyService = StoryService.getInstance();
  const { ensureDataLoaded: sharedEnsureDataLoaded } = useDatabaseDataStore();

  // États réactifs
  const state = ref<HomeNavigationState>({
    loading: false,
    error: null,
    parentStack: [],
    currentPeriod: null,
    displayedPeriods: []
  });

  // Fonction pour charger une période
  const loadPeriod = async (periodId: string) => {
    console.log(`[HomeView] Chargement de la période:`, periodId);
    state.value.loading = true;
    state.value.error = null;
    try {
      const period = await timelineService.loadPeriod(periodId);
      console.log(`[HomeView] Période chargée:`, {
        id: period.id,
        label: period.label,
        childrenCount: period.children.length,
        children: period.children.map(child => ({
          id: child.id,
          label: child.label
        }))
      });
      state.value.displayedPeriods = period.children;
    } catch (e) {
      console.error(`[HomeView] Erreur lors du chargement de la période:`, e);
      state.value.error = e instanceof Error ? e.message : 'Une erreur est survenue';
    } finally {
      state.value.loading = false;
    }
  };

  // Fonction pour gérer le clic sur une période
  const handlePeriodClick = async (period: Period) => {
    if (state.value.currentPeriod) {
      state.value.parentStack.push(state.value.currentPeriod);
    }
    state.value.currentPeriod = period;
    await loadPeriod(period.id);
  };

  // Fonction pour retourner en arrière
  const goBack = async () => {
    if (state.value.parentStack.length === 0) {
      // Retour à la racine
      console.log(`[HomeView] Retour à la racine - Chargement de la story Planète Terre`);
      state.value.loading = true;
      state.value.error = null;
      try {
        const story = await storyService.loadPlanetEarth();
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
        state.value.displayedPeriods = story.children;
        state.value.currentPeriod = null;
        state.value.parentStack = [];
      } catch (e) {
        console.error(`[HomeView] Erreur lors du chargement de la story:`, e);
        state.value.error = e instanceof Error ? e.message : 'Une erreur est survenue';
      } finally {
        state.value.loading = false;
      }
      return;
    }
    const parent = state.value.parentStack.pop();
    if (parent) {
      state.value.currentPeriod = parent;
      await loadPeriod(parent.id);
    }
  };

  // Fonction pour charger les données initiales
  const loadInitialData = async () => {
    await sharedEnsureDataLoaded();
  };

  return {
    // États
    state: state.value,
    
    // Fonctions de navigation
    handlePeriodClick,
    goBack,
    loadPeriod,
    loadInitialData
  };
} 