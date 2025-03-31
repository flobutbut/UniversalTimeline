<template>
  <div class="geological-periods">
    <!-- En-tête avec navigation -->
    <div class="header">
      <div class="navigation">
        <button 
          v-if="currentLevel > 0" 
          @click="goBack"
          class="back-button"
        >
          <span class="icon">←</span>
          Retour
        </button>
        <button 
          v-if="currentLevel > 0" 
          @click="goToRoot"
          class="root-button"
        >
          <span class="icon">⌂</span>
          Accueil
        </button>
      </div>
      
      <!-- Fil d'Ariane -->
      <div class="breadcrumb">
        <template v-for="(period, index) in navigationHistory" :key="period.id">
          <span 
            v-if="index > 0" 
            class="separator"
          >
            /
          </span>
          <span 
            class="period-name"
            :class="{ 'current': index === currentLevel - 1 }"
          >
            {{ period.label }}
          </span>
        </template>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      <span class="icon">⚠️</span>
      {{ error }}
      <button @click="fetchPeriods" class="retry-button">
        Réessayer
      </button>
    </div>

    <!-- Grille des périodes -->
    <div v-else class="periods-grid">
      <GeologicalPeriodCard
        v-for="period in periods"
        :key="period.id"
        :period="period"
        :selected="selectedPeriod?.id === period.id"
        @click="selectPeriod(period)"
      />
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Chargement...</span>
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
    if (parentId) {
      // Si on a un ID parent, on charge ses enfants
      const response = await service.getChildren(parentId);
      periods.value = response;
    } else {
      // Sinon, on charge les éons principaux
      periods.value = await service.getMainEons();
    }
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
  padding: 1rem;
}

.header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.navigation {
  display: flex;
  gap: 1rem;
}

.back-button,
.root-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover,
.root-button:hover {
  background-color: #e0e0e0;
}

.icon {
  font-size: 1.2em;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9em;
  color: #666;
}

.separator {
  color: #999;
}

.period-name {
  color: #333;
  cursor: pointer;
}

.period-name.current {
  font-weight: bold;
  color: #000;
}

.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #fff3f3;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #d32f2f;
  margin-bottom: 1rem;
}

.retry-button {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background-color: #ffebee;
  color: #d32f2f;
  cursor: pointer;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
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