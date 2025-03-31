<template>
  <div 
    class="period-card"
    :class="{ 
      'has-children': period.hasChildren,
      'selected': selected,
      'clickable': period.hasChildren
    }"
    @click="$emit('click')"
  >
    <div class="period-header">
      <h3 class="period-title">{{ period.label }}</h3>
      <div v-if="period.hasChildren" class="children-indicator">
        <span class="icon">📂</span>
        <span class="count">{{ period.childCount || 0 }}</span>
      </div>
    </div>

    <div class="period-details">
      <div v-if="period.startDate || period.endDate" class="period-dates">
        <div v-if="period.startDate" class="date">
          <span class="label">Début:</span>
          <span class="value">{{ DateFormatter.format(period.startDate, 'geological') }}</span>
        </div>
        <div v-if="period.endDate" class="date">
          <span class="label">Fin:</span>
          <span class="value">{{ DateFormatter.format(period.endDate, 'geological') }}</span>
        </div>
      </div>

      <div v-if="period.categoryLabels?.length" class="period-categories">
        <div 
          v-for="category in period.categoryLabels" 
          :key="category"
          class="category-tag"
        >
          {{ category }}
        </div>
      </div>

      <div v-if="period.location" class="period-location">
        <span class="icon">📍</span>
        <span class="location">{{ period.location }}</span>
      </div>
    </div>

    <div v-if="period.hasChildren" class="period-action">
      <span class="action-text">Voir les sous-périodes</span>
      <span class="action-icon">→</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SimplePeriod } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

defineProps<{
  period: SimplePeriod;
  selected?: boolean;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
.period-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  cursor: default;
}

.period-card.clickable {
  cursor: pointer;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.period-card.selected {
  border-color: #3498db;
  background-color: #f8f9ff;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.period-title {
  margin: 0;
  font-size: 1.2em;
  color: #333;
}

.children-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.9em;
  color: #666;
}

.period-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.period-dates {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9em;
}

.label {
  color: #666;
  min-width: 60px;
}

.value {
  color: #333;
}

.period-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8em;
}

.period-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9em;
  color: #666;
}

.period-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #3498db;
  font-size: 0.9em;
}

.action-icon {
  font-size: 1.2em;
  transition: transform 0.2s;
}

.period-card:hover .action-icon {
  transform: translateX(4px);
}
</style> 