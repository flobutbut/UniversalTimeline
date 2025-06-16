<template>
  <div 
    class="event-card"
    :class="{ 'is-selected': isSelected }"
    :style="cardStyle"
    @click="$emit('click')"
  >
    <div class="event-content">
      <div class="event-label">{{ event.label }}</div>
      <div class="event-date">{{ event.date }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event } from '@/types/geological';

const props = defineProps<{
  event: Event;
  isSelected: boolean;
  cardStyle: {
    width: string;
    left: string;
  };
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
.event-card {
  position: absolute;
  height: 48px;
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-primary-300);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  z-index: 1;
}

.event-card:hover {
  z-index: 2;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.event-card.is-selected {
  background-color: var(--color-primary-200);
  border-color: var(--color-primary-400);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.event-content {
  padding: 4px 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.event-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-date {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 