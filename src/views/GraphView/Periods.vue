<template>
  <div class="catalogue-view">
    <CatalogueToolbar v-model:search="filterSearch" placeholder="Rechercher une période…">
      <template #filters>
        <CatalogueFilters context="periods" v-model:tags="tagIds" v-model:story-ids="filterStoryIds" v-model:time-range="timeRange"
          :tag-options="periodTagFilterOptions" :story-options="storyFilterOptions"
          :stories-loading="storyLinks.loading.value" :stories-error="storyLinks.error.value" @retry-stories="storyLinks.load" />
      </template>
      <template #actions><Button variant="primary" size="sm" @click="openCreateModal">+ Ajouter une période</Button></template>
    </CatalogueToolbar>
    <div v-if="targetLoading || targetError" class="finder-feedback" :role="targetError ? 'alert' : 'status'">
      {{ targetError || 'Ouverture du résultat…' }}
      <Button variant="tertiary" size="sm" v-if="targetError" type="button" @click="retryTarget">Réessayer</Button>
      <Button variant="tertiary" size="sm" type="button" @click="cancelTarget">Annuler</Button>
    </div>
    <div v-if="openingLoading || openingError" class="finder-feedback" :role="openingError ? 'alert' : 'status'">
      {{ openingError || 'Chargement du formulaire…' }}
      <Button variant="tertiary" size="sm" v-if="openingError" type="button" @click="retryOpening">Réessayer</Button>
      <Button variant="tertiary" size="sm" type="button" @click="cancelOpening">Annuler</Button>
    </div>
    <p v-if="storyLinks.error.value" role="alert" class="links-error">
      Frises des périodes indisponibles : {{ storyLinks.error.value }}
      <Button variant="tertiary" size="sm" type="button" @click="storyLinks.load">Réessayer</Button>
    </p>
    <CatalogueBulkBar :count="bulk.selected.value.length" :actions="bulk.actions" :stories="bulk.editableStories.value" :busy="bulk.busy.value" :message="bulk.message.value" :failures="bulk.failures.value" :uncertain="bulk.uncertain.value" @apply="bulk.run" @clear="bulk.selectedIds.value = []" @reload="bulk.reload" />
    <CatalogueTable v-model:selected-ids="bulk.selectedIds.value" selectable :selection-disabled="bulk.busy.value || bulk.uncertain.value" :item-label="item => item.label.fr || item.label.en || item.id" label="Périodes" :columns="periodColumns" :items="visiblePeriods" empty-text="Aucune période trouvée"
      :sort-column="sortColumn" :sort-dir="sortDir" :loading="loading || (!!filterStoryIds.length && storyLinks.loading.value)"
      :error="error || (filterStoryIds.length ? storyLinks.error.value : null)" @retry="retryTable" @sort="toggleSort($event as SortColumn)">
      <template #row="{ item }">
        <span class="col-label" role="cell">{{ item.label.fr || item.label.en }}</span>
        <span class="col-date" role="cell">{{ formatEventListDateForDisplay(item.startDate) }}</span>
        <span class="col-date" role="cell">{{ formatEventListDateForDisplay(item.endDate) }}</span>
        <span class="col-categories" role="cell"><ThematicTags :tags="item.tags ?? []" /></span>
        <span class="col-stories" role="cell">
          <span v-if="storyLinks.loading.value" class="col-stories__state">…</span>
          <span v-else-if="storyLinks.error.value" class="col-stories__state">—</span>
          <template v-else>
            <Tag v-for="story in storiesOf(item.id)" :key="story.id" :to="{ path: '/timeline', query: { story: story.id } }"  :label="story.title" />
            <span v-if="!storiesOf(item.id).length" class="col-stories__state">Aucune</span>
          </template>
        </span>
        <span class="col-updated" role="cell">{{ formatListEventLastEditFr(item) }}</span>
        <span class="col-actions" role="cell"><Button variant="tertiary" size="sm" :aria-label="`Modifier ${item.label.fr || item.label.en}`" @click="openEditModal(item.id)">Modifier</Button></span>
      </template>
    </CatalogueTable>
    <EditModal
      v-if="showEditModal"
      :is-open="showEditModal"
      :type="'period'"
      :mode="'edit'"
      :data="selectedPeriod"
      :loading="busy"
      :error="saveError"
      @close="closeEditModal"
      @submit="handleEditSubmit"
      @delete="handleDelete"
    >
      <template v-if="selectedPeriod" #after-form>
        <StoryMembershipField
          :story-ids="storyLinks.storyIdsOf(selectedPeriod.id)"
          :stories="stories"
          :owns-story="auth.canEditStory"
          empty-text="Cette période n’appartient à aucune frise visible."
          :loading="storyLinks.loading.value"
          :load-error="storyLinks.error.value"
          :pending="storyLinks.pending.value"
          :change-error="storyLinks.changeError.value"
          @retry="storyLinks.load"
          @add="id => storyLinks.change(selectedPeriod!.id, id, false)"
          @remove="id => storyLinks.change(selectedPeriod!.id, id, true)"
        />
      </template>
    </EditModal>
    <EditModal
      v-if="showAddModal"
      :is-open="showAddModal"
      :type="'period'"
      :mode="'create'"
      :data="addModalInitialData ?? undefined"
      :loading="busy"
      :error="addError"
      @close="closeAddModal"
      @submit="handleAddSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import CatalogueBulkBar from '@/components/catalogue/CatalogueBulkBar.vue';
