<template>
  <div class="geological-periods">
    <div class="content-wrapper">
      <div class="navigation-header">
        <BackButton 
          v-if="navigationStack.length > 0" 
          :period="navigationStack[navigationStack.length - 1]"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import GeologicalPeriodCard from './GeologicalPeriodCard.vue';
import BackButton from './BackButton.vue';
import type { Period } from '../types/geological';
import { MAIN_EONS } from '../types/geological';

const timelineService = WikidataTimelineService.getInstance();
const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedPeriod = ref<Period | null>(null);
const loadingPeriods = ref<Record<string, boolean>>({});
const navigationStack = ref<Period[]>([]);

// Fonction pour extraire la date de début d'une période
const getStartDate = (period: Period): number => {
  const startDate = period.temporalData[0]?.startDate;
  if (!startDate) return 0;
  
  // Convertir la date en nombre (en millions d'années)
  const match = startDate.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

// Fonction pour trier les périodes chronologiquement
const sortPeriods = (periods: Period[]): Period[] => {
  return [...periods].sort((a, b) => {
    const dateA = getStartDate(a);
    const dateB = getStartDate(b);
    return dateB - dateA; // Tri décroissant (du plus récent au plus ancien)
  });
};

const currentTitle = computed(() => {
  if (navigationStack.value.length === 0) {
    return 'Éons géologiques';
  }
  const current = navigationStack.value[navigationStack.value.length - 1];
  return current.label;
});

const fetchPeriods = async (parentId?: string) => {
  console.log(`[Timeline] Chargement des périodes${parentId ? ` pour le parent ${parentId}` : ''}`);
  loading.value = true;
  error.value = null;
  
  try {
    if (parentId) {
      const parent = await timelineService.loadPeriod(parentId);
      periods.value = sortPeriods(parent.children);
    } else {
      // Charger les éons principaux
      const mainEons = await Promise.all([
        timelineService.loadPeriod(MAIN_EONS.PHANEROZOIC),  // Phanérozoïque
        timelineService.loadPeriod(MAIN_EONS.PROTEROZOIC),  // Protérozoïque
        timelineService.loadPeriod(MAIN_EONS.ARCHEAN),      // Archéen
        timelineService.loadPeriod(MAIN_EONS.HADEAN)        // Hadéen
      ]);
      periods.value = sortPeriods(mainEons);
    }
    
    // Mettre à jour les états de chargement
    periods.value.forEach(period => {
      loadingPeriods.value[period.id] = false;
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
    const loadedPeriod = await timelineService.loadPeriod(period.id);
    
    navigationStack.value.push(period);
    periods.value = sortPeriods(loadedPeriod.children);
    
    // Mettre à jour les états de chargement
    periods.value.forEach(child => {
      loadingPeriods.value[child.id] = false;
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

onUnmounted(() => {
  // Nettoyage si nécessaire
});
</script>

<style scoped>
.geological-periods {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  gap: 1rem;
}

.navigation-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  padding-left: 0;
}

.navigation-header h2 {
  color: #213547;
  margin: 0;
  padding-left: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 4px;
  background-color: #ffebee;
  color: #c62828;
  flex-shrink: 0;
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
  overflow-y: auto;
  padding-right: 0.5rem;
  min-height: 0;
  align-content: center;
}
</style> 