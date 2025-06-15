<template>
  <div
    class="finder-item"
    :class="{ selected }"
    role="option"
    :aria-selected="selected ? 'true' : 'false'"
    @click="$emit('click')"
    tabindex="0"
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <div class="finder-item-content">
      <slot>{{ label }}</slot>
    </div>
    <div v-if="hasChildren" class="finder-item-chevron">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string,
  selected?: boolean,
  hasChildren?: boolean,
  itemId?: string
}>();
const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'dragstart', itemId: string): void;
  (e: 'drop', itemId: string): void;
}>();

function onDragStart(event: DragEvent) {
  if (props.itemId) {
    event.dataTransfer?.setData('text/plain', props.itemId);
    emit('dragstart', props.itemId);
  }
}
function onDragOver(event: DragEvent) {
  // Permet le drop
}
function onDrop(event: DragEvent) {
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
  border-radius: var(--radius-md);
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
}

.finder-item-content {
  width: 100%;
  overflow: visible;
  text-overflow: ellipsis;
  display: block;
}

.finder-item-chevron {
  flex-shrink: 0;
  color: var(--color-text-light);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.finder-item:hover .finder-item-chevron {
  opacity: 1;
}

.finder-item.selected {
  background: var(--color-primary);
  color: var(--color-neutral-0);
}

.finder-item:hover, .finder-item:focus {
  background: var(--color-primary-light);
}
</style> 