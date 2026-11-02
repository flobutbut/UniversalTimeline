<template>
  <div class="table-wrap catalogue-table" :class="`catalogue-table--${density}`" role="region" :aria-label="`Tableau des ${label.toLocaleLowerCase('fr')}`" tabindex="0">
    <FeedbackState v-if="loading" kind="loading" />
    <FeedbackState v-else-if="error" kind="error" :message="error" retryable @retry="emit('retry')" />
    <div v-else class="catalogue-table__columns" :style="gridStyle" role="table" :aria-label="label">
      <div class="table-header" role="row">
        <div v-for="column in columns" :key="column.key" class="th-cell" :class="{ 'th-cell--no-handle': !column.resizable }"
          role="columnheader" :aria-sort="column.sortLabel && sortColumn === column.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined">
          <button v-if="column.sortLabel" type="button" class="th-sortable" :aria-label="column.sortLabel" @click="emit('sort', column.key)">
            <span class="th-title">{{ column.label }}</span>
            <span v-if="sortColumn === column.key" class="sort-indicator" aria-hidden="true">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
          </button>
          <template v-else>{{ column.label }}</template>
          <div v-if="column.resizable" class="resize-handle" role="separator" aria-orientation="vertical"
            :aria-label="`Largeur de la colonne ${column.label}`" tabindex="0"
            :aria-valuenow="widthOf(column)" :aria-valuemin="column.minWidth" :aria-valuemax="column.maxWidth"
            @keydown="resizeWithKeyboard(column, $event)" @mousedown.stop.prevent="startResize(column, $event)" @click.stop />
        </div>
      </div>
      <div class="table-body" role="rowgroup">
        <div v-if="!items.length" class="empty" role="row"><span role="cell" :aria-colspan="columns.length">{{ emptyText }}</span></div>
        <div v-for="item in items" :key="item.id" class="table-row" :class="{ selected: selectedId === item.id }" :data-item-id="item.id" role="row">
          <slot name="row" :item="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import { computed, onUnmounted, ref } from 'vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import type { CatalogueColumn } from './columns';
const props = withDefaults(defineProps<{
  density?: 'compact' | 'comfortable';
  label: string;
  columns: CatalogueColumn[];
  items: T[];
  emptyText: string;
  loading?: boolean;
  error?: string | null;
  sortColumn?: string | null;
  sortDir?: 'asc' | 'desc';
  selectedId?: string | null;
}>(), { density: 'compact' });
const emit = defineEmits<{ sort: [column: string]; retry: [] }>();
const widths = ref<Record<string, number>>({});
const widthOf = (column: CatalogueColumn) => widths.value[column.key] ?? column.width ?? column.minWidth ?? 120;
const gridStyle = computed(() => ({
  '--catalogue-grid-cols': props.columns.map(c => c.width || c.resizable ? `${widthOf(c)}px` : `minmax(${c.minWidth ?? 120}px, 1fr)`).join(' '),
  minWidth: `calc(${props.columns.reduce((total, c) => total + (c.width || c.resizable ? widthOf(c) : c.minWidth ?? 120), 0)}px + var(--spacing-sm) * ${props.columns.length - 1} + var(--spacing-md) * 2)`,
}));
function setWidth(column: CatalogueColumn, value: number) {
  widths.value[column.key] = Math.min(column.maxWidth ?? 720, Math.max(column.minWidth ?? 100, value));
}
function resizeWithKeyboard(column: CatalogueColumn, event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  setWidth(column, event.key === 'Home' ? column.minWidth ?? 100 : event.key === 'End' ? column.maxWidth ?? 720 : widthOf(column) + (event.key === 'ArrowRight' ? 10 : -10));
}
let resizeState: { column: CatalogueColumn; startX: number; startWidth: number } | null = null;
function onResizeMove(event: MouseEvent) {
  if (resizeState) setWidth(resizeState.column, resizeState.startWidth + event.clientX - resizeState.startX);
}
function stopResize() {
  if (!resizeState) return;
  resizeState = null;
  document.body.classList.remove('catalogue-table-resizing');
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', stopResize);
}
function startResize(column: CatalogueColumn, event: MouseEvent) {
  resizeState = { column, startX: event.clientX, startWidth: widthOf(column) };
  document.body.classList.add('catalogue-table-resizing');
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', stopResize);
}
onUnmounted(stopResize);
</script>

<style scoped>
.table-wrap {
  flex: 1;
  min-height: 0;
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.catalogue-table__columns {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.catalogue-table__columns .table-header,
.catalogue-table__columns .table-row {
  grid-template-columns: var(--catalogue-grid-cols);
}

.table-header,
.table-row {
  display: grid;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
}

.table-header {
  min-height: var(--field-height-md);
  font: var(--type-label);
  
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-default);
  flex-shrink: 0;
  background: var(--color-background-default);
  user-select: none;
}

.th-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  padding-right: var(--spacing-sm);
}

.th-sortable {
  display: flex;
  align-items: center;
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  gap: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
}

.th-sortable:hover {
  color: var(--color-text-primary);
}

.th-title {
  flex: 1;
  min-width: 0;
}

.sort-indicator {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  line-height: 1;
  opacity: 0.85;
}

.th-cell--no-handle {
  padding-right: 0;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: var(--spacing-sm);
  margin-right: -4px;
  cursor: col-resize;
  z-index: 2;
  border-radius: calc(var(--radius-sm) / 2);
}

.resize-handle:hover {
  background: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.table-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.table-row {
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
  min-height: var(--list-row-height-compact);
  font: var(--type-compact);
  transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--color-interaction-hover);
  box-shadow: inset 4px 0 0 var(--color-primary);
}

.table-row.selected { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.catalogue-table--comfortable .table-row { min-height: var(--list-row-height-comfortable); font: var(--type-body); }
.table-row > :deep([role="cell"]) { min-width: 0; }
:deep(.col-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}

:deep(.col-date) {
  color: var(--color-text-secondary);
  white-space: nowrap;
  font-size: inherit;
}

:deep(.col-updated) {
  color: var(--color-text-primary);
  white-space: nowrap;
  font-size: inherit;
}

:deep(.col-categories) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}



:deep(.col-stories) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}





:deep(.col-stories__state) {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

:deep(.col-actions) {
  display: flex;
  justify-content: flex-end;
}

:deep(.col-actions .base-button) {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.table-row:hover :deep(.col-actions .base-button),
.table-row:focus-within :deep(.col-actions .base-button) {
  opacity: 1;
}

@media (hover: none) { :deep(.col-actions .base-button) { opacity: 1; } }

.empty {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: inherit;
}

:deep(.catalogue-label-button--row)::after { content: ''; position: absolute; inset: 0; }
:deep(.catalogue-label-button:focus-visible) { outline-offset: -2px; }
:deep(.catalogue-label-button) { display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; color: inherit; font: inherit; cursor: pointer; }
</style>
<style>
body.catalogue-table-resizing { cursor: col-resize !important; user-select: none; }
</style>
