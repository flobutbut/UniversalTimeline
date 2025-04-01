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
  // Suppression du log
});

// Surveiller la sélection
watch(() => props.isSelected, (newValue) => {
  // Suppression du log
});

// Ajout des logs dans le composant
watch(() => props.period, (newPeriod) => {
  // Suppression du log
}, { immediate: true });
</script>

<style scoped>
.period-card {
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  transition: var(--transition-normal);
  color: var(--color-text);
  height: 68px;
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  border: 1px solid var(--color-border);
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.period-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.period-card.selected {
  background: var(--color-primary);
  color: var(--color-background);
  border-color: var(--color-primary);
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
  margin-left: var(--spacing-md);
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: center;
}

.period-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
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
  margin-left: var(--spacing-md);
  text-align: right;
  white-space: nowrap;
}

.period-dates {
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  text-align: left;
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.period-location {
  font-size: var(--font-size-base);
  color: var(--color-text-light);
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
  border-radius: var(--radius-sm);
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
  border-top-color: var(--color-primary);
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