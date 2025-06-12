<template>
  <div class="database-card" :class="{ 'is-period': type === 'period', 'is-event': type === 'event', 'is-story': type === 'story' }">
    <div class="card-header">
      <div class="title-row">
        <h3>{{ title }}</h3>
        <button class="action-button" @click.stop="handleEdit">Edit</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Category } from '../types/database';

interface Props {
  type: 'period' | 'event' | 'story';
  title: string;
  categories: Category[];
}

const props = defineProps<Props>();
const emit = defineEmits(['edit']);

const handleEdit = () => {
  console.log('[DatabaseCard] Émission de l\'événement edit');
  emit('edit');
};
</script>

<style scoped>
.database-card {
  background: var(--color-neutral-0);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
}

.database-card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.card-row {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: flex-end;
}

.action-button {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.card-categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.category-tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.is-period {
  border-left: 4px solid var(--color-period);
}

.is-event {
  border-left: 4px solid var(--color-event);
}

.is-story {
  border-left: 4px solid var(--color-story);
}
</style> 