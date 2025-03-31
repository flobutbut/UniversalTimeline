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
import { ref, computed, onMounted } from 'vue';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import BackButton from './BackButton.vue';
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