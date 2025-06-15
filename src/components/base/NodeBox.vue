<template>
  <div
    class="node-box"
    :class="{ 'drag-over': dropActive }"
    :title="label"
    :draggable="draggable"
    :aria-grabbed="draggable ? 'true' : 'false'"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <span class="node-label"><slot>{{ label }}</slot></span>
    <button v-if="deletable" class="delete-btn" @click.stop="$emit('delete')" aria-label="Supprimer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string,
  draggable?: boolean,
  dragData?: any,
  dropActive?: boolean,
  deletable?: boolean,
  onDragStart?: (event: DragEvent, data: any) => void,
  onDragOver?: (event: DragEvent) => void,
  onDragLeave?: (event: DragEvent) => void,
  onDrop?: (event: DragEvent, data: any) => void
}>();

function onDragStart(event: DragEvent) {
  if (props.draggable && props.onDragStart) {
    props.onDragStart(event, props.dragData);
  }
}
function onDragOver(event: DragEvent) {
  if (props.onDragOver) props.onDragOver(event);
}
function onDragLeave(event: DragEvent) {
  if (props.onDragLeave) props.onDragLeave(event);
}
function onDrop(event: DragEvent) {
  if (props.onDrop) props.onDrop(event, props.dragData);
}
</script>

<style scoped>
.node-box {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 60px;
  min-height: 80px;
  height: 100%;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  font-size: var(--font-size-base);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
  user-select: none;
  position: relative;
}
.node-box:hover, .node-box:focus {
  border-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
  background: var(--color-primary-light);
  outline: none;
}
.node-box.drag-over {
  border-color: var(--color-accent);
  background: var(--color-primary-light);
}
.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.delete-btn {
  background: none;
  border: none;
  color: var(--color-error, #e53935);
  cursor: pointer;
  margin-left: 8px;
  padding: 2px;
  border-radius: 50%;
  transition: background 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
}
.node-box:hover .delete-btn,
.node-box:focus .delete-btn {
  opacity: 1;
  pointer-events: auto;
  background: var(--color-error-bg, #fdecea);
}
</style> 