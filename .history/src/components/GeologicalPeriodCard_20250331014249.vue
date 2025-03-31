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
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e2e8f0;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.period-card.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #3b82f6;
}

.period-card.loading {
  opacity: 0.7;
  cursor: wait;
}

.period-card.has-children {
  border-left: 4px solid #3b82f6;
}

.period-card.main-eon {
  border-left: 4px solid #10b981;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.period-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.period-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.period-details {
  font-size: 0.9rem;
  color: #475569;
}

.period-dates {
  margin-bottom: 0.5rem;
}

.date {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.date-label {
  color: #64748b;
  font-weight: 500;
}

.date-value {
  color: #1e293b;
}

.period-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
}

.period-location i {
  color: #64748b;
}

.loading-spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.period-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 0.9em;
  color: #666;
}

.loading-indicator {
  color: #2196f3;
}

.children-count, .children-hint {
  color: #666;
}
</style> 