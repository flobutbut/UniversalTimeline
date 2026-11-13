<template>
  <div class="catalogue-table-shell">
    <div ref="container" class="table-wrap catalogue-table" :class="`catalogue-table--${density}`" role="region" :aria-label="uiText(uiFormat`Tableau des ${label.toLocaleLowerCase(language)}`)" tabindex="0">
      <FeedbackState v-if="loading" kind="loading" />
      <FeedbackState v-else-if="error" kind="error" :message="uiText(error)" retryable @retry="emit('retry')" />
      <div v-else class="catalogue-table__columns" :style="gridStyle" role="table" :aria-label="uiText(label)">
        <div class="table-header" role="row">
          <div v-if="selectable" role="columnheader" :aria-label="uiText('Sélection')" class="catalogue-table__selection">
            <input type="checkbox" :aria-label="uiText('Tout sélectionner dans les lignes affichées')" :checked="allSelected" :indeterminate.prop="someSelected && !allSelected" :disabled="selectionDisabled || !selectableIds.length" @change="selectAll" />
          </div>
          <div v-for="column in columns" :key="column.key" :data-column-key="column.key" class="th-cell" :class="{ 'th-cell--no-handle': !canResize(column) }"
            role="columnheader" :aria-sort="column.sortLabel && sortColumn === column.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined">
            <button v-if="column.sortLabel" type="button" class="th-sortable" :aria-label="uiText(column.sortLabel)" @click="emit('sort', column.key)">
              <span class="th-title">{{ uiText(column.label) }}</span>
              <Icon class="sort-indicator" :icon="sortColumn === column.key ? (sortDir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down') : 'mdi:swap-vertical'" width="14" height="14" aria-hidden="true" />
            </button>
            <template v-else>{{ uiText(column.label) }}</template>
            <div v-if="canResize(column)" class="resize-handle" role="separator" aria-orientation="vertical"
              :aria-label="uiText(uiFormat`Largeur de la colonne ${column.label}`)" tabindex="0"
              :aria-valuenow="Math.round(widthOf(column))" :aria-valuemin="column.minWidth ?? 100" :aria-valuemax="column.maxWidth ?? 720"
              @keydown="resizeWithKeyboard(column, $event)" @mousedown.stop.prevent="startResize(column, $event)" @dblclick.stop="fitContent(column)" @click.stop />
          </div>
        </div>
        <div class="table-body" role="rowgroup">
          <div v-if="!items.length" class="empty" role="row"><span role="cell" :aria-colspan="columns.length + (selectable ? 1 : 0)">{{ emptyText }}</span></div>
          <div v-for="item in items" :key="item.id" class="table-row" :class="{ selected: selectedId === item.id || selectedIds.includes(item.id) }" :data-item-id="item.id" role="row" :aria-selected="selectable ? selectedIds.includes(item.id) : undefined">
            <span v-if="selectable" role="cell" class="catalogue-table__selection">
              <input type="checkbox" :aria-label="uiText(uiFormat`Sélectionner ${itemLabel?.(item) ?? item.id}`)" :checked="selectedIds.includes(item.id)" :disabled="selectionDisabled || !canSelect(item)" @change="toggleSelection(item.id)" @click.stop />
            </span>
            <slot name="row" :item="item" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import { language, uiFormat, uiText } from '@/i18n';
import { computed, onUnmounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import { catalogueColumnWidths } from '@/lib/catalogueColumnWidths';
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
  selectable?: boolean;
  selectionDisabled?: boolean;
  canSelect?: (item: T) => boolean;
  itemLabel?: (item: T) => string;
}>(), { density: 'compact' });
const emit = defineEmits<{ sort: [column: string]; retry: [] }>();
const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] });
const canSelect = (item: T) => props.canSelect?.(item) ?? true;
const selectableIds = computed(() => props.items.filter(canSelect).map(item => item.id));
const allSelected = computed(() => selectableIds.value.length > 0 && selectableIds.value.every(id => selectedIds.value.includes(id)));
const someSelected = computed(() => selectableIds.value.some(id => selectedIds.value.includes(id)));
watch(selectableIds, ids => { const next = selectedIds.value.filter(id => ids.includes(id)); if (next.length !== selectedIds.value.length) selectedIds.value = next; });
function selectAll() { if (!props.selectionDisabled) selectedIds.value = allSelected.value ? [] : [...selectableIds.value]; }
function toggleSelection(id: string) {
  if (props.selectionDisabled || !selectableIds.value.includes(id)) return;
  selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter(value => value !== id) : [...selectedIds.value, id];
}
const container = ref<HTMLElement | null>(null);
const availableWidth = ref(0);
let observer: ResizeObserver | undefined;
watch(container, element => {
  observer?.disconnect();
  if (!element) return;
  availableWidth.value = element.clientWidth;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => { availableWidth.value = element.clientWidth; });
    observer.observe(element);
  }
}, { flush: 'post' });
onUnmounted(() => observer?.disconnect());
const widths = ref<Record<string, number>>({});
const canResize = (column: CatalogueColumn) => column.resizable !== false && column.key !== 'actions';
const fittedWidths = computed(() => catalogueColumnWidths(props.columns, availableWidth.value > 0 ? availableWidth.value - 24 - (props.columns.length - 1) * 8 - (props.selectable ? 44 : 0) : 0, widths.value));
const widthOf = (column: CatalogueColumn) => fittedWidths.value[column.key];
const gridStyle = computed(() => ({
  '--catalogue-grid-cols': `${props.selectable ? '36px ' : ''}${props.columns.map(c => `${widthOf(c)}px`).join(' ')}`,
  minWidth: `calc(${props.columns.reduce((total, c) => total + widthOf(c), 0) + (props.selectable ? 44 : 0)}px + var(--spacing-sm) * ${props.columns.length - 1} + var(--spacing-md) * 2)`,
}));
function fitContent(column: CatalogueColumn) {
  const index = props.columns.findIndex(value => value.key === column.key) + (props.selectable ? 1 : 0);
  const cells = [...(container.value?.querySelectorAll<HTMLElement>('[role="row"]') ?? [])].flatMap(row => row.children[index] ? [row.children[index] as HTMLElement] : []);
  const measure = document.createElement('span');
  measure.style.cssText = 'position:fixed;visibility:hidden;white-space:pre;width:max-content;pointer-events:none';
  document.body.append(measure);
  let width = column.minWidth ?? 100;
  try { for (const cell of cells) { measure.style.font = getComputedStyle(cell).font; measure.textContent = cell.textContent; width = Math.max(width, measure.getBoundingClientRect().width + 32); } }
  finally { measure.remove(); }
  setWidth(column, width);
}
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
.catalogue-table-shell { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; gap: var(--spacing-sm); }
.catalogue-table__selection { display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
.catalogue-table__selection input { width: 16px; height: 16px; accent-color: var(--color-primary); cursor: pointer; }
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
