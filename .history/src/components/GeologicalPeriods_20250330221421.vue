<template>
  <div class="geological-periods">
    <!-- En-tête avec navigation -->
    <div class="header">
      <div class="navigation">
        <button 
          v-if="navigationStack.length > 0" 
          @click="goBack"
          class="back-button"
        >
          ← Retour
        </button>
        <h2>{{ currentTitle || 'Éons géologiques' }}</h2>
      </div>
      
      <!-- Sélecteur de langue -->
      <div class="language-selector">
        <select v-model="selectedLanguage">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Grille des périodes -->
    <div class="periods-grid">
      <GeologicalPeriodCard
        v-for="period in periods"
        :key="period.id"
        :period="period"
        :is-selected="selectedPeriod?.id === period.id"
        :loading="loadingChildren"
        @click="selectPeriod(period)"
      />
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des éons...
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
const currentParent = ref<string | null>(null);
const selectedPeriod = ref<Period | null>(null);
const navigationStack = ref<{ period: Period; children: Period[] }[]>([]);
const currentTitle = ref<string>('');
const loadingChildren = ref(false);

const fetchPeriods = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    if (currentParent.value) {
      // Si on a un parent, on charge ses enfants
      const children = await service.getChildren(currentParent.value, {
        language: selectedLanguage.value
      });
      
      // On met à jour la période parent avec ses enfants
      const parentPeriod = periods.value.find(p => p.id === currentParent.value);
      if (parentPeriod) {
        parentPeriod.children = children;
        parentPeriod.childrenPreloaded = true;
      }
    } else {
      // Sinon, on charge les éons principaux
      periods.value = await service.getMainEons({
        language: selectedLanguage.value
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
    error.value = currentParent.value 
      ? `Erreur lors du chargement des sous-périodes: ${errorMessage}`
      : `Erreur lors du chargement des éons principaux: ${errorMessage}`;
    console.error('Erreur lors du chargement des périodes:', err);
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: Period) => {
  if (!period.children.length) return;
  
  try {
    error.value = null;
    loadingChildren.value = true;
    console.log('Chargement des sous-périodes pour:', period);
    
    const children = await service.getChildren(period.id, {
      language: selectedLanguage.value
    });
    
    console.log('Sous-périodes chargées:', children);
    
    // Mettre à jour la pile de navigation
    navigationStack.value.push({
      period,
      children: periods.value
    });
    
    // Mettre à jour les périodes affichées avec les sous-périodes
    periods.value = children.map(child => ({
      ...child,
      categoryLabels: child.categoryIds, // Utiliser les IDs comme labels temporairement
      childrenPreloaded: false,
      children: [],
      loading: false
    }));
    
    // Mettre à jour la période sélectionnée
    selectedPeriod.value = period;
    
    // Mettre à jour le titre
    currentTitle.value = period.label;
    
  } catch (err) {
    console.error('Erreur lors du chargement des sous-périodes:', err);
    error.value = 'Erreur lors du chargement des sous-périodes';
  } finally {
    loadingChildren.value = false;
  }
};

const goBack = () => {
  if (navigationStack.value.length === 0) return;
  
  const previousState = navigationStack.value.pop();
  if (previousState) {
    periods.value = previousState.children;
    selectedPeriod.value = previousState.period;
    currentTitle.value = previousState.period.label;
  }
};

onMounted(fetchPeriods);
</script>

<style scoped>
.geological-periods {
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.language-selector select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.error-message {
  padding: 1rem;
  margin: 1rem 0;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}

.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style> 