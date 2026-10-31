<template>
  <div class="finder-root">
    <div v-if="state.loading" class="finder-loading">Chargement...</div>
    <div v-else-if="state.error" class="finder-error" role="alert">{{ state.error }} <button type="button" @click="loadView">Réessayer</button></div>
    <div v-else class="finder-layout">
      <FilterBar
        title="Periods"
        v-model:search="filterSearch"
        v-model:category-id="filterCategoryId"
        :category-options="periodCategoryFilterOptions"
        :suggestions="periodSearchSuggestions"
        :search-loading="searchLoading"
        :search-error="searchError"
        :allow-wikidata-create="false"
        @retry-search="retrySearch"
        @add="handleSubHeaderAdd"
        @pick-period="handleSearchResultSelect"
      />
      <div v-if="targetLoading || targetError" class="finder-feedback" :role="targetError ? 'alert' : 'status'">
        {{ targetError || 'Ouverture du résultat…' }}
        <button v-if="targetError" type="button" @click="retryTarget">Réessayer</button>
        <button type="button" @click="cancelTarget">Annuler</button>
      </div>
      <div v-if="!targetLoading && !targetError && (navigationLoading || navigationError)" class="finder-feedback" :role="navigationError ? 'alert' : 'status'">
        {{ navigationError || 'Ouverture du chemin…' }}
        <button v-if="navigationError" type="button" @click="retryNavigation">Réessayer</button>
        <button type="button" @click="cancelNavigation">Annuler</button>
      </div>
      <div v-if="openingLoading || openingError" class="finder-feedback" :role="openingError ? 'alert' : 'status'">
        {{ openingError || 'Chargement du formulaire…' }}
        <button v-if="openingError" type="button" @click="retryOpening">Réessayer</button>
        <button type="button" @click="cancelOpening">Annuler</button>
      </div>
      <div class="finder-columns">
      <div
        class="finder-column"
        v-for="(col, colIdx) in displayColumns"
        :key="colIdx"
        @dragover.prevent="onColumnDragOver(colIdx)"
        @dragleave="onColumnDragLeave(colIdx)"
        @drop.prevent="onColumnDrop(colIdx)"
        :class="{ 'drag-over': selectionState.dragOverColumnIdx === colIdx }"
      >
        <div class="finder-column-header">
          <h2>
            <template v-if="colIdx === 0">
              Périodes racines
            </template>
            <template v-else>
              {{ getParentLabel(colIdx) }}
            </template>
          </h2>
        </div>
        <div class="finder-column-content">
          <div v-if="childrenError?.column === colIdx" role="alert">
            {{ childrenError.message }} <button type="button" @click="retryChildrenLoad">Réessayer</button>
          </div>
          <template v-if="col.length > 0">
            <FinderItem
              v-for="item in col"
              :key="item.id"
              :label="item.label"
              :startDate="item.startDate"
              :endDate="item.endDate"
              :categories="item.categories"
              :selected="selectionState.selectedIds[colIdx] === item.id"
              :focus-requested="focusTargetId === item.id"
              :hasChildren="hasChildren(item.id)"
              :wikidataOnly="item.id.startsWith('wikidata:')"
              :itemId="item.id"
              @click="handleSelect(item, colIdx)"
              @dragstart="onDragStart"
              @drop="onDrop"
              @edit="openEdit"
              @add="(id) => openWikidataDraft(colIdx, id)"
            />
          </template>
          <div v-else class="finder-empty-column">
            <template v-if="colIdx > 0 && loadingChildrenColumnIndex === colIdx">
              Chargement des sous-périodes…
            </template>
            <template v-else-if="colIdx === 0">
              Aucune période racine
            </template>
            <template v-else-if="childrenError?.column !== colIdx">
              Aucune sous-période
            </template>
          </div>
          <!-- Bouton d'enrichissement Wikidata : visible uniquement si la colonne a des enfants en base
               et que le parent a un wikidata_id -->
          <div
            v-if="colIdx > 0 && (columns[colIdx]?.length ?? 0) > 0 && getParentPeriod(colIdx)?.wikidata_id"
            class="finder-wikidata-enrich"
          >
            <button
              class="wikidata-enrich-btn"
              :disabled="loadingChildrenColumnIndex === colIdx"
              @click="enrichColumnWithWikidata(getParentPeriod(colIdx)!, colIdx)"
            >
              <span v-if="loadingChildrenColumnIndex === colIdx">Chargement…</span>
              <span v-else>+ Rechercher aussi sur Wikidata</span>
            </button>
          </div>
        </div>
      </div>
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
import type { EditFormSubmission } from '@/types/editForm';
import { computed, onMounted, ref, watch } from 'vue';
import FinderItem from './FinderItem.vue';
import FilterBar from '@/components/FilterBar.vue';
import type { ListPeriod } from '@/types/database';
import { useToast } from '@/composables/useToast';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { useGraphView } from '@/composables/useGraphView';
import { useGraphDragDrop } from '@/composables/useGraphDragDrop';
import { useGraphModals } from '@/composables/useGraphModals';
import { SearchApiService } from '@/services/SearchApiService';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { localSearchHitToPeriod } from '@/lib/searchHitEntities';
import { useFinderNavigation } from '@/composables/useFinderNavigation';
import { useSearchTarget } from '@/composables/useSearchTarget';
import {
  finderDragOverColumnAfterMove,
  getFinderColumnParentPeriod,
} from '@/lib/graphFinderHelpers';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useStoryLinks } from '@/composables/useStoryLinks';
import StoryMembershipField from '@/components/StoryMembershipField.vue';

