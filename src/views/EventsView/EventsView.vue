<template>
  <div class="events-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <div class="events-toolbar-search">
          <SearchInput v-model="search" placeholder="Rechercher un événement…" />
        </div>
        <Select
          v-model="selectedPeriodId"
          mode="period"
          compact
          class="period-filter"
        />
        <div class="events-toolbar-select">
          <Select
            v-model="selectedCategoryId"
            :options="categorySelectOptions"
            placeholder="Toutes les catégories"
            :searchable="categorySelectOptions.length > 10"
            compact
          />
        </div>
      </div>
      <Button variant="primary" size="sm" @click="openCreateModal">+ Ajouter un événement</Button>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div v-if="loading" class="empty">Chargement…</div>
      <template v-else>
        <div class="events-view__table-columns" :style="gridColumnVars">
        <div class="table-header">
          <div class="th-cell col-label th-sortable" @click="toggleSort('label')">
            <span class="th-title">Nom</span>
            <span v-if="sortColumn === 'label'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            <div
              class="resize-handle"
              title="Redimensionner"
              @mousedown.stop.prevent="startResize('label', $event)"
              @click.stop
            />
          </div>
          <div class="th-cell col-date th-sortable" @click="toggleSort('date')">
            <span class="th-title">Date</span>
            <span v-if="sortColumn === 'date'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            <div
              class="resize-handle"
              title="Redimensionner"
              @mousedown.stop.prevent="startResize('date', $event)"
              @click.stop
            />
          </div>
          <div class="th-cell col-categories th-sortable th-cell--no-handle" @click="toggleSort('categories')">
            <span class="th-title">Catégories</span>
            <span v-if="sortColumn === 'categories'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
          </div>
          <div class="th-cell col-updated th-sortable th-cell--no-handle" @click="toggleSort('updated')">
            <span class="th-title">Modifié</span>
            <span v-if="sortColumn === 'updated'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
          </div>
          <div class="th-cell col-actions th-cell--no-handle" />
        </div>
        <div class="table-body">
          <div v-if="displayEvents.length === 0" class="empty">Aucun événement trouvé</div>
          <div
            v-for="event in displayEvents"
            :key="event.id"
            class="table-row"
          >
            <span class="col-label">{{ event.label.fr }}</span>
            <span class="col-date">{{ formatEventListDateForDisplay(event.date) }}</span>
            <span class="col-categories">
              <span
                v-for="cat in event.categories"
                :key="cat.id"
                class="category-tag"
              >
                {{ cat.label.fr }}
              </span>
            </span>
            <span class="col-updated">{{ formatListEventLastEditFr(event) }}</span>
            <span class="col-actions">
              <Button variant="tertiary" size="sm" @click="openEditModal(event)">Modifier</Button>
            </span>
          </div>
        </div>
        </div>
      </template>
    </div>

    <!-- Modal ajout / édition -->
    <EditModal
      v-if="modalState.show"
      :isOpen="modalState.show"
      type="event"
      :mode="modalState.mode"
      :data="modalState.item"
      @close="closeModal"
      @submit="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';
import { DateService } from '@/services/DateService';
import {
  formatEventListDateForDisplay,
  formatListEventLastEditFr,
  listEventCategoriesSortKey,
  listEventUpdatedTimestampMs,
  listEventYearsBP,
} from '@/lib/listEventTableHelpers';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import type { ListEvent } from '@/types/database';

// ── Store ──────────────────────────────────────────────────────────────────────

const dataStore = useDataStore();
const { events, periods } = storeToRefs(dataStore);
const loading = ref(false);

const ACTION_COL_PX = 88;
const UPDATED_COL_PX = 150;
const CATEGORIES_MIN_PX = 120;
const COL_MIN = { label: 140, date: 100 } as const;
const COL_MAX = { label: 720, date: 280 } as const;

type ResizableCol = keyof typeof COL_MIN;
type SortColumn = 'label' | 'date' | 'categories' | 'updated';

const colWidths = ref({ label: 360, date: 160 });

const sortColumn = ref<SortColumn | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const eventsViewGridCols = computed(
  () =>
    `${colWidths.value.label}px ${colWidths.value.date}px minmax(${CATEGORIES_MIN_PX}px, 1fr) ${UPDATED_COL_PX}px ${ACTION_COL_PX}px`,
);

const gridColumnVars = computed(() => ({
  '--events-view-grid-cols': eventsViewGridCols.value,
}));

function toggleSort(col: SortColumn) {
  if (sortColumn.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = col;
    sortDir.value = 'asc';
  }
}

const displayEvents = computed(() => {
  const list = [...filteredEvents.value];
  const col = sortColumn.value;
  if (!col) return list;
  const asc = sortDir.value === 'asc';

  list.sort((a, b) => {
    let cmp = 0;
    if (col === 'label') {
      cmp = (a.label.fr || '').localeCompare(b.label.fr || '', 'fr', { sensitivity: 'base' });
    } else if (col === 'date') {
      const ya = listEventYearsBP(a);
      const yb = listEventYearsBP(b);
      cmp = yb - ya;
    } else if (col === 'categories') {
      cmp = listEventCategoriesSortKey(a).localeCompare(listEventCategoriesSortKey(b), 'fr', {
        sensitivity: 'base',
      });
    } else if (col === 'updated') {
      cmp = listEventUpdatedTimestampMs(a) - listEventUpdatedTimestampMs(b);
    }
    return asc ? cmp : -cmp;
  });
  return list;
});

let resizeState: { key: ResizableCol; startX: number; startW: number } | null = null;

