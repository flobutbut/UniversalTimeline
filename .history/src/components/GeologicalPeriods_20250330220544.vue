<template>
  <div class="geological-periods">
    <h2 class="title">Périodes Géologiques</h2>
    
    <div class="controls">
      <div class="controls-left">
        <div class="back-button-container">
          <BackButton
            v-if="currentParent"
            @click="goBack"
          />
        </div>
      </div>
      <div class="controls-right">
        <LanguageSelector
          v-model="selectedLanguage"
          @update:modelValue="fetchPeriods"
        />
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Chargement...</div>
    </div>
    
    <div v-else-if="error" class="error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ error }}</div>
      <button class="retry-button" @click="fetchPeriods">
        Réessayer
      </button>
    </div>
    
    <div v-else class="periods-list">
      <GeologicalPeriodCard
        v-for="period in periods"
        :key="period.id"
        :period="period"
        :is-selected="selectedPeriod?.id === period.id"
        @click="selectPeriod(period)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import BackButton from './BackButton.vue';
import LanguageSelector from './LanguageSelector.vue';
import type { Period, SimplePeriod } from '../types/geological';

const service = WikidataTimelineService.getInstance();
const periods = ref<SimplePeriod[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedLanguage = ref('fr');
const currentParent = ref<string | null>(null);
const selectedPeriod = ref<SimplePeriod | null>(null);
const navigationHistory = ref<SimplePeriod[]>([]);
const currentLevel = ref(0);

const fetchPeriods = async (parentId?: string) => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await service.getChildren(parentId);
    periods.value = response;
  } catch (err) {
    console.error('Erreur lors du chargement des périodes:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des périodes';
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: SimplePeriod) => {
  if (!period.hasChildren) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // Ajouter la période à l'historique
    navigationHistory.value = navigationHistory.value.slice(0, currentLevel.value);
    navigationHistory.value.push(period);
    currentLevel.value++;
    
    // Charger les sous-périodes
    const children = await service.getChildren(period.id);
    periods.value = children;
    selectedPeriod.value = period;
  } catch (err) {
    console.error('Erreur lors du chargement des sous-périodes:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des sous-périodes';
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  if (currentLevel.value > 0) {
    currentLevel.value--;
    const previousPeriod = navigationHistory.value[currentLevel.value];
    if (previousPeriod) {
      selectedPeriod.value = previousPeriod;
      fetchPeriods(previousPeriod.id);
    } else {
      // Si on est revenu au début, charger les éons principaux
      fetchPeriods();
      selectedPeriod.value = null;
    }
  }
};

const goToRoot = () => {
  currentLevel.value = 0;
  navigationHistory.value = [];
  selectedPeriod.value = null;
  fetchPeriods();
};

onMounted(() => {
  fetchPeriods();
});
</script>

<style scoped>
.geological-periods {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.title {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.8em;
}

.controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  align-items: center;
}

.controls-left {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.back-button-container {
  display: flex;
  justify-content: flex-start;
  width: 100%;
}

.controls-right {
  margin-left: auto;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  color: #666;
  font-size: 1.1em;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  background-color: #fff5f5;
  border-radius: 8px;
  margin: 20px 0;
}

.error-icon {
  font-size: 2em;
  margin-bottom: 10px;
}

.error-message {
  color: #d32f2f;
  margin-bottom: 20px;
  line-height: 1.5;
}

.retry-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #d32f2f;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.periods-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px 0;
}
</style> 