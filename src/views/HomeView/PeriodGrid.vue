<template>
  <div class="period-grid">
    <div class="navigation-header">
      <BackButton 
        v-if="props.currentPeriod"
        :period="props.parentPeriod || { id: 'root', label: { fr: 'Racine', en: 'Root' } }"
        @click="goBack"
      />
    </div>
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
      <div class="periods-container">
        <div
          v-for="(periods, rowIndex) in periodsByRow"
          :key="rowIndex"
          class="period-row"
        >
          <PeriodCard
            v-for="period in periods"
            :key="period.id"
            :period="period"
            :is-selected="false"
            :loading="loadingPeriods[period.id]"
            class="timeline-card"
            :style="getPeriodStyles(period)"
            @click="selectPeriod(period)"
          />
        </div>
      </div>
      <div class="timeline-line"></div>
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
import type { Period, Event } from '@/types/geological';
import { TimelineScalingService, WikidataQueryService, DatabaseQueryService } from '@/services';
import { MAIN_EONS } from '@/types/geological';
import PeriodCard from './PeriodCard.vue';
import BackButton from '@/components/BackButton.vue';
import EventCard from './EventCard.vue';

const props = defineProps<{
  periods: Period[];
  loading: boolean;
  parentPeriod: Period | null;
  currentPeriod: Period | null;
}>();

const emit = defineEmits<{
  (e: 'period-click', period: Period): void;
  (e: 'event-click', event: Event): void;
  (e: 'go-back'): void;
}>();

const scalingService = new TimelineScalingService();
const timelineService = WikidataQueryService.getInstance();
const databaseService = DatabaseQueryService.getInstance();
const totalDuration = ref(0);
const startYears = ref(0);
const error = ref<string | null>(null);
const loadingPeriods = ref<Record<string, boolean>>({});
const currentPeriods = ref<Period[]>(props.periods);
const events = ref<Event[]>([]);
const selectedEvent = ref<Event | null>(null);
const ligneHeight = 48; // hauteur d'une ligne de période

// Préparation multi-lignes
const numberOfRows = 1; // Pour l'instant, une seule ligne
const periodsByRow = computed(() => {
  // Pour l'instant, une seule ligne
  return [currentPeriods.value];
});

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
  const row = (period as any).row ?? 0; // par défaut sur la première ligne
  const baseStyles = scalingService.calculatePeriodStyles(period, totalDuration.value, startYears.value);
  return {
    ...baseStyles,
    position: 'absolute',
    top: `${row * ligneHeight}px`,
  };
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

const goBack = () => {
  emit('go-back')
}

const retryLoading = async () => {
  if (props.parentPeriod) {
    await selectPeriod(props.parentPeriod);
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
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  overflow: hidden;
  background-color: var(--color-background);
}

.navigation-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  height: 100%;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  height: 100%;
  color: var(--color-error);
}

.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--color-surface);
}

.periods-container {
  flex: 1 1 0;
  position: relative;
  width: 100%;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.period-row {
  position: relative;
  width: 100%;
  height: 64px;
}

.timeline-line {
  height: 2px;
  width: 100%;
  background: var(--color-border-dark);
  position: relative;
  z-index: 2;
  margin: 2px 0;
}

.events-container {
  flex: 1 1 0;
  position: relative;
  width: 100%;
  background: var(--color-surface);
}

.timeline-card {
  position: relative;
  transition: all var(--transition-fast);
}
</style> 