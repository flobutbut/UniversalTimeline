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
      Chargement...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
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
const periods = ref<Period[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedLanguage = ref('fr');
const currentParent = ref<string | null>(null);
const selectedPeriod = ref<Period | null>(null);

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
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
};

const selectPeriod = async (period: Period) => {
  selectedPeriod.value = period;
  
  if (!period.childrenPreloaded) {
    period.loading = true;
    try {
      const children = await service.getChildren(period.id, {
        language: selectedLanguage.value
      });
      period.children = children;
      period.childrenPreloaded = true;
    } catch (err) {
      console.error(`Erreur lors du chargement des enfants de ${period.id}:`, err);
    } finally {
      period.loading = false;
    }
  }
  
  currentParent.value = period.id;
  await fetchPeriods();
};

const goBack = () => {
  currentParent.value = null;
  selectedPeriod.value = null;
  fetchPeriods();
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

.loading, .error {
  text-align: center;
  padding: 20px;
}

.error {
  color: #f44336;
}

.periods-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px 0;
}
</style> 