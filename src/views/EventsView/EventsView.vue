<template>
  <div class="events-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <div class="events-toolbar-search">
          <SearchInput v-model="search" placeholder="Rechercher un événement…" />
        </div>
        <PeriodSelect
          v-model="selectedPeriodId"
          compact
          class="period-filter"
        />
        <div class="events-toolbar-select">
          <Select
            v-model="selectedCategoryId"
            :options="categorySelectOptions"
            placeholder="Toutes les catégories"
            :searchable="categorySelectOptions.length > 10"
            size="sm"
          />
        </div>
      </div>
      <Button variant="primary" size="sm" @click="openCreateModal">+ Ajouter un événement</Button>
    </div>

    <p class="table-scroll-hint">Faites défiler le tableau horizontalement pour voir toutes les colonnes.</p>
    <div v-if="targetLoading || targetError" :role="targetError ? 'alert' : 'status'">
      {{ targetError || 'Ouverture du résultat…' }}
      <button v-if="targetError" type="button" @click="retryTarget">Réessayer</button>
      <button type="button" @click="cancelTarget">Annuler</button>
    </div>
    <p v-if="storyLinks.error.value" role="alert" class="links-error">
      Frises des événements indisponibles : {{ storyLinks.error.value }}
      <button type="button" @click="storyLinks.load">Réessayer</button>
    </p>
    <!-- Table -->
    <div class="table-wrap" role="region" aria-label="Tableau des événements" tabindex="0">
      <div v-if="loading" class="empty" role="status">Chargement…</div>
      <div v-else-if="loadError" role="alert">{{ loadError }} <button type="button" @click="loadData">Réessayer</button></div>
      <template v-else>
        <div class="events-view__table-columns" :style="gridColumnVars" role="table" aria-label="Événements">
        <div class="table-header" role="row">
          <div class="th-cell col-label" role="columnheader" :aria-sort="sortState('label')">
            <button type="button" class="th-sortable" @click="toggleSort('label')" aria-label="Trier par nom">
            <span class="th-title">Nom</span>
            <span v-if="sortColumn === 'label'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            </button>
            <div
              class="resize-handle"
              role="separator" aria-orientation="vertical" aria-label="Largeur de la colonne Nom" tabindex="0"
              :aria-valuenow="colWidths.label" :aria-valuemin="COL_MIN.label" :aria-valuemax="COL_MAX.label"
              @keydown="resizeWithKeyboard('label', $event)"
              @mousedown.stop.prevent="startResize('label', $event)"
              @click.stop
            />
          </div>
          <div class="th-cell col-date" role="columnheader" :aria-sort="sortState('date')">
            <button type="button" class="th-sortable" @click="toggleSort('date')" aria-label="Trier par date">
            <span class="th-title">Date</span>
            <span v-if="sortColumn === 'date'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            </button>
            <div
              class="resize-handle"
              role="separator" aria-orientation="vertical" aria-label="Largeur de la colonne Date" tabindex="0"
              :aria-valuenow="colWidths.date" :aria-valuemin="COL_MIN.date" :aria-valuemax="COL_MAX.date"
              @keydown="resizeWithKeyboard('date', $event)"
              @mousedown.stop.prevent="startResize('date', $event)"
              @click.stop
            />
          </div>
          <div class="th-cell col-categories th-cell--no-handle" role="columnheader" :aria-sort="sortState('categories')">
            <button type="button" class="th-sortable" @click="toggleSort('categories')" aria-label="Trier par catégories">
            <span class="th-title">Catégories</span>
            <span v-if="sortColumn === 'categories'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            </button>
          </div>
          <div class="th-cell col-stories th-cell--no-handle" role="columnheader">Frises</div>
          <div class="th-cell col-updated th-cell--no-handle" role="columnheader" :aria-sort="sortState('updated')">
            <button type="button" class="th-sortable" @click="toggleSort('updated')" aria-label="Trier par modification">
            <span class="th-title">Modifié</span>
            <span v-if="sortColumn === 'updated'" class="sort-indicator" aria-hidden="true">{{
              sortDir === 'asc' ? '▲' : '▼'
            }}</span>
            </button>
          </div>
          <div class="th-cell col-actions th-cell--no-handle" role="columnheader">Actions</div>
        </div>
        <div class="table-body" role="rowgroup">
          <div v-if="displayEvents.length === 0" class="empty" role="row"><span role="cell" aria-colspan="6">Aucun événement trouvé</span></div>
          <div
            v-for="event in displayEvents"
            :key="event.id"
            class="table-row"
            role="row"
          >
            <span class="col-label" role="cell">{{ event.label.fr }}</span>
            <span class="col-date" role="cell">{{ formatEventListDateForDisplay(event.date) }}</span>
            <span class="col-categories" role="cell">
              <span
                v-for="cat in event.categories"
                :key="cat.id"
                class="category-tag"
              >
                {{ cat.label.fr }}
              </span>
            </span>
            <span class="col-stories" role="cell">
              <span v-if="storyLinks.loading.value" class="col-stories__state">…</span>
              <span v-else-if="storyLinks.error.value" class="col-stories__state">—</span>
              <template v-else>
                <RouterLink
                  v-for="story in storiesOf(event.id)"
                  :key="story.id"
                  :to="{ path: '/timeline', query: { story: story.id } }"
                  class="story-tag"
                >{{ story.title }}</RouterLink>
                <span v-if="!storiesOf(event.id).length" class="col-stories__state">Aucune</span>
              </template>
            </span>
            <span class="col-updated" role="cell">{{ formatListEventLastEditFr(event) }}</span>
            <span class="col-actions" role="cell">
              <Button variant="tertiary" size="sm" :aria-label="`Modifier ${event.label.fr}`" @click="openEditModal(event)">Modifier</Button>
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
      :data="modalState.mode === 'create' ? creationDraft : modalState.item"
      :loading="saveLoading || deleteLoading"
      :error="saveError"
      @close="closeModal"
      @submit="handleSave"
      @delete="handleDelete"
    >
      <template v-if="modalState.mode === 'edit' && modalState.item" #after-form>
        <StoryMembershipField
          :story-ids="storyLinks.storyIdsOf(modalState.item.id)"
          :stories="stories"
          :owns-story="auth.ownsStory"
          empty-text="Cet événement n’appartient à aucune frise visible."
          :loading="storyLinks.loading.value"
          :load-error="storyLinks.error.value"
          :pending="storyLinks.pending.value"
          :change-error="storyLinks.changeError.value"
          @retry="storyLinks.load"
          @add="id => storyLinks.change(modalState.item!.id, id, false)"
          @remove="id => storyLinks.change(modalState.item!.id, id, true)"
        />
      </template>
    </EditModal>
  </div>
