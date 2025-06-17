<template>
  <button class="back-button" @click="emit('click')">
    <i class="fas fa-arrow-left"></i>
    <span>{{ period.label.fr }}</span>
  </button>
</template>

<script setup lang="ts">
import type { MultilingualText } from '@/types/database';

interface SimplePeriod {
  id: string;
  label: MultilingualText;
}

const props = defineProps<{
  period: SimplePeriod;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
.back-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-button:hover {
  background-color: var(--color-surface-hover);
}

.back-button i {
  font-size: 0.9em;
}
</style> 