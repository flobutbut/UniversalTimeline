<template>
  <div class="geological-periods">
    <h2 class="title">Périodes Géologiques</h2>
    
    <div class="controls">
      <div class="controls-left">
        <div class="back-button-container">
          <BackButton
            v-if="navigationHistory.length > 0"
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
      <template v-if="currentPeriod">
        <GeologicalPeriodCard
          v-for="child in currentPeriod.children"
          :key="child.id"
          :period="child"
          :selected="false"
          @click="selectPeriod(child)"
        />
      </template>
      <template v-else>
        <GeologicalPeriodCard
          v-for="period in periods"
          :key="period.id"
          :period="period"
          :selected="false"
          @click="selectPeriod(period)"
        />
      </template>
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
const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedLanguage = ref('fr');
const navigationHistory = ref<{ id: string; label: string }[]>([]);
const currentPeriod = ref<Period | null>(null);

const fetchPeriods = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    if (navigationHistory.value.length > 0) {
      // Si on a une période courante, on charge ses enfants
      const children = await service.getChildren(navigationHistory.value[navigationHistory.value.length - 1].id, {
        language: selectedLanguage.value
      });
      
      // On met à jour la période courante avec ses enfants
      currentPeriod.value = periods.value.find(p => p.id === navigationHistory.value[navigationHistory.value.length - 1].id) || null;
      if (currentPeriod.value) {
        currentPeriod.value.children = children;
        currentPeriod.value.childrenPreloaded = true;
      }
    } else {
      // Sinon, on charge les éons principaux
      periods.value = await service.getMainEons({
        language: selectedLanguage.value
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
    error.value = navigationHistory.value.length > 0 
      ? `Erreur lors du chargement des sous-périodes: ${errorMessage}`
      : `Erreur lors du chargement des éons principaux: ${errorMessage}`;
    console.error('Erreur lors du chargement des périodes:', err);
  } finally {
    loading.value = false;
  }
};

const navigateToPeriod = async (period: Period) => {
  try {
    // Ajouter la période à l'historique
    navigationHistory.value.push({
      id: period.id,
      label: period.label
    });
    
    // Mettre à jour la période courante
    currentPeriod.value = period;
    
    // Charger les sous-périodes
    await loadChildren(period);
  } catch (err) {
    console.error('Erreur lors de la navigation:', err);
    error.value = 'Erreur lors de la navigation';
  }
};

const goBack = async () => {
  if (navigationHistory.value.length > 0) {
    // Retirer la dernière période de l'historique
    navigationHistory.value.pop();
    
    // Mettre à jour la période courante
    if (navigationHistory.value.length > 0) {
      const previousPeriod = navigationHistory.value[navigationHistory.value.length - 1];
      currentPeriod.value = periods.value.find(p => p.id === previousPeriod.id) || null;
    } else {
      currentPeriod.value = null;
    }
  }
};

const loadChildren = async (period: Period) => {
  if (period.childrenPreloaded) return;
  
  period.loading = true;
  error.value = null;
  
  try {
    const children = await service.getChildren(period.id, {
      language: selectedLanguage.value
    });
    
    period.children = children;
    period.childrenPreloaded = true;
  } catch (err) {
    console.error('Erreur lors du chargement des sous-périodes:', err);
    error.value = 'Erreur lors du chargement des sous-périodes';
  } finally {
    period.loading = false;
  }
};

const selectPeriod = async (period: Period) => {
  await navigateToPeriod(period);
};

onMounted(fetchPeriods);
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