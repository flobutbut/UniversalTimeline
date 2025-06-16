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
    @click="handleClick"
  >
    <div class="main-container">
      <div class="card-content">
        <div class="period-header">
          <div class="header-left">
            <h3 class="period-title" :title="period.label">{{ period.label }}</h3>
          </div>
        </div>

        <div class="period-footer">
          <div class="footer-left">
            <div v-if="hasTemporalData" class="period-info">
              <span v-if="firstTemporalData.startDate">{{ formatDate(firstTemporalData.startDate) }}</span>
              <span v-if="firstTemporalData.startDate && firstTemporalData.endDate"> - </span>
              <span v-if="firstTemporalData.endDate">{{ formatDate(firstTemporalData.endDate) }}</span>
              <span v-if="firstTemporalData.location" class="location-separator">•</span>
              <span v-if="firstTemporalData.location" class="period-location">
                <i class="fas fa-map-marker-alt"></i>
                {{ firstTemporalData.location }}
              </span>
            </div>
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
import { DateFormatter } from '@/utils/dateFormatter';
import type { Period } from '@/types/geological';

const props = defineProps<{
  period: Period;
  isSelected: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
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

const handleClick = () => {
  console.log('[PeriodCard] Click sur la période:', {
    id: props.period.id,
    label: props.period.label,
    hasChildren: props.period.hasChildren
  });
  emit('select', props.period);
};
</script>

<style scoped>
.period-card {
  background: transparent;
  padding: 1px 1px;
  cursor: pointer;
  color: var(--color-text);
  height: 64px;
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  border: none;
  box-shadow: none;
}

.main-container {
  background: var(--color-card);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  transition: transform var(--transition-normal);
}

/* Layout mobile (par défaut) */
@media (max-width: 768px) {
  .period-card {
    width: 100%;
  }
}

/* Layout desktop (timeline) */
@media (min-width: 769px) {
  .period-card {
    min-width: 4px;
    max-width: 100%;
  }
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

.period-card:hover .main-container {
  background: var(--color-card-hover);
  transform: translateY(-4px);
}

.period-card.selected .main-container {
  background: var(--color-primary);
  color: var(--color-neutral-0);
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 0;
}

.header-left {
  flex: 1;
  text-align: left;
  min-width: 0;
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

.period-card.selected .period-title {
  color: var(--color-neutral-0);
}

.period-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin-top: -4px;
}

.footer-left {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.period-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  text-align: left;
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.period-card.selected .period-info {
  color: var(--color-neutral-0);
}

.location-separator {
  color: var(--color-neutral-400);
}

.period-location {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.period-location i {
  font-size: var(--font-size-sm);
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