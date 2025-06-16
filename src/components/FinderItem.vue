<template>
  <div
    class="finder-item"
    :class="{ selected, droppable: isDroppable }"
    role="option"
    :aria-selected="selected ? 'true' : 'false'"
    @click="$emit('click')"
    tabindex="0"
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
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
import { ref } from 'vue';
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

const isDroppable = ref(false);

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
  background: var(--color-card);
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

.finder-item:hover, .finder-item.droppable {
  background: var(--color-card-hover);
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
}
</style> 