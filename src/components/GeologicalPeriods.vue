<template>
  <div class="geological-periods">
    <div class="navigation-header">
      <BackButton 
        v-if="navigationStack.length > 0" 
        @click="goBack"
      />
      <h2>{{ currentTitle }}</h2>
    </div>

    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      {{ error }}
      <button class="retry-button" @click="retryLoading">
        Réessayer
      </button>
    </div>

    <div v-else-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Chargement des périodes...</span>
    </div>

    <div v-else class="periods-grid">
      <GeologicalPeriodCard
        v-for="period in periods"
        :key="period.id"
        :period="period"
        :is-selected="selectedPeriod?.id === period.id"
        :loading="loadingPeriods[period.id]"
        @select="selectPeriod"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import { ProgressiveLoadingServiceImpl } from '../services/ProgressiveLoadingService';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import BackButton from './BackButton.vue';
import type { Period, SimplePeriod } from '../types/geological';

const timelineService = WikidataTimelineService.getInstance();
const loadingService = ProgressiveLoadingServiceImpl.getInstance();
const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedPeriod = ref<Period | null>(null);
const loadingPeriods = ref<Record<string, boolean>>({});
const navigationStack = ref<Period[]>([]);

// Observer pour le chargement progressif
let observer: IntersectionObserver | null = null;

const transformToPeriod = (simplePeriod: SimplePeriod): Period => ({
  ...simplePeriod,
  categoryLabels: simplePeriod.categoryIds,
  childrenPreloaded: false,
  children: [],
  loading: false
});

const currentTitle = computed(() => {
  if (navigationStack.value.length === 0) {
    return 'Éons géologiques';
  }
  const current = navigationStack.value[navigationStack.value.length - 1];
  return current.label;
});

const setupIntersectionObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const periodId = entry.target.getAttribute('data-period-id');
        if (periodId) {
          console.log(`[ProgressiveLoading] Carte ${periodId} visible dans la vue`);
          loadingService.updatePreloadState(periodId, entry.target as HTMLElement);
          const state = loadingService.getLoadingState(periodId);
          console.log(`[ProgressiveLoading] État de chargement pour ${periodId}:`, state);
        }
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  });
};

const observePeriodCards = () => {
  const cards = document.querySelectorAll('.period-card');
  console.log(`[ProgressiveLoading] Observation de ${cards.length} cartes`);
  cards.forEach(card => {
    observer?.observe(card);
  });
};

const fetchPeriods = async (parentId?: string) => {
  console.log(`[Timeline] Chargement des périodes${parentId ? ` pour le parent ${parentId}` : ''}`);
  loading.value = true;
  error.value = null;
  
  try {
    const options = {
      language: 'fr',
      parentId
    };
    
    const result = parentId 
      ? await timelineService.getChildren(parentId, options)
      : await timelineService.getMainEons(options);
      
    console.log(`[Timeline] ${result.length} périodes chargées`);
    periods.value = result.map(transformToPeriod);
    
    // Mettre à jour les états de chargement
    periods.value.forEach(period => {
      const state = loadingService.getLoadingState(period.id);
      loadingPeriods.value[period.id] = state.loading;
      console.log(`[ProgressiveLoading] État initial pour ${period.id}:`, state);
    });
    
    // Observer les nouvelles cartes
    nextTick(() => {
      observePeriodCards();
    });
  } catch (err) {
    console.error('[Timeline] Erreur lors du chargement:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des périodes';
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: Period) => {
  if (!period.hasChildren) return;
  
  console.log(`[Timeline] Sélection de la période ${period.id} (${period.label})`);
  selectedPeriod.value = period;
  loadingPeriods.value[period.id] = true;
  
  try {
    console.log(`[Timeline] Chargement des enfants pour ${period.id}`);
    const children = await timelineService.getChildren(period.id, { language: 'fr' });
    console.log(`[Timeline] ${children.length} enfants chargés pour ${period.id}`);
    
    navigationStack.value.push(period);
    periods.value = children.map(transformToPeriod);
    
    // Mettre à jour les états de chargement
    periods.value.forEach(child => {
      const state = loadingService.getLoadingState(child.id);
      loadingPeriods.value[child.id] = state.loading;
      console.log(`[ProgressiveLoading] État initial pour l'enfant ${child.id}:`, state);
    });
    
    // Observer les nouvelles cartes
    nextTick(() => {
      observePeriodCards();
    });
  } catch (err) {
    console.error('[Timeline] Erreur lors du chargement des enfants:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des sous-périodes';
  } finally {
    loadingPeriods.value[period.id] = false;
  }
};

const goBack = () => {
  if (navigationStack.value.length === 0) return;
  
  const currentPeriod = navigationStack.value[navigationStack.value.length - 1];
  console.log(`[Navigation] Retour depuis ${currentPeriod.id} (${currentPeriod.label})`);
  
  navigationStack.value.pop();
  const parent = navigationStack.value[navigationStack.value.length - 1];
  
  if (parent) {
    console.log(`[Navigation] Chargement des enfants de ${parent.id}`);
    fetchPeriods(parent.id);
  } else {
    console.log('[Navigation] Retour à la liste des éons');
    fetchPeriods();
  }
  
  selectedPeriod.value = null;
};

const retryLoading = () => {
  console.log('[Timeline] Tentative de rechargement');
  if (navigationStack.value.length > 0) {
    const parent = navigationStack.value[navigationStack.value.length - 1];
    console.log(`[Timeline] Rechargement depuis le parent ${parent.id}`);
    fetchPeriods(parent.id);
  } else {
    console.log('[Timeline] Rechargement depuis la racine');
    fetchPeriods();
  }
};

onMounted(() => {
  setupIntersectionObserver();
  fetchPeriods();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<style scoped>
.geological-periods {
  padding: 1rem;
}

.navigation-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.navigation-header h2 {
  color: #213547;
  margin: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  background-color: #ffebee;
  color: #c62828;
}

.retry-button {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background-color: #c62828;
  color: white;
  cursor: pointer;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: #213547;
}

.loading-container i {
  color: #2196f3;
}

.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
</style> 