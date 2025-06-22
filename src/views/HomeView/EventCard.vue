<template>
  <div 
    class="event-card"
    :class="{ 'is-selected': isSelected }"
    :style="cardStyle"
  >
    <!-- Point de l'événement -->
    <div 
      class="event-dot"
      @click="$emit('click')"
    ></div>
    
    <!-- Ligne verticale et informations au survol -->
    <div class="event-hover-content">
      <div class="event-vertical-line"></div>
      <div class="event-info">
        <div class="event-label">{{ event.label }}</div>
        <div class="event-date">{{ event.date }}</div>
      </div>
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
  width: 12px;
  height: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  top: -9px;
}

.event-dot {
  width: 12px;
  height: 12px;
  background-color: var(--color-neutral-900);
  border: 1px solid var(--color-surface);
  border-radius: 50%;
  transition: all var(--transition-normal);
  cursor: pointer;
}

.event-dot:hover {
  background-color: var(--color-primary);
  transform: scale(1.2);
}

.event-card.is-selected .event-dot {
  background-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.event-hover-content {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-slow);
  pointer-events: none;
  z-index: var(--z-index-tooltip);
}

.event-dot:hover + .event-hover-content {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.event-vertical-line {
  width: 2px;
  height: 40px;
  background-color: var(--color-primary);
  margin: 0 auto;
  box-shadow: var(--shadow-sm);
}

.event-info {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-top: var(--spacing-xs);
  box-shadow: var(--shadow-lg);
  min-width: 120px;
  text-align: center;
}

.event-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: var(--spacing-xs);
  line-height: var(--line-height-normal);
}

.event-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-normal);
}
</style> 