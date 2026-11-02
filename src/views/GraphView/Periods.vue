<template>
  <div class="finder-root">
    <div v-if="loading" class="finder-loading" role="status">Chargement…</div>
    <div v-else-if="error" class="finder-error" role="alert">{{ error }} <button type="button" @click="loadView">Réessayer</button></div>
    <div v-else class="finder-layout">
      <FilterBar title="Périodes" v-model:search="filterSearch" v-model:category-id="filterCategoryId"
        :category-options="periodCategoryFilterOptions" :suggestions="periodSearchSuggestions"
        :search-loading="searchLoading" :search-error="searchError" :allow-wikidata-create="false"
        @retry-search="retrySearch" @add="cancelSelection(); handleAddPeriod(0)" @pick-period="selectPeriod" />
      <p class="catalogue-hint">Les périodes sont organisées dans les frises. Sélectionnez une fiche pour retrouver ses frises.</p>
      <div v-if="targetLoading || targetError" class="finder-feedback" :role="targetError ? 'alert' : 'status'">
        {{ targetError || 'Ouverture du résultat…' }}
        <button v-if="targetError" type="button" @click="retryTarget">Réessayer</button>
        <button type="button" @click="cancelTarget">Annuler</button>
      </div>
      <div v-if="openingLoading || openingError" class="finder-feedback" :role="openingError ? 'alert' : 'status'">
        {{ openingError || 'Chargement du formulaire…' }}
        <button v-if="openingError" type="button" @click="retryOpening">Réessayer</button>
        <button type="button" @click="cancelOpening">Annuler</button>
      </div>
      <div v-if="selectionLoading || selectionError" class="finder-feedback" :role="selectionError ? 'alert' : 'status'">
        {{ selectionError || 'Chargement de la fiche…' }}
        <button v-if="selectionError" type="button" @click="retrySelection">Réessayer</button>
        <button type="button" @click="cancelSelection">Annuler</button>
      </div>
      <div class="catalogue-content">
        <div class="finder-column catalogue-list">
          <div class="finder-column-header"><h2>Catalogue · {{ visiblePeriods.length }}</h2></div>
          <div class="finder-column-content">
            <FinderItem v-for="item in visiblePeriods" :key="item.id" :label="item.label"
              :start-date="item.startDate" :end-date="item.endDate" :categories="item.categories"
              :selected="selectedId === item.id" :focus-requested="focusTargetId === item.id"
              :has-children="false" :draggable="false" hide-chevron :item-id="item.id"
              @click="selectPeriod(item)" @edit="id => { cancelSelection(); handleEdit(id); }" />
            <p v-if="!visiblePeriods.length" class="finder-empty-column">Aucune période</p>
          </div>
        </div>
        <section v-if="selected" class="catalogue-details" aria-label="Détail de la période">
          <h2>{{ selected.label.fr || selected.label.en }}</h2>
          <p v-if="selected.description?.fr || selected.description?.en">{{ selected.description?.fr || selected.description?.en }}</p>
          <p v-else>Description à compléter.</p>
          <StoryMembershipField :story-ids="storyLinks.storyIdsOf(selected.id)" :stories="stories" :owns-story="auth.ownsStory"
            empty-text="Cette période n’appartient à aucune frise visible."
            :loading="storyLinks.loading.value" :load-error="storyLinks.error.value"
            :pending="storyLinks.pending.value" :change-error="storyLinks.changeError.value"
            @retry="storyLinks.load" @add="id => storyLinks.change(selected!.id, id, false)"
            @remove="id => storyLinks.change(selected!.id, id, true)" />
        </section>
      </div>
    </div>
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
          :owns-story="auth.ownsStory"
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
import FinderItem from './FinderItem.vue';
import FilterBar from '@/components/FilterBar.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import StoryMembershipField from '@/components/StoryMembershipField.vue';
import { useGraphModals } from '@/composables/useGraphModals';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStoryLinks } from '@/composables/useStoryLinks';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useSearchTarget } from '@/composables/useSearchTarget';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { SearchApiService } from '@/services/SearchApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { localSearchHitToPeriod } from '@/lib/searchHitEntities';
import type { ListPeriod } from '@/types/database';
import type { EditFormSubmission } from '@/types/editForm';

