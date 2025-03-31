<template>
  <div 
    class="period-card"
    :class="{ 'selected': isSelected, 'has-children': hasChildren }"
    @click="$emit('click')"
  >
    <div class="period-header">
      <h3 class="period-title">{{ title }}</h3>
      <div v-if="hasChildren" class="child-count">
        {{ childCount }} sous-période{{ childCount > 1 ? 's' : '' }}
      </div>
    </div>
    
    <div class="period-dates">
      <div class="date">
        <span class="label">Début:</span>
        <span class="value">{{ formatDate(startDate) }}</span>
      </div>
      <div class="date">
        <span class="label">Fin:</span>
        <span class="value">{{ formatDate(endDate) }}</span>
      </div>
    </div>
    
    <div v-if="locations" class="period-locations">
      <span class="label">Localisation:</span>
      <span class="value">{{ locations }}</span>
    </div>
    
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>Chargement...</span>
    </div>

    <div v-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatGeologicalDate } from '../utils/dateFormatter';
import type { Period } from '../types/geological';

const props = defineProps<{
  title: string;
  startDate?: string;
  endDate?: string;
  locations?: string;
  hasChildren: boolean;
  childCount: number;
  isLoading?: boolean;
  error?: string;
  period: Period;
  isSelected?: boolean;
}>();

const formatDate = (date?: string) => {
  if (!date) return 'Non spécifié';
  return formatGeologicalDate(date);
};

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

.child-count {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.period-dates {
  margin: 12px 0;
  font-size: 0.9em;
}

.date {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.label {
  color: #666;
}

.value {
  color: #333;
  font-weight: 500;
}

.period-locations {
  margin: 12px 0;
  font-size: 0.9em;
  color: #666;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  color: #666;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  color: #e74c3c;
}

.error-icon {
  font-size: 1.2rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 