<template>
  <div 
    class="period-card" 
    :class="{ 
      'selected': isSelected,
      'loading': loading,
      'has-children': period.hasChildren,
      'main-eon': period.isMainEon
    }"
    @click="$emit('select', period)"
  >
    <div class="period-header">
      <h3 class="period-title">{{ period.label }}</h3>
      <div v-if="period.hasChildren" class="children-count">
        {{ period.hasChildren ? 'Sous-périodes disponibles' : '' }}
      </div>
    </div>

    <div class="period-details">
      <div v-if="period.startDate || period.endDate" class="period-dates">
        <span v-if="period.startDate">{{ period.startDate }}</span>
        <span v-if="period.startDate && period.endDate"> - </span>
        <span v-if="period.endDate">{{ period.endDate }}</span>
      </div>

      <div v-if="period.location" class="period-location">
        <i class="fas fa-map-marker-alt"></i>
        {{ period.location }}
      </div>
    </div>

    <div v-if="loading" class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Period } from '../types/geological';

const props = defineProps<{
  period: Period;
  isSelected: boolean;
  loading?: boolean;
}>();

defineEmits<{
  (e: 'select', period: Period): void;
}>();
</script>

<style scoped>
.period-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
  color: #213547;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.period-card.selected {
  border-color: #2196f3;
  background-color: #f5f9ff;
}

.period-header {
  margin-bottom: 12px;
}

.period-title {
  margin: 0;
  font-size: 1.2em;
  color: #213547;
}

.period-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.category-tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.period-dates {
  margin: 12px 0;
  font-size: 0.9em;
  color: #213547;
}

.date-range {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.date-label {
  color: #213547;
  opacity: 0.7;
}

.date-value {
  color: #213547;
  font-weight: 500;
}

.period-location {
  margin: 12px 0;
  font-size: 0.9em;
  color: #213547;
}

.location-label {
  font-weight: 500;
}

.period-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 0.9em;
  color: #213547;
  opacity: 0.7;
}

.loading-indicator {
  color: #2196f3;
}

.children-count, .children-hint {
  color: #213547;
  opacity: 0.8;
}
</style> 