const store = useDataStore();
const auth = useAuthStore();
const { stories } = storeToRefs(store);
const storyLinks = useStoryLinks('period');
const loading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);
const selectedId = ref<string | null>(null);
const focusTargetId = ref<string | null>(null);
const selected = computed(() => store.periodById(selectedId.value ?? ''));
const filterSearch = ref('');
const filterCategoryId = ref('');
const allPeriods = computed(() => store.periods.filter(p => !p.id.startsWith('wikidata:')));
const visiblePeriods = computed(() => {
  const q = filterSearch.value.trim().toLocaleLowerCase('fr');
  return allPeriods.value.filter(p => (!filterCategoryId.value || p.categories.some(c => c.id === filterCategoryId.value))
    && (!q || [p.label.fr, p.label.en, p.description?.fr, p.description?.en].some(v => v?.toLocaleLowerCase('fr').includes(q))))
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr'));
});
const periodCategoryFilterOptions = computed(() => {
  const categories = new Map(allPeriods.value.flatMap(p => p.categories.map(c => [c.id, c] as const)));
  return [{ value: '', label: 'Toutes les catégories' }, ...[...categories.values()]
    .sort((a,b) => a.label.fr.localeCompare(b.label.fr, 'fr')).map(c => ({ value: c.id, label: c.label.fr }))];
});
const { results: periodSearchSuggestions, loading: searchLoading, error: searchError, retry: retrySearch } = useDebouncedSearch(
  () => filterSearch.value,
  async (q, signal) => (await SearchApiService.getInstance().searchLocal(q, { categoryId: filterCategoryId.value || undefined, onlyPeriods: true, signal }))
    .filter(hit => hit.type === 'period').map(localSearchHitToPeriod),
  { delayMs: 250, minLength: 1, criteria: () => filterCategoryId.value },
);
const {
  showEditModal, showAddModal, selectedPeriod, loading: openingLoading, openingError, retryOpening, cancelOpening,
  addModalInitialData, handleEdit, handleDelete, busy, saveError, addError, closeEditModal, handleEditSubmit,
  handleAddPeriod, closeAddModal, handleAddSubmit: submit,
} = useGraphModals();
const handleAddSubmit = (data: EditFormSubmission) => submit(data, []);
const selectionRequests = useLatestRequest();
const selectionLoading = ref(false);
const selectionError = ref<string | null>(null);
let retrySelectionTask: (() => Promise<void>) | null = null;
function cancelSelection() { selectionRequests.cancel(); selectionLoading.value = false; selectionError.value = null; }
const retrySelection = () => retrySelectionTask?.();
async function selectPeriod(period: ListPeriod) {
  cancelTarget(); cancelOpening(); filterSearch.value = '';
  const isCurrent = selectionRequests.begin();
  retrySelectionTask = () => selectPeriod(period);
  selectionLoading.value = true; selectionError.value = null;
  try {
    const detail = await PeriodApiService.getInstance().getPeriod(period.id);
    if (!isCurrent()) return;
    store.cachePeriod(detail); selectedId.value = detail.id; void storyLinks.load();
  } catch (cause) { if (isCurrent()) selectionError.value = cause instanceof Error ? cause.message : 'Fiche indisponible.'; }
  finally { if (isCurrent()) selectionLoading.value = false; }
}
watch([filterSearch, filterCategoryId], cancelSelection, { flush: 'sync' });
watch(() => showEditModal.value && selectedPeriod.value?.id, id => { if (id) void storyLinks.load(); });
const { loading: targetLoading, error: targetError, retry: retryTarget, cancel: cancelTarget } = useSearchTarget(
  'period', () => initialized.value && !loading.value && !error.value,
  async (target, isCurrent) => {
    filterSearch.value = ''; filterCategoryId.value = '';
    if (target.kind === 'wikidata') handleAddPeriod(0, { wikidata_id: target.qid });
    else {
      const period = await PeriodApiService.getInstance().getPeriod(target.id);
      if (!isCurrent()) return;
      store.cachePeriod(period); selectedId.value = period.id; focusTargetId.value = period.id; void storyLinks.load();
    }
  },
  () => { focusTargetId.value = null; cancelOpening(); closeAddModal(); closeEditModal(); },
);
async function loadView() {
  loading.value = true; error.value = null;
  try { await store.ensureRootsLoaded(); initialized.value = true; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Catalogue indisponible.'; }
  finally { loading.value = false; }
}
onMounted(loadView);
</script>

<style scoped>
.finder-root, .finder-layout { display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; overflow: hidden; }
.finder-loading, .finder-error, .finder-feedback, .catalogue-hint { padding: var(--spacing-md); }
.catalogue-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.catalogue-content { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.catalogue-list { flex: 1; width: auto; min-width: 0; }
.catalogue-details { flex: 1; min-width: 0; padding: var(--spacing-lg); overflow: auto; border-left: 1px solid var(--color-border); }
.catalogue-details h2 { font-size: var(--font-size-lg); }
.catalogue-details p { line-height: 1.5; }
@media (max-width: 700px) { .catalogue-content { flex-direction: column; overflow: auto; } .catalogue-details { flex: none; border-left: 0; border-top: 1px solid var(--color-border); } }
</style>