// Utilisation des composables
const {
  state,
  selectionState,
  allPeriods,
  columns,
  loadingChildrenColumnIndex,
  childrenError,
  retryChildrenLoad,
  hasChildren,
  getParentLabel,
  isDescendant,
  handleSelect: selectPeriod,
  enrichColumnWithWikidata,
  loadInitialData
} = useGraphView();

const toast = useToast();
const filterSearch = ref('');
const filterCategoryId = ref('');

const periodCategoryFilterOptions = computed(() => {
  const map = new Map<string, { id: string; label: { fr: string; en: string } }>();
  for (const p of allPeriods.value) {
    for (const cat of p.categories ?? []) {
      if (!map.has(cat.id)) map.set(cat.id, cat as { id: string; label: { fr: string; en: string } });
    }
  }
  const rest = [...map.values()]
    .sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr', { sensitivity: 'base' }))
    .map((c) => ({ value: c.id, label: c.label.fr }));
  return [{ value: '', label: 'Toutes les catégories' }, ...rest];
});

function periodMatchesCategory(p: ListPeriod, categoryId: string): boolean {
  if (!categoryId) return true;
  return p.categories?.some((c) => c.id === categoryId) ?? false;
}

/** Suggestions du sous-header : `/api/search` sur toute la table `periods` (pas seulement le store). */
const {
  results: periodSearchSuggestions,
  loading: searchLoading,
  error: searchError,
  retry: retrySearch,
} = useDebouncedSearch(
  () => filterSearch.value,
  async (query, signal) => {
    const hits = await SearchApiService.getInstance().searchLocal(query, {
      categoryId: filterCategoryId.value || undefined,
      onlyPeriods: true,
      signal,
    });
    return hits.filter(hit => hit.type === 'period').map(localSearchHitToPeriod);
  },
  { delayMs: 250, minLength: 1, criteria: () => filterCategoryId.value },
);

/** En mode explorateur : filtre éventuel par catégorie sur chaque colonne (sans recherche texte). */
const displayColumns = computed(() => {
  const catId = filterCategoryId.value;
  return columns.value.map((col) => col.filter((p) => periodMatchesCategory(p, catId)));
});

const {
  navigate,
  loading: navigationLoading,
  error: navigationError,
  retry: retryPath,
  cancel: cancelNavigation,
} = useFinderNavigation(selectionState, selectPeriod);

const handleSearchResultSelect = async (period: ListPeriod) => {
  cancelTarget();
  cancelOpening();
  if (await navigate(period)) filterSearch.value = '';
};

const retryNavigation = async () => {
  if (await retryPath()) filterSearch.value = '';
};

// New user intent invalidates pending path/form reads before it changes context.
watch([filterSearch, filterCategoryId], () => {
  if (settingTargetFilters) return;
  cancelTarget();
  cancelNavigation();
  cancelOpening();
}, { flush: 'sync' });

const handleSelect = (period: ListPeriod, column: number) => {
  cancelTarget();
  cancelNavigation();
  cancelOpening();
  return selectPeriod(period, column);
};

const openEdit = (id: string) => {
  cancelTarget();
  cancelNavigation();
  return handleEdit(id);
};

const openWikidataDraft = (column: number, id: string) => {
  cancelTarget();
  cancelNavigation();
  handleAddFromWikidataFinderItem(column, id, {
    dbParentId: column > 0 ? selectionState.selectedIds[column - 1] ?? null : null,
  });
};

const getParentPeriod = (colIdx: number) =>
  getFinderColumnParentPeriod(colIdx, selectionState.selectedIds, allPeriods.value);

const {
  onDrop: dropHandler,
  onColumnDrop: columnDropHandler
} = useGraphDragDrop();

