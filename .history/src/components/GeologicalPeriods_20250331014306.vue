<template>
  <div class="geological-periods">
    <div class="navigation-header">
      <button 
        v-if="navigationStack.length > 0" 
        class="back-button"
        @click="goBack"
      >
        <i class="fas fa-arrow-left"></i>
        Retour
      </button>
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
import { ref, computed, onMounted } from 'vue';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import type { Period, SimplePeriod } from '../types/geological';

const service = WikidataTimelineService.getInstance();
const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedPeriod = ref<Period | null>(null);
const loadingPeriods = ref<Record<string, boolean>>({});
const navigationStack = ref<Period[]>([]);

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

const fetchPeriods = async (parentId?: string) => {
  loading.value = true;
  error.value = null;
  
  try {
    const options = {
      language: 'fr',
      parentId
    };
    
    const result = parentId 
      ? await service.getChildren(parentId, options)
      : await service.getMainEons(options);
      
    periods.value = result.map(transformToPeriod);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des périodes';
    console.error('Erreur:', err);
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: Period) => {
  if (!period.hasChildren) return;
  
  selectedPeriod.value = period;
  loadingPeriods.value[period.id] = true;
  
  try {
    const children = await service.getChildren(period.id, { language: 'fr' });
    navigationStack.value.push(period);
    periods.value = children.map(transformToPeriod);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des sous-périodes';
    console.error('Erreur:', err);
  } finally {
    loadingPeriods.value[period.id] = false;
  }
};

const goBack = () => {
  if (navigationStack.value.length === 0) return;
  
  navigationStack.value.pop();
  const parent = navigationStack.value[navigationStack.value.length - 1];
  
  if (parent) {
    fetchPeriods(parent.id);
  } else {
    fetchPeriods();
  }
  
  selectedPeriod.value = null;
};

const retryLoading = () => {
  if (navigationStack.value.length > 0) {
    const parent = navigationStack.value[navigationStack.value.length - 1];
    fetchPeriods(parent.id);
  } else {
    fetchPeriods();
  }
};

onMounted(() => {
  fetchPeriods();
});
</script>

<style scoped>
.periods-container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.navigation-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.back-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.error-message {
  padding: 1rem;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 1rem;
}

.error-message button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.error-message button:hover {
  background-color: #dc2626;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style> 