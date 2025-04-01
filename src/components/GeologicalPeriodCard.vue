<template>
  <div 
    class="period-card" 
    :class="{ 
      'selected': isSelected,
      'loading': loading,
      'has-children': period.hasChildren,
      'main-eon': period.isMainEon
    }"
    :data-period-id="period.id"
    @click="$emit('select', period)"
  >
    <div class="card-content">
      <div class="period-header">
        <div class="header-left">
          <h3 class="period-title" :title="period.label">{{ period.label }}</h3>
        </div>
        <div class="header-right">
          <ArrowIcon v-if="period.hasChildren" />
        </div>
      </div>

      <div class="period-footer">
        <div class="footer-left">
          <div v-if="hasTemporalData" class="period-dates">
            <span v-if="firstTemporalData.startDate">{{ formatDate(firstTemporalData.startDate) }}</span>
            <span v-if="firstTemporalData.startDate && firstTemporalData.endDate"> - </span>
            <span v-if="firstTemporalData.endDate">{{ formatDate(firstTemporalData.endDate) }}</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="period-location">
            <i class="fas fa-map-marker-alt"></i>
            {{ firstTemporalData.location }}
          </div>
        </div>
      </div>
    </div>
    <div v-show="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { DateFormatter } from '../utils/dateFormatter';
import type { Period } from '../types/geological';
import ArrowIcon from './ArrowIcon.vue';

const props = defineProps<{
  period: Period;
  isSelected: boolean;
  loading?: boolean;
}>();

defineEmits<{
  (e: 'select', period: Period): void;
}>();

// Computed properties pour la nouvelle structure
const hasTemporalData = computed(() => {
  return props.period.temporalData && props.period.temporalData.length > 0;
});

const firstTemporalData = computed(() => {
  return props.period.temporalData[0] || { startDate: undefined, endDate: undefined };
});

// Formatage des dates
const formatDate = (date: string): string => {
  return DateFormatter.format(date, 'geological');
};

// Surveiller les changements d'état de chargement
watch(() => props.loading, (newValue) => {
  console.log(`[Card] État de chargement pour ${props.period.id}: ${newValue ? 'chargement' : 'terminé'}`);
});

// Surveiller la sélection
watch(() => props.isSelected, (newValue) => {
  console.log(`[Card] État de sélection pour ${props.period.id}: ${newValue ? 'sélectionné' : 'désélectionné'}`);
});

// Ajout des logs dans le composant
watch(() => props.period, (newPeriod) => {
  console.log(`[Card] Période reçue: ${newPeriod.id} - ${newPeriod.label} - hasChildren: ${newPeriod.hasChildren}`);
}, { immediate: true });
</script>

<style scoped>
.period-card {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
  color: #213547;
  height: 68px;
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  width: 100%;
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.period-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.period-card.selected {
  border-color: #2196f3;
  background-color: #f5f9ff;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.header-right {
  margin-left: 16px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: center;
}

.period-title {
  margin: 0;
  font-size: 1em;
  font-weight: bold;
  color: #213547;
  text-align: left;
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.period-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.footer-left {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.footer-right {
  margin-left: 16px;
  text-align: right;
  white-space: nowrap;
}

.period-dates {
  font-size: 1em;
  color: #213547;
  text-align: left;
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.period-location {
  font-size: 1em;
  color: #213547;
  text-align: left;
  line-height: var(--line-height-normal);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 8px;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 3px solid rgba(33, 150, 243, 0.1);
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0;
  padding: 0;
}

@keyframes spin {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
</style> 