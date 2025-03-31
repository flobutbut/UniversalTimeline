<template>
  <div 
    class="period-card"
    :class="{ 
      'selected': isSelected,
      'has-children': period.hasChildren,
      'loading': isLoading
    }"
    @click="handleClick"
  >
    <div class="period-header">
      <h3 class="period-title">{{ period.label }}</h3>
      <div v-if="period.hasChildren" class="children-count">
        {{ period.childCount }} sous-périodes
      </div>
    </div>

    <div class="period-dates">
      <div v-if="period.startDate" class="date">
        <span class="date-label">Début:</span>
        <span class="date-value">{{ formatDate(period.startDate) }}</span>
      </div>
      <div v-if="period.endDate" class="date">
        <span class="date-label">Fin:</span>
        <span class="date-value">{{ formatDate(period.endDate) }}</span>
      </div>
    </div>

    <div v-if="period.location" class="period-location">
      <i class="fas fa-map-marker-alt"></i>
      {{ period.location }}
    </div>

    <div v-if="isLoading" class="loading-overlay">
      <i class="fas fa-spinner fa-spin"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SimplePeriod } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

const props = defineProps<{
  period: SimplePeriod;
  isSelected: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', period: SimplePeriod): void;
}>();

const handleClick = () => {
  if (!props.isLoading) {
    emit('select', props.period);
  }
};

const formatDate = (date: string) => {
  return DateFormatter.format(date, 'geological');
};
</script>

<style scoped>
.period-card {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.period-card.selected {
  border: 2px solid #4CAF50;
  background-color: #f8fff8;
}

.period-card.has-children {
  border-left: 4px solid #2196F3;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.period-title {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.children-count {
  font-size: 0.9rem;
  color: #666;
  background: #e3f2fd;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
}

.period-dates {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.date {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.date-label {
  color: #666;
}

.date-value {
  color: #333;
  font-weight: 500;
}

.period-location {
  font-size: 0.9rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
}

.loading-overlay i {
  font-size: 1.5rem;
  color: #2196F3;
}
</style> 