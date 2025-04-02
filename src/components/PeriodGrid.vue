<template>
  <div class="period-grid">
    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Chargement de la timeline...</span>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
      <button @click="retryLoading">Réessayer</button>
    </div>

    <div v-else-if="periods.length === 0" class="empty-message">
      Aucune période à afficher
    </div>

    <div v-else class="timeline-container">
      <div class="navigation-header">
        <BackButton 
          v-if="navigationStack.length > 0"
          :period="navigationStack[navigationStack.length - 1]"
          @click="goBack"
        />
      </div>
      <div class="timeline-line"></div>
      <div class="periods-container">
        <PeriodCard
          v-for="period in sortedPeriods"
          :key="period.id"
          :period="period"
          :is-selected="false"
          :loading="loadingPeriods[period.id]"
          class="timeline-card"
          :style="getPeriodStyles(period)"
          @click="selectPeriod(period)"
        />
      </div>
      <div class="events-container">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Period } from '../types/geological';
import { TimelineScalingService } from '../services/timelineScaling';
import { WikidataTimelineService } from '../services/wikidataTimeline';
import { MAIN_EONS } from '../types/geological';
import PeriodCard from './PeriodCard.vue';
import BackButton from './BackButton.vue';

const props = defineProps<{
  periods: Period[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'period-click', period: Period): void;
}>();

const scalingService = new TimelineScalingService();
const timelineService = WikidataTimelineService.getInstance();
const totalDuration = ref(0);
const startYears = ref(0);
const error = ref<string | null>(null);
const navigationStack = ref<Period[]>([]);
const loadingPeriods = ref<Record<string, boolean>>({});
const currentPeriods = ref<Period[]>(props.periods);

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

// Trier les périodes chronologiquement
const sortedPeriods = computed(() => {
  return sortPeriods(currentPeriods.value);
});

// Calculer les durées et positions quand les périodes changent
const updateTimelineScaling = () => {
  try {
    totalDuration.value = scalingService.calculateTotalDuration(currentPeriods.value);
    if (currentPeriods.value.length > 0) {
      // Utiliser la date de début de la période la plus récente comme référence
      startYears.value = Math.max(...currentPeriods.value.map(p => 
        scalingService.convertDateToYearsBeforePresent(p.temporalData[0]?.startDate || '0 ans')
      ));
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur lors du calcul des positions';
  }
};

// Surveiller les changements de périodes
watch(() => currentPeriods.value, updateTimelineScaling, { immediate: true });

// Surveiller les changements des props
watch(() => props.periods, (newPeriods) => {
  currentPeriods.value = newPeriods;
}, { immediate: true });

onMounted(() => {
  updateTimelineScaling();
});

const getPeriodStyles = (period: Period) => {
  return scalingService.calculatePeriodStyles(period, totalDuration.value, startYears.value);
};

const selectPeriod = async (period: Period) => {
  if (!period.hasChildren) return;
  
  console.log(`[Timeline] Sélection de la période ${period.id} (${period.label})`);
  loadingPeriods.value[period.id] = true;
  
  try {
    const loadedPeriod = await timelineService.loadPeriod(period.id);
    navigationStack.value.push(period);
    currentPeriods.value = loadedPeriod.children || [];
    emit('period-click', loadedPeriod);
  } catch (err) {
    console.error('[Timeline] Erreur lors du chargement des enfants:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des sous-périodes';
  } finally {
    loadingPeriods.value[period.id] = false;
  }
};

const goBack = async () => {
  if (navigationStack.value.length === 0) return;
  
  // On retire la période courante de la pile
  navigationStack.value.pop();
  
  // Si on a encore des périodes dans la pile, on charge le parent
  if (navigationStack.value.length > 0) {
    const parent = navigationStack.value[navigationStack.value.length - 1];
    loadingPeriods.value[parent.id] = true;
    try {
      const loadedPeriod = await timelineService.loadPeriod(parent.id);
      currentPeriods.value = loadedPeriod.children || [];
      emit('period-click', loadedPeriod);
    } catch (err) {
      console.error('[Timeline] Erreur lors du chargement du parent:', err);
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de la période parent';
    } finally {
      loadingPeriods.value[parent.id] = false;
    }
  } else {
    // Si on est revenu à la racine, on utilise les périodes initiales des props
    currentPeriods.value = props.periods;
    emit('period-click', props.periods[0]);
  }
};

const retryLoading = async () => {
  if (navigationStack.value.length > 0) {
    const parent = navigationStack.value[navigationStack.value.length - 1];
    await selectPeriod(parent);
  } else {
    // Recharger les périodes initiales
    try {
      const mainEons = await Promise.all([
        timelineService.loadPeriod(MAIN_EONS.PHANEROZOIC),
        timelineService.loadPeriod(MAIN_EONS.PROTEROZOIC),
        timelineService.loadPeriod(MAIN_EONS.ARCHEAN),
        timelineService.loadPeriod(MAIN_EONS.HADEAN)
      ]);
      currentPeriods.value = mainEons[0].children || [];
      emit('period-click', mainEons[0]); // On émet la première période comme référence
    } catch (err) {
      console.error('[Timeline] Erreur lors du rechargement:', err);
      error.value = err instanceof Error ? err.message : 'Erreur lors du rechargement';
    }
  }
};
</script>

<style scoped>
.period-grid {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-x: auto;
}

.timeline-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #fff;
  border-radius: 8px;
  min-width: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  background-color: var(--color-neutral-700);
  z-index: 0;
}

.periods-container {
  width: 100%;
  height: 50%;
  position: relative;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: flex-end;
  bottom: 4px;
}

.events-container {
  width: 100%;
  height: 50%;
  position: relative;
  padding: 0;
  margin: 0;
}

.timeline-card {
  position: absolute;
  height: 64px;
  z-index: 1;
  cursor: pointer;
  bottom: 0;
  will-change: transform, left;
}

.timeline-card:hover {
  z-index: 2;
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

.error-message {
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
  background-color: #ffebee;
  color: #c62828;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.navigation-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  z-index: 2;
}
</style> 