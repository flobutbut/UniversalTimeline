<template>
  <div
    class="finder-item"
    :class="{
      'selected': selected,
      'finder-item-has-children': hasChildren
    }"
    :aria-selected="selected"
    tabindex="0"
    :draggable="true"
    @dragstart="emit('dragstart', itemId)"
    @dragover.prevent
    @drop="emit('drop', itemId)"
    @click="emit('click')"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="finder-item-content"
      ref="contentRef"
    >
      <slot>{{ label.fr }}</slot>
    </div>
    <div class="finder-item-actions">
      <button
        v-if="itemId"
        class="action-button edit-button"
        ref="editBtnRef"
        @click.stop="emit('edit', itemId)"
        v-show="showEdit"
      >
        Edit
      </button>
      <div class="finder-item-chevron">
        <ChevronIcon
          :width="16"
          :height="16"
          :color="selected ? 'var(--color-neutral-0)' : 'var(--color-text-light)'"
          :style="{ opacity: hasActualChildren ? 1 : 0.3 }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MultilingualText } from '@/types/database';
import ChevronIcon from '@/components/icons/ChevronIcon.vue';

const props = defineProps<{
  label: MultilingualText;
  selected: boolean;
  hasChildren: boolean;
  itemId: string;
  hasActualChildren?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'dragstart', itemId: string): void;
  (e: 'drop', itemId: string): void;
  (e: 'edit', itemId: string): void;
}>();

const isDroppable = ref(false);
const showEdit = ref(false);
const editBtnRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

function handleMouseEnter() {
  showEdit.value = true;
}
function handleMouseLeave() {
  showEdit.value = props.selected;
}

watch(
  () => props.selected,
  (val) => {
    showEdit.value = val;
  },
  { immediate: true }
);

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
  event.preventDefault();
  isDroppable.value = true;
}

function onDragLeave(event: DragEvent) {
  isDroppable.value = false;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDroppable.value = false;
  if (props.itemId) {
    emit('drop', props.itemId);
  }
}
</script>

<style scoped>
.finder-item {
  position: relative;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  transition: all 0.2s ease;
  font-size: var(--font-size-base);
  line-height: 1.5;
  outline: none;
  min-height: auto;
  height: auto;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  width: 100%;
  box-sizing: border-box;
}

.finder-item-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 !important;
  margin: 0 !important;
  margin-right: var(--spacing-sm);
}

.finder-item-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.action-button {
  background: none;
  border: none;
  padding: 0;
  margin:0 6px;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  width: auto;
  min-width: 0;
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.edit-button {
  visibility: hidden;
}

.finder-item:hover .edit-button,
.finder-item.selected .edit-button {
  visibility: visible;
}

.finder-item.selected .action-button {
  color: var(--color-neutral-0);
}

.finder-item.selected .action-button:hover {
  color: var(--color-neutral-100);
}

.finder-item:hover,
.finder-item.droppable {
  background: var(--color-surface-hover);
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
  outline: 2px solid var(--color-primary);
}

.finder-item.selected:focus {
  outline: 2px solid var(--color-neutral-0);
}

.finder-item.has-children {
  border-left: 3px solid var(--color-primary);
}

.finder-item.selected.has-children {
  border-left: 3px solid var(--color-neutral-0);
}

.finder-item.selected .finder-item-chevron {
  color: var(--color-neutral-0);
  opacity: 1;
}

.finder-item-chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}
</style> 