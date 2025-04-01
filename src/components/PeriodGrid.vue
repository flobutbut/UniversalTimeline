<template>
  <div class="period-grid">
    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Chargement de la timeline...</span>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="periods.length === 0" class="empty-message">
      Aucune période à afficher
    </div>

    <div v-else class="timeline-container">
      <div class="timeline-line"></div>
      <div class="periods-container">
        <PeriodCard
          v-for="period in sortedPeriods"
          :key="period.id"
          :period="period"
          :is-selected="false"
          :loading="false"
          class="timeline-card"
          :style="getPeriodStyles(period)"
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
import PeriodCard from './PeriodCard.vue';

const props = defineProps<{
  periods: Period[];
  loading: boolean;
}>();

const scalingService = new TimelineScalingService();
const totalDuration = ref(0);
const startYears = ref(0);
const error = ref<string | null>(null);

// Trier les périodes chronologiquement
const sortedPeriods = computed(() => {
  return [...props.periods].sort((a, b) => {
    const dateA = scalingService.convertDateToYearsBeforePresent(a.temporalData[0]?.startDate || '0 ans');
    const dateB = scalingService.convertDateToYearsBeforePresent(b.temporalData[0]?.startDate || '0 ans');
    return dateB - dateA; // Tri décroissant (du plus récent au plus ancien)
  });
});

// Calculer les durées et positions quand les périodes changent
const updateTimelineScaling = () => {
  try {
    console.log('[Timeline] Mise à jour des calculs pour', props.periods.length, 'périodes');
    totalDuration.value = scalingService.calculateTotalDuration(props.periods);
    if (props.periods.length > 0) {
      // Utiliser la date de début de la période la plus récente comme référence
      startYears.value = Math.max(...props.periods.map(p => 
        scalingService.convertDateToYearsBeforePresent(p.temporalData[0]?.startDate || '0 ans')
      ));
      console.log('[Timeline] Durée totale:', totalDuration.value, 'ans');
      console.log('[Timeline] Années de début:', startYears.value, 'ans');
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur lors du calcul des positions';
  }
};

// Surveiller les changements de périodes
watch(() => props.periods, updateTimelineScaling, { immediate: true });

onMounted(() => {
  updateTimelineScaling();
});

const getPeriodStyles = (period: Period) => {
  return scalingService.calculatePeriodStyles(period, totalDuration.value, startYears.value);
};
</script>

<style scoped>
.period-grid {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  padding: var(--spacing-md);
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
</style> 