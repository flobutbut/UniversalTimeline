<template>
  <button 
    class="back-button"
    @click="$emit('click')"
  >
    {{ period.label }}
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
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Period } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

const props = defineProps<{
  period: Period;
}>();

defineEmits<{
  (e: 'click'): void;
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
</script>

<style scoped>
.back-button {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: var(--font-size-base);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0px;
}

.back-button:hover {
  background-color: #d32f2f;
}

.period-info {
  font-size: 0.8em;
  font-weight: normal;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 4px;
}

.location-separator {
  margin: 0 4px;
  opacity: 0.7;
}

.period-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.period-location i {
  font-size: 0.9em;
}
</style> 