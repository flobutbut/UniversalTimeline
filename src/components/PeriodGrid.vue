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
        <EventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
          :is-selected="selectedEvent?.id === event.id"
          :card-style="getEventStyles(event)"
          @click="selectEvent(event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Period, Event } from '../types/geological';
import { TimelineScalingService, WikidataQueryService, DatabaseQueryService } from '../services';
import { MAIN_EONS } from '../types/geological';
import PeriodCard from './PeriodCard.vue';
import BackButton from './BackButton.vue';
import EventCard from './EventCard.vue';

const props = defineProps<{
  periods: Period[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'period-click', period: Period): void;
  (e: 'event-click', event: Event): void;
}>();

const scalingService = new TimelineScalingService();
const timelineService = WikidataQueryService.getInstance();
const databaseService = DatabaseQueryService.getInstance();
const totalDuration = ref(0);
const startYears = ref(0);
const error = ref<string | null>(null);
const navigationStack = ref<Period[]>([]);
const loadingPeriods = ref<Record<string, boolean>>({});
const currentPeriods = ref<Period[]>(props.periods);
const events = ref<Event[]>([]);
const selectedEvent = ref<Event | null>(null);

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

// Charger tous les événements au démarrage
onMounted(async () => {
  updateTimelineScaling();
  try {
    console.log('[PeriodGrid] Chargement initial des événements');
    const eventsData = await databaseService.getAllEvents();
    console.log(`[PeriodGrid] ${eventsData.length} événements chargés`);
    events.value = eventsData;
  } catch (err) {
    console.error('[PeriodGrid] Erreur lors du chargement des événements:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des événements';
  }
});

const getPeriodStyles = (period: Period) => {
  return scalingService.calculatePeriodStyles(period, totalDuration.value, startYears.value);
};

// Calculer les styles pour un événement
const getEventStyles = (event: Event) => {
  const position = scalingService.calculateRelativePosition(
    event.date,
    totalDuration.value,
    startYears.value
  );
  
  return {
    width: '100px', // Largeur fixe pour les événements
    left: `${position}%`
  };
};

// Sélectionner un événement
const selectEvent = (event: Event) => {
  selectedEvent.value = event;
  emit('event-click', event);
};

// Fonction pour sélectionner une période
const selectPeriod = (period: Period) => {
  console.log(`[PeriodGrid] Sélection de la période ${period.id}`);
  emit('period-click', period);
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
  background-color: var(--color-background);
}

.timeline-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-neutral-0);
  border-radius: var(--radius-lg);
  min-width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

.timeline-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  background-color: var(--color-border);
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
  display: flex;
  align-items: flex-start;
  top: 4px;
}

.timeline-card {
  position: absolute;
  height: 64px;
  z-index: 1;
  cursor: pointer;
  bottom: 0;
  will-change: transform, left;
  transition: transform var(--transition-fast);
}

.timeline-card:hover {
  z-index: 2;
  transform: translateY(-2px);
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--color-text);
}

.loading-container i {
  color: var(--color-primary);
}

.error-message {
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  border-radius: var(--radius-md);
  background-color: var(--color-error);
  color: var(--color-neutral-0);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  align-items: center;
}

.error-message button {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-neutral-0);
  color: var(--color-error);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.error-message button:hover {
  background-color: var(--color-neutral-100);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-light);
  font-style: italic;
}

.navigation-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-sm);
  z-index: 2;
}
</style> 