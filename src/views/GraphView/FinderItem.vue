<template>
  <div
    class="finder-item"
    :class="{
      'finder-item-selected': selected,
      'finder-item-has-children': hasChildren
    }"
    :aria-selected="selected"
    :draggable="true"
    @dragstart="emit('dragstart', itemId)"
    @dragover.prevent
    @drop="emit('drop', itemId)"
    @click="emit('click')"
  >
    <div class="finder-item-content">
      <slot>{{ label.fr }}</slot>
    </div>
    <div class="finder-item-actions">
      <button
        v-if="itemId"
        class="action-button"
        @click.stop="emit('edit', itemId)"
      >
        Edit
      </button>
      <div v-if="hasChildren" class="finder-item-chevron">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { MultilingualText } from '@/types/database';

const props = defineProps<{
  label: MultilingualText;
  selected: boolean;
  hasChildren: boolean;
  itemId: string;
}>();
const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'dragstart', itemId: string): void;
  (e: 'drop', itemId: string): void;
  (e: 'edit', itemId: string): void;
}>();

const isDroppable = ref(false);

function handleEdit(event: MouseEvent) {
  event.stopPropagation();
  if (props.itemId) {
    emit('edit', props.itemId);
  }
}

function onDragStart(event: DragEvent) {
  if (props.itemId) {
    event.dataTransfer?.setData('text/plain', props.itemId);
    emit('dragstart', props.itemId);
  }
}
function onDragOver(event: DragEvent) {
  isDroppable.value = true;
}
function onDragLeave(event: DragEvent) {
  isDroppable.value = false;
}
function onDrop(event: DragEvent) {
  isDroppable.value = false;
  if (props.itemId) {
    emit('drop', props.itemId);
  }
}
</script>

<style scoped>
.finder-item {
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.2s, color 0.2s;
  font-size: var(--font-size-base);
  line-height: 1.5;
  white-space: nowrap;
  overflow: visible;
  text-overflow: ellipsis;
  outline: none;
  min-height: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
}

.finder-item-content {
  width: 100%;
  overflow: visible;
  text-overflow: ellipsis;
  display: block;
}

.finder-item-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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

.finder-item.selected .action-button {
  color: var(--color-neutral-0);
}

.finder-item.selected .action-button:hover {
  color: var(--color-neutral-100);
}

.finder-item-chevron {
  flex-shrink: 0;
  color: var(--color-text-light);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.finder-item:hover, .finder-item.droppable {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.finder-item.selected {
  background: var(--color-primary);
  color: var(--color-neutral-0);
}

.finder-item:hover .finder-item-chevron,
.finder-item.droppable .finder-item-chevron {
  opacity: 1;
}

.finder-item:focus {
  background: var(--color-primary-light);
  outline: none;
}
</style> 