const {
  showEditModal,
  showAddModal,
  selectedPeriod,
  loading: openingLoading,
  openingError,
  retryOpening,
  cancelOpening,
  addModalInitialData,
  handleEdit,
  handleDelete,
  busy,
  saveError,
  addError,
  closeEditModal,
  handleEditSubmit,
  handleAddPeriod: addPeriodHandler,
  handleAddFromWikidataFinderItem,
  closeAddModal,
  handleAddSubmit: addSubmitHandler
} = useGraphModals();

// Frises de la période éditée : relues à chaque ouverture pour refléter les changements faits ailleurs.
const auth = useAuthStore();
const { stories } = storeToRefs(useDataStore());
const storyLinks = useStoryLinks('period');
watch(() => showEditModal.value && selectedPeriod.value?.id, id => { if (id) void storyLinks.load(); });

// Fonctions de drag & drop
const onDragStart = (itemId: string) => {
  cancelTarget();
  cancelNavigation();
  cancelOpening();
  selectionState.draggedItemId = itemId;
};

const onColumnDragOver = (colIdx: number) => {
  const id = selectionState.draggedItemId;
  if (id) {
    selectionState.dragOverColumnIdx = finderDragOverColumnAfterMove(colIdx, id, columns.value);
  }
};

const onColumnDragLeave = (colIdx: number) => {
  if (selectionState.dragOverColumnIdx === colIdx) {
    selectionState.dragOverColumnIdx = null;
  }
};

const onDrop = async (targetItemId: string) => {
  await dropHandler(targetItemId, selectionState.draggedItemId, isDescendant);
  selectionState.draggedItemId = null;
};

const onColumnDrop = async (colIdx: number) => {
  await columnDropHandler(
    colIdx, 
    selectionState.draggedItemId, 
    selectionState.selectedIds, 
    columns.value, 
    isDescendant
  );
  selectionState.dragOverColumnIdx = null;
  selectionState.draggedItemId = null;
};

// Fonctions de modales avec validation
const handleAddPeriod = (colIdx: number) => {
  cancelTarget();
  cancelNavigation();
  // Vérifier si on a besoin d'un parent et s'il est sélectionné
  if (colIdx > 0 && !selectionState.selectedIds[colIdx - 1]) {
    toast.show('Veuillez sélectionner un parent avant d\'ajouter une période', 'error');
    return;
  }
  const patch =
    colIdx > 0 && selectionState.selectedIds[colIdx - 1]
      ? { parent_id: selectionState.selectedIds[colIdx - 1] }
      : null;
  addPeriodHandler(colIdx, patch);
};

/** Ajout depuis la barre : sous la dernière période sélectionnée, ou racine si aucune sélection. */
const handleSubHeaderAdd = () => {
  handleAddPeriod(selectionState.selectedIds.length);
};

const handleAddSubmit = async (formData: EditFormSubmission) => {
  await addSubmitHandler(formData, selectionState.selectedIds);
};

const initialized = ref(false);
const focusTargetId = ref<string | null>(null);
let settingTargetFilters = false;
const { loading: targetLoading, error: targetError, retry: retryTarget, cancel: cancelTarget } = useSearchTarget(
  'period', () => initialized.value && !state.loading && !state.error,
  async (target, isCurrent) => {
    settingTargetFilters = true;
    filterSearch.value = ''; filterCategoryId.value = '';
    settingTargetFilters = false;
    if (target.kind === 'wikidata') {
      // A public search result opens a draft. Only the existing form can save it.
      addPeriodHandler(0, { wikidata_id: target.qid });
    } else {
      const opened = await navigate({ id: target.id });
      if (!isCurrent()) return;
      if (opened) focusTargetId.value = target.id;
      else if (navigationError.value) {
        const message = navigationError.value;
        cancelNavigation();
        throw new Error(message);
      }
    }
  },
  () => { focusTargetId.value = null; cancelNavigation(); cancelOpening(); closeAddModal(); closeEditModal(); },
);
async function loadView() {
  await loadInitialData();
  initialized.value = true;
}
onMounted(loadView);

</script>

<style scoped>
.finder-root {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  max-width: 100vw;
  overflow: hidden;
  box-sizing: border-box;
}

.finder-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.finder-loading, .finder-error {
  padding: var(--spacing-lg);
  color: var(--color-text);
  font-size: var(--font-size-lg);
  text-align: center;
}

.finder-feedback {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.finder-feedback button {
  margin-left: var(--spacing-sm);
}

/* Colonnes : src/styles/finder-column-layout.css */

.finder-layout .finder-columns {
  flex: 1;
  min-height: 0;
}

.finder-wikidata-enrich {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.wikidata-enrich-btn {
  width: 100%;
  background: none;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.wikidata-enrich-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.wikidata-enrich-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<style>
html, body {
  height: 100%;
  overflow: hidden;
}
#app {
  height: 100%;
  overflow: hidden;
}
</style>