import { useEntityBulkActions } from '@/composables/useEntityBulkActions';
import type { CatalogueColumn } from '@/components/catalogue/columns';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import ThematicTags from '@/components/ThematicTags.vue';
import { useCatalogueFilterState } from '@/composables/useCatalogueFilterState';
import { matchesCatalogueFilters } from '@/lib/catalogueFilters';
import { tagFilterOptions, tagsSortKey } from '@/lib/tags';
import { compareYearsOldestFirst } from '@temporal';
import { periodCoordinates } from '@/services/TimelineScalingService';
import { formatEventListDateForDisplay, formatListEventLastEditFr, listEventUpdatedTimestampMs } from '@/lib/listEventTableHelpers';
import CatalogueToolbar from '@/components/filters/CatalogueToolbar.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import { storyOverlapsRange } from '@/lib/storyTimeFilter';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import StoryMembershipField from '@/components/StoryMembershipField.vue';
import { useGraphModals } from '@/composables/useGraphModals';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStoryLinks } from '@/composables/useStoryLinks';
import { useSearchTarget } from '@/composables/useSearchTarget';
import { PeriodApiService } from '@/services/PeriodApiService';
import type { EditFormSubmission } from '@/types/editForm';

const store = useDataStore();
const auth = useAuthStore();
const { stories } = storeToRefs(store);
const storyLinks = useStoryLinks('period');
const storiesOf = (id: string) => storyLinks.storyIdsOf(id).map(storyId => ({ id: storyId, title: store.storyById(storyId)?.title.fr || `Frise ${storyId}` }));
type SortColumn = 'label' | 'start' | 'end' | 'categories' | 'stories' | 'updated';
const sortColumn = ref<SortColumn>('label');
const sortDir = ref<'asc' | 'desc'>('asc');
const periodColumns: CatalogueColumn[] = [
  { key: 'label', label: 'Nom', sortLabel: 'Trier par nom', width: 360, minWidth: 140, maxWidth: 720, resizable: true },
  { key: 'start', label: 'Début', sortLabel: 'Trier par début', width: 160, minWidth: 100, maxWidth: 280, resizable: true },
  { key: 'end', label: 'Fin', sortLabel: 'Trier par fin', width: 160, minWidth: 100, maxWidth: 280, resizable: true },
  { key: 'categories', label: 'Tags', sortLabel: 'Trier par tags', minWidth: 120 },
  { key: 'stories', label: 'Frises', sortLabel: 'Trier par frises', minWidth: 160 },
  { key: 'updated', label: 'Modifié', sortLabel: 'Trier par modification', width: 150 },
  { key: 'actions', label: 'Actions', width: 88 },
];
function toggleSort(column: SortColumn) {
  sortDir.value = sortColumn.value === column && sortDir.value === 'asc' ? 'desc' : 'asc';
  sortColumn.value = column;
}
const loading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);
const filterSearch = ref('');
const { tagIds, storyIds: filterStoryIds, timeRange, state: filterState, reset: resetFilters } = useCatalogueFilterState();
const storyFilterOptions = computed(() => stories.value.map(story => ({ value: story.id, label: story.title.fr || story.title.en || `Frise ${story.id}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr')));
const allPeriods = computed(() => store.periods.filter(p => !p.id.startsWith('wikidata:')));
const visiblePeriods = computed(() => {
  const q = filterSearch.value.trim().toLocaleLowerCase('fr');
  return allPeriods.value.filter(p => matchesCatalogueFilters(p, filterState.value, { storyIdsOf: item => storyLinks.storyIdsOf(item.id), overlaps: storyOverlapsRange })
    && (!q || [p.label.fr, p.label.en, p.description?.fr, p.description?.en].some(v => v?.toLocaleLowerCase('fr').includes(q))))
    .sort((a, b) => {
      let comparison = 0;
      if (sortColumn.value === 'start' || sortColumn.value === 'end') {
        const key = sortColumn.value;
        const ya = periodCoordinates(a)[key], yb = periodCoordinates(b)[key];
        if (ya === null || yb === null) return compareYearsOldestFirst(ya, yb);
        comparison = yb - ya;
      } else if (sortColumn.value === 'categories') comparison = tagsSortKey(a).localeCompare(tagsSortKey(b), 'fr', { sensitivity: 'base' });
      else if (sortColumn.value === 'stories') comparison = storyLinks.sortKeyOf(a.id).localeCompare(storyLinks.sortKeyOf(b.id), 'fr', { sensitivity: 'base' });
      else if (sortColumn.value === 'updated') comparison = listEventUpdatedTimestampMs(a) - listEventUpdatedTimestampMs(b);
      else comparison = (a.label.fr || a.label.en).localeCompare(b.label.fr || b.label.en, 'fr', { sensitivity: 'base' });
      return sortDir.value === 'asc' ? comparison : -comparison;
    });
});
const periodTagFilterOptions = computed(() => tagFilterOptions(allPeriods.value));
const bulk = useEntityBulkActions('period', () => visiblePeriods.value, storyLinks);
const {
  showEditModal, showAddModal, selectedPeriod, loading: openingLoading, openingError, retryOpening, cancelOpening,
  addModalInitialData, handleEdit, handleDelete, busy, saveError, addError, closeEditModal, handleEditSubmit,
  handleAddPeriod, closeAddModal, handleAddSubmit: submit,
} = useGraphModals();
const handleAddSubmit = (data: EditFormSubmission) => submit(data, []);
function openCreateModal() {
  cancelTarget();
  handleAddPeriod(0);
}
function openEditModal(id: string) {
  cancelTarget();
  void handleEdit(id);
}
watch([filterSearch, tagIds, filterStoryIds, timeRange], cancelOpening, { flush: 'sync' });
watch(() => showEditModal.value && selectedPeriod.value?.id, id => { if (id) void storyLinks.load(); });
const { loading: targetLoading, error: targetError, retry: retryTarget, cancel: cancelTarget } = useSearchTarget(
  'period', () => initialized.value && !loading.value && !error.value,
  async (target, isCurrent) => {
    filterSearch.value = ''; resetFilters();
    if (target.kind === 'wikidata') handleAddPeriod(0, { wikidata_id: target.qid });
    else {
      const period = await PeriodApiService.getInstance().getPeriod(target.id);
      if (!isCurrent()) return;
      store.cachePeriod(period); selectedPeriod.value = period; showEditModal.value = true;
    }
  },
  () => { cancelOpening(); closeAddModal(); closeEditModal(); },
);
async function loadView() {
  loading.value = true; error.value = null;
  try { await store.ensureRootsLoaded(); initialized.value = true; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Catalogue indisponible.'; }
  finally { loading.value = false; }
}
function retryTable() {
  if (error.value) void loadView();
  if (storyLinks.error.value) void storyLinks.load();
}
onMounted(() => { void loadView(); void storyLinks.load(); });
</script>

<style scoped src="@/components/catalogue/catalogue-view.css"></style>
