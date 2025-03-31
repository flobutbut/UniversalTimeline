<template>
  <div 
    class="period-card"
    :class="{ 'selected': isSelected }"
    @click="$emit('click')"
  >
    <div class="period-header">
      <h3 class="period-title">{{ period.label }}</h3>
    </div>
    
    <div class="period-dates">
      <div class="date-range">
        <span class="date-label">Début:</span>
        <span class="date-value">{{ period.startDate || 'Non spécifié' }}</span>
      </div>
      <div class="date-range">
        <span class="date-label">Fin:</span>
        <span class="date-value">{{ period.endDate || 'Non spécifié' }}</span>
      </div>
    </div>
    
    <div v-if="period.location" class="period-location">
      <span class="location-label">Localisation:</span>
      <span class="location-value">{{ period.location }}</span>
    </div>
    
    <div class="period-footer">
      <div v-if="period.loading" class="loading-indicator">
        Chargement...
      </div>
      <div v-else-if="period.children.length > 0" class="children-count">
        {{ period.children.length }} sous-période(s)
      </div>
      <div v-else class="children-hint">
        Sous-périodes disponibles
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Period } from '../types/geological';

defineProps<{
  period: Period;
  isSelected?: boolean;
}>();

defineEmits<{
  (e: 'click'): void;
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
  color: #333;
}

.period-dates {
  margin: 12px 0;
  font-size: 0.9em;
}

.date-range {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.date-label {
  color: #666;
}

.date-value {
  color: #333;
  font-weight: 500;
}

.period-location {
  margin: 12px 0;
  font-size: 0.9em;
  color: #666;
}

.location-label {
  font-weight: 500;
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