function onResizeMove(e: MouseEvent) {
  if (!resizeState) return;
  const delta = e.clientX - resizeState.startX;
  const key = resizeState.key;
  const w = Math.min(COL_MAX[key], Math.max(COL_MIN[key], resizeState.startW + delta));
  colWidths.value = { ...colWidths.value, [key]: w };
}

function stopResize() {
  if (!resizeState) return;
  resizeState = null;
  document.body.classList.remove('events-table-resizing');
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', stopResize);
}

function startResize(key: ResizableCol, e: MouseEvent) {
  resizeState = { key, startX: e.clientX, startW: colWidths.value[key] };
  document.body.classList.add('events-table-resizing');
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', stopResize);
}

onUnmounted(() => {
  stopResize();
});

// ── Filtres ────────────────────────────────────────────────────────────────────

const search = ref('');
const selectedPeriodId = ref('');
const selectedCategoryId = ref('');

const availableCategories = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const e of events.value) {
    for (const cat of e.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as any);
    }
  }
  return [...map.values()].sort((a, b) => a.label.fr.localeCompare(b.label.fr));
});

const categorySelectOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...availableCategories.value.map(c => ({ value: c.id, label: c.label.fr })),
]);

const selectedPeriod = computed(() =>
  selectedPeriodId.value
    ? periods.value.find(p => p.id === selectedPeriodId.value) ?? null
    : null
);

const filteredEvents = computed(() => {
  const q = search.value.trim().toLowerCase();

  return events.value.filter((e: any) => {
    // Filtre texte
    if (q && !e.label.fr.toLowerCase().includes(q)) return false;

    // Filtre catégorie
    if (selectedCategoryId.value) {
      if (!e.categories?.some((c: any) => c.id === selectedCategoryId.value)) return false;
    }

    // Filtre période
    if (selectedPeriod.value) {
      const p = selectedPeriod.value;
      const startYBP = p.startYearsBP ?? DateService.toYearsBP(p.startDate);
      const endYBP = p.endYearsBP != null ? p.endYearsBP
                   : (p.endDate && p.endDate !== 'NOW' ? DateService.toYearsBP(p.endDate) : 0);
      const eventYBP = listEventYearsBP(e);
      if (eventYBP > startYBP || eventYBP < endYBP) return false;
    }

    return true;
  });
});

// ── Modal ──────────────────────────────────────────────────────────────────────

const modalState = ref<{
  show: boolean;
  mode: 'create' | 'edit';
  item: any;
}>({ show: false, mode: 'create', item: null });

const openCreateModal = () => {
  modalState.value = { show: true, mode: 'create', item: null };
};

const openEditModal = (event: ListEvent) => {
  const full = events.value.find(e => e.id === event.id);
  modalState.value = {
    show: true,
    mode: 'edit',
    item: {
      ...(full ?? event),
      description: (full as any)?.description ?? { fr: '', en: '' },
      categories: (full as any)?.categories ?? [],
    },
  };
};

const closeModal = () => {
  modalState.value.show = false;
  modalState.value.item = null;
};

// ── Sauvegarde / suppression ───────────────────────────────────────────────────

const { handleSave: saveHandler } = useDatabaseSave();
const { handleDelete: deleteHandler } = useDatabaseDelete();

const handleSave = async (formData: any) => {
  const success = await saveHandler(formData, 'event', modalState.value.mode, modalState.value.item);
  if (success) closeModal();
};

const handleDelete = async () => {
  const success = await deleteHandler(modalState.value.item, 'event');
  if (success) closeModal();
};

// ── Init ───────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    dataStore.ensureEventsLoaded(),
    dataStore.ensureRootsLoaded(),
  ]);
  loading.value = false;
});
</script>

<style scoped>
.events-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-md);
  box-sizing: border-box;
  gap: var(--spacing-md);
  background: var(--color-neutral-0);
}

/* ── Toolbar ── */

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.filters {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.events-toolbar-search {
  width: calc(var(--spacing-xs) * 55);
  flex-shrink: 0;
}

.events-toolbar-select {
  width: calc(var(--spacing-xs) * 55);
  flex-shrink: 0;
}

.period-filter {
  width: 100%;
  min-width: min(100%, 320px);
  max-width: calc(var(--spacing-xs) * 105);
  flex-shrink: 0;
}

/* ── Table ── */

.table-wrap {
  flex: 1;
  min-height: 0;
  background: var(--color-neutral-100);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.events-view__table-columns {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.events-view__table-columns .table-header,
.events-view__table-columns .table-row {
  grid-template-columns: var(--events-view-grid-cols);
}

.table-header,
.table-row {
  display: grid;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
}

.table-header {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-light);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-background);
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
  cursor: pointer;
  gap: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
}

.th-sortable:hover {
  color: var(--color-text);
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
  overflow-y: auto;
}

.table-row {
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--color-neutral-200);
  box-shadow: inset 4px 0 0 var(--color-primary);
}

.col-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.col-date {
  color: var(--color-text-light);
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.col-updated {
  color: var(--color-text);
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.col-categories {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.category-tag {
  flex-shrink: 0;
  display: inline-block;
  padding: 1px calc(var(--spacing-md) / 2);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
}

.col-actions :deep(.base-button) {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.table-row:hover .col-actions :deep(.base-button) {
  opacity: 1;
}

.empty {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--color-text-light);
  font-style: italic;
  font-size: var(--font-size-sm);
}
</style>

<style>
/* Curseur pendant le drag des colonnes (classe posée sur document.body) */
body.events-table-resizing {
  cursor: col-resize !important;
  user-select: none;
}
</style>