</template>

<script setup lang="ts">
import type { EditFormSubmission, EditInitialData } from '@/types/editForm';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { useSearchTarget } from '@/composables/useSearchTarget';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStoryLinks } from '@/composables/useStoryLinks';
import StoryMembershipField from '@/components/StoryMembershipField.vue';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';
import { compareYearsOldestFirst } from '@temporal';
import { periodCoordinates } from '@/services/TimelineScalingService';
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
import PeriodSelect from '@/components/PeriodSelect.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import type { ListEvent } from '@/types/database';

// ── Store ──────────────────────────────────────────────────────────────────────

const dataStore = useDataStore();
const auth = useAuthStore();
const { events, periods, stories } = storeToRefs(dataStore);
const storyLinks = useStoryLinks('event');
const storiesOf = (eventId: string) => storyLinks.storyIdsOf(eventId).map(id => ({
  id, title: dataStore.storyById(id)?.title.fr || `Frise ${id}`,
}));
const loading = ref(false);
const loadError = ref<string | null>(null);
const requests = useLatestRequest();

const ACTION_COL_PX = 88;
const UPDATED_COL_PX = 150;
const CATEGORIES_MIN_PX = 120;
const STORIES_MIN_PX = 160;
const COL_MIN = { label: 140, date: 100 } as const;
const COL_MAX = { label: 720, date: 280 } as const;

type ResizableCol = keyof typeof COL_MIN;
type SortColumn = 'label' | 'date' | 'categories' | 'updated';

const colWidths = ref({ label: 360, date: 160 });

const sortColumn = ref<SortColumn | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const eventsViewGridCols = computed(
  () =>
    `${colWidths.value.label}px ${colWidths.value.date}px minmax(${CATEGORIES_MIN_PX}px, 1fr) minmax(${STORIES_MIN_PX}px, 1fr) ${UPDATED_COL_PX}px ${ACTION_COL_PX}px`,
);

const gridColumnVars = computed(() => ({
  '--events-view-grid-cols': eventsViewGridCols.value,
  minWidth: `calc(${colWidths.value.label + colWidths.value.date + CATEGORIES_MIN_PX + STORIES_MIN_PX + UPDATED_COL_PX + ACTION_COL_PX}px + var(--spacing-sm) * 5 + var(--spacing-md) * 2)`,
}));
const sortState = (column: SortColumn) => sortColumn.value === column ? sortDir.value === 'asc' ? 'ascending' : 'descending' : undefined;
function resizeWithKeyboard(column: ResizableCol, event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const value = event.key === 'Home' ? COL_MIN[column] : event.key === 'End' ? COL_MAX[column] : colWidths.value[column] + (event.key === 'ArrowRight' ? 10 : -10);
  colWidths.value = { ...colWidths.value, [column]: Math.min(COL_MAX[column], Math.max(COL_MIN[column], value)) };
}

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
      if (ya === null || yb === null) return compareYearsOldestFirst(ya, yb);
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
      if (!map.has(cat.id)) map.set(cat.id, cat);
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

  return events.value.filter(e => {
    // Filtre texte
    if (q && !e.label.fr.toLowerCase().includes(q)) return false;

    // Filtre catégorie
    if (selectedCategoryId.value) {
      if (!e.categories?.some(c => c.id === selectedCategoryId.value)) return false;
    }

    // Filtre période
    if (selectedPeriod.value) {
      const p = selectedPeriod.value;
      const { start: startYBP, end: endYBP } = periodCoordinates(p);
      const eventYBP = listEventYearsBP(e);
      if (startYBP === null || endYBP === null || eventYBP === null || eventYBP > startYBP || eventYBP < endYBP) return false;
    }

    return true;
  });
});

// ── Modal ──────────────────────────────────────────────────────────────────────

const modalState = ref<{
  show: boolean;
  mode: 'create' | 'edit';
  item: ListEvent | null;
}>({ show: false, mode: 'create', item: null });
const creationDraft = ref<EditInitialData | null>(null);

const openCreateModal = () => {
  cancelTarget();
  creationDraft.value = null;
  saveError.value = null;
  modalState.value = { show: true, mode: 'create', item: null };
};

const openEditModal = (event: ListEvent) => {
  cancelTarget();
  saveError.value = null;
  const full = events.value.find(e => e.id === event.id);
  modalState.value = {
    show: true,
    mode: 'edit',
    item: {
      ...(full ?? event),
      description: full?.description ?? { fr: '', en: '' },
      categories: full?.categories ?? [],
    },
  };
};

const closeModal = () => {
  modalState.value.show = false;
  modalState.value.item = null;
  creationDraft.value = null;
};

// ── Sauvegarde / suppression ───────────────────────────────────────────────────

const { handleSave: saveHandler, loading: saveLoading, error: saveError } = useDatabaseSave();
const { handleDelete: deleteHandler, loading: deleteLoading } = useDatabaseDelete();

const initialized = ref(false);
const { loading: targetLoading, error: targetError, retry: retryTarget, cancel: cancelTarget } = useSearchTarget(
  'event', () => initialized.value && !loading.value && !loadError.value,
  async (target, isCurrent) => {
    saveError.value = null;
    if (target.kind === 'wikidata') {
      creationDraft.value = { wikidata_id: target.qid };
      modalState.value = { show: true, mode: 'create', item: null };
    } else {
      let event = dataStore.eventById(target.id);
      if (!event) {
        await dataStore.ensureEventsLoaded(true);
        if (!isCurrent()) return;
        event = dataStore.eventById(target.id);
      }
      if (!event) throw new Error('Événement introuvable dans le catalogue.');
      modalState.value = { show: true, mode: 'edit', item: event };
    }
  }, closeModal,
);

const handleSave = async (formData: EditFormSubmission) => {
  if (saveLoading.value || deleteLoading.value) return;
  const success = await saveHandler(formData, 'event', modalState.value.mode, modalState.value.item);
  if (success) closeModal();
};

const handleDelete = async () => {
  if (saveLoading.value || deleteLoading.value) return;
  const success = await deleteHandler(modalState.value.item, 'event');
  if (success) closeModal();
};

// ── Init ───────────────────────────────────────────────────────────────────────

const loadData = async () => {
  const isCurrent = requests.begin();
  loading.value = true;
  loadError.value = null;
  try {
    await Promise.all([dataStore.ensureEventsLoaded(), dataStore.ensureRootsLoaded()]);
  } catch (cause) {
    if (isCurrent()) loadError.value = cause instanceof Error ? cause.message : 'Erreur de chargement';
  } finally {
    if (isCurrent()) loading.value = false;
    if (isCurrent()) initialized.value = true;
  }
};
onMounted(() => { void loadData(); void storyLinks.load(); });

</script>

<style scoped>
.events-view {
  min-width: 0;
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
  overflow: auto;
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
  overflow-x: hidden;
}

@media (max-width: 1200px) {
  .toolbar, .filters { flex-wrap: wrap; }
  .filters { flex-basis: 100%; }
  .events-toolbar-search, .events-toolbar-select, .period-filter { flex: 1 1 180px; width: auto; min-width: 0; max-width: none; }
}
@media (max-width: 480px) {
  .events-toolbar-search, .events-toolbar-select, .period-filter { flex-basis: 100%; }
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

.col-stories {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.story-tag {
  flex-shrink: 0;
  padding: 1px calc(var(--spacing-md) / 2);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
  color: var(--color-text);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  text-decoration: none;
}

.story-tag:hover,
.story-tag:focus-visible {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.col-stories__state {
  color: var(--color-text-light);
  font-size: var(--font-size-xs);
}

.links-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.col-actions {
  display: flex;
  justify-content: flex-end;
}

.col-actions :deep(.base-button) {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.table-row:hover .col-actions :deep(.base-button),
.table-row:focus-within .col-actions :deep(.base-button) {
  opacity: 1;
}

.table-scroll-hint { display: none; margin: 0; font-size: var(--font-size-xs); color: var(--color-text-light); }
@media (max-width: 1024px) { .table-scroll-hint { display: block; } }
@media (hover: none) { .col-actions :deep(.base-button) { opacity: 1; } }

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
