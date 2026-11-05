<template>
  <div class="catalogue-view">
    <CatalogueToolbar v-model:search="search" placeholder="Rechercher un événement…">
      <template #filters>
        <CatalogueFilters context="events" v-model:categories="selectedCategoryIds" v-model:story-ids="selectedStoryIds" v-model:time-range="timeRange" v-model:period="periodFilter"
          :category-options="categorySelectOptions" :story-options="storySelectOptions"
          :stories-loading="storyLinks.loading.value" :stories-error="storyLinks.error.value" @retry-stories="storyLinks.load" />
      </template>
      <template #actions><Button variant="primary" size="sm" @click="openCreateModal">+ Ajouter un événement</Button></template>
    </CatalogueToolbar>

    <div v-if="targetLoading || targetError" :role="targetError ? 'alert' : 'status'">
      {{ targetError || 'Ouverture du résultat…' }}
      <Button variant="tertiary" size="sm" v-if="targetError" type="button" @click="retryTarget">Réessayer</Button>
      <Button variant="tertiary" size="sm" type="button" @click="cancelTarget">Annuler</Button>
    </div>
    <p v-if="storyLinks.error.value" role="alert" class="links-error">
      Frises des événements indisponibles : {{ storyLinks.error.value }}
      <Button variant="tertiary" size="sm" type="button" @click="storyLinks.load">Réessayer</Button>
    </p>
    <CatalogueBulkBar :count="bulk.selected.value.length" :actions="bulk.actions" :stories="bulk.editableStories.value" :busy="bulk.busy.value" :message="bulk.message.value" :failures="bulk.failures.value" :uncertain="bulk.uncertain.value" @apply="bulk.run" @clear="bulk.selectedIds.value = []" @reload="bulk.reload" />
    <CatalogueTable v-model:selected-ids="bulk.selectedIds.value" selectable :selection-disabled="bulk.busy.value || bulk.uncertain.value" :item-label="item => item.label.fr || item.label.en || item.id" label="Événements" :columns="eventColumns" :items="displayEvents"
      empty-text="Aucun événement trouvé" :loading="loading || (!!selectedStoryIds.length && storyLinks.loading.value)" :error="loadError || (selectedStoryIds.length ? storyLinks.error.value : null)"
      :sort-column="sortColumn" :sort-dir="sortDir" @sort="toggleSort($event as SortColumn)" @retry="loadData(); storyLinks.load()">
      <template #row="{ item: event }">
        <span class="col-label" role="cell">{{ event.label.fr }}</span>
        <span class="col-date" role="cell">{{ formatEventListDateForDisplay(event.date) }}</span>
        <span class="col-categories" role="cell">
          <Tag v-for="cat in event.categories" :key="cat.id" :label="cat.label.fr" variant="accent" />
        </span>
        <span class="col-stories" role="cell">
          <span v-if="storyLinks.loading.value" class="col-stories__state">…</span>
          <span v-else-if="storyLinks.error.value" class="col-stories__state">—</span>
          <template v-else>
            <Tag v-for="story in storiesOf(event.id)" :key="story.id" :to="{ path: '/timeline', query: { story: story.id } }" :label="story.title" />
            <span v-if="!storiesOf(event.id).length" class="col-stories__state">Aucune</span>
          </template>
        </span>
        <span class="col-updated" role="cell">{{ formatListEventLastEditFr(event) }}</span>
        <span class="col-actions" role="cell">
          <Button variant="tertiary" size="sm" :aria-label="`Modifier ${event.label.fr}`" @click="openEditModal(event)">Modifier</Button>
        </span>
      </template>
    </CatalogueTable>

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
          :owns-story="auth.canEditStory"
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
import { ref, computed, onMounted } from 'vue';
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
import {
  formatEventListDateForDisplay,
  formatListEventLastEditFr,
  listEventCategoriesSortKey,
  listEventUpdatedTimestampMs,
  listEventYearsBP,
} from '@/lib/listEventTableHelpers';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import CatalogueToolbar from '@/components/filters/CatalogueToolbar.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import CatalogueBulkBar from '@/components/catalogue/CatalogueBulkBar.vue';
import { useEntityBulkActions } from '@/composables/useEntityBulkActions';
import type { CatalogueColumn } from '@/components/catalogue/columns';
import type { ListEvent } from '@/types/database';

