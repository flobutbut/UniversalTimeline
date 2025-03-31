<template>
  <div class="geological-periods">
    <div class="navigation-stack" v-if="navigationStack.length > 0">
      <button class="back-button" @click="goBack">
        ← Retour
      </button>
      <div class="breadcrumb">
        <span v-for="(period, index) in navigationStack" :key="period.id">
          {{ period.label }}
          <span v-if="index < navigationStack.length - 1">/</span>
        </span>
      </div>
    </div>

    <div class="periods-grid">
      <GeologicalPeriodCard
        v-for="period in currentPeriods"
        :key="period.id"
        :title="period.label"
        :start-date="period.startDate"
        :end-date="period.endDate"
        :locations="period.location"
        :has-children="period.hasChildren"
        :child-count="period.childCount"
        :is-loading="period.loading"
        :error="period.error"
        @click="selectPeriod(period)"
      />
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Chargement des périodes...</span>
    </div>

    <div v-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button class="retry-button" @click="fetchPeriods">Réessayer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { wikidataTimelineService } from '../services/wikidataTimeline';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import type { Period } from '../types/geological';

const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const navigationStack = ref<Period[]>([]);

const currentPeriods = computed(() => {
  if (navigationStack.value.length === 0) {
    return periods.value;
  }
  const currentPeriod = navigationStack.value[navigationStack.value.length - 1];
  return currentPeriod.children || [];
});

const fetchPeriods = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await wikidataTimelineService.getMainEons();
    periods.value = response;
  } catch (err) {
    error.value = 'Erreur lors du chargement des périodes principales';
    console.error('Erreur:', err);
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: Period) => {
  if (!period.hasChildren) return;
  
  period.loading = true;
  period.error = null;
  
  try {
    const children = await wikidataTimelineService.getChildren(period.id);
    period.children = children;
    navigationStack.value.push(period);
  } catch (err) {
    period.error = 'Erreur lors du chargement des sous-périodes';
    console.error('Erreur:', err);
  } finally {
    period.loading = false;
  }
};

const goBack = () => {
  navigationStack.value.pop();
};

onMounted(() => {
  fetchPeriods();
});
</script>

<style scoped>
.geological-periods {
  padding: 1rem;
}

.navigation-stack {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.back-button {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e3f2fd;
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  color: #666;
}

.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #666;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #e74c3c;
}

.retry-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #c0392b;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 