// ── Store ──────────────────────────────────────────────────────────────────────

const dataStore = useDataStore();
const auth = useAuthStore();
const { events, stories } = storeToRefs(dataStore);
const storyLinks = useStoryLinks('event');
const storiesOf = (eventId: string) => storyLinks.storyIdsOf(eventId).map(id => ({
  id, title: dataStore.storyById(id)?.title.fr || `Frise ${id}`,
}));
const loading = ref(false);
const loadError = ref<string | null>(null);
const requests = useLatestRequest();

type SortColumn = 'label' | 'date' | 'categories' | 'stories' | 'updated';
const sortColumn = ref<SortColumn | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const eventColumns: CatalogueColumn[] = [
  { key: 'label', label: 'Nom', sortLabel: 'Trier par nom', width: 360, minWidth: 140, maxWidth: 720, resizable: true },
  { key: 'date', label: 'Date', sortLabel: 'Trier par date', width: 160, minWidth: 100, maxWidth: 280, resizable: true },
  { key: 'categories', label: 'Catégories', sortLabel: 'Trier par catégories', minWidth: 120 },
  { key: 'stories', label: 'Frises', sortLabel: 'Trier par frises', minWidth: 160 },
  { key: 'updated', label: 'Modifié', sortLabel: 'Trier par modification', width: 150 },
  { key: 'actions', label: 'Actions', width: 88 },
];

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
    } else if (col === 'stories') {
      cmp = storyLinks.sortKeyOf(a.id).localeCompare(storyLinks.sortKeyOf(b.id), 'fr', { sensitivity: 'base' });
    } else if (col === 'updated') {
      cmp = listEventUpdatedTimestampMs(a) - listEventUpdatedTimestampMs(b);
    }
    return asc ? cmp : -cmp;
  });
  return list;
});

// ── Filtres ────────────────────────────────────────────────────────────────────

const search = ref('');
const selectedCategoryIds = ref<string[]>([]);
const selectedStoryIds = ref<string[]>([]);
const timeRange = ref<StoryTimeRange | null>(null);
const periodFilter = ref<PeriodFilter | null>(null);

const availableCategories = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const e of events.value) {
    for (const cat of e.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat);
    }
  }
  return [...map.values()].sort((a, b) => a.label.fr.localeCompare(b.label.fr));
});

const categorySelectOptions = computed(() => availableCategories.value.map(c => ({ value: c.id, label: c.label.fr })));
const storySelectOptions = computed(() => stories.value.map(story => ({ value: story.id, label: story.title.fr || story.title.en || `Frise ${story.id}` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr')));

const filteredEvents = computed(() => {
  const q = search.value.trim().toLowerCase();

  return events.value.filter(e => {
    // Filtre texte
    if (q && !e.label.fr.toLowerCase().includes(q)) return false;

    // Filtre catégorie
    if (selectedCategoryIds.value.length) {
      if (!e.categories?.some(c => selectedCategoryIds.value.includes(c.id))) return false;
    }

    if (selectedStoryIds.value.length && !selectedStoryIds.value.some(id => storyLinks.storyIdsOf(e.id).includes(id))) return false;
    for (const range of [timeRange.value, periodFilter.value?.range]) {
      if (!range) continue;
      const date = listEventYearsBP(e);
      if (date === null || date > range.oldBP || date < range.recentBP) return false;
    }

    return true;
  });
});
const bulk = useEntityBulkActions('event', () => displayEvents.value, storyLinks);

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

<style scoped src="@/components/catalogue/catalogue-view.css"></style>
