import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import type { ListPeriod } from '@/types/database';
import type { Period as GeologicalPeriod } from '@/types/geological';
import { isPeriodDescendant } from '@/lib/periodHierarchy';
import { useLatestRequest } from './useLatestRequest';
import { normalizeWikidataQId, mapWikidataGeologicalChildToListPeriod } from '@/lib/wikidataPeriodSuggestions';
export { normalizeWikidataQId, mapWikidataGeologicalChildToListPeriod } from '@/lib/wikidataPeriodSuggestions';

export interface GraphViewState {
  loading: boolean;
  error: string | null;
}

export interface ModalState {
  showEditModal: boolean;
  showAddModal: boolean;
  selectedPeriod: ListPeriod | null;
  currentColumnIdx: number | null;
}

export interface SelectionState {
  selectedIds: string[];
  draggedItemId: string | null;
  dragOverColumnIdx: number | null;
}

export function useGraphView() {
  const dataStore = useDataStore();
  const { periods: sharedPeriods, loading: sharedLoading, error: sharedError } = storeToRefs(dataStore);

  const state = ref<GraphViewState>({ loading: false, error: null });
  const modalState = ref<ModalState>({ showEditModal: false, showAddModal: false, selectedPeriod: null, currentColumnIdx: null });
  const selectionState = ref<SelectionState>({ selectedIds: [], draggedItemId: null, dragOverColumnIdx: null });
  /** Colonne (index) dont la liste d'enfants est en cours de chargement (API puis Wikidata). */
  const loadingChildrenColumnIndex = ref<number | null>(null);
  // Only the latest navigation may publish suggestions or change the column status.
  const childRequests = useLatestRequest();
  const initialRequests = useLatestRequest();
  const childrenError = ref<{ column: number; message: string } | null>(null);
  let retryChildren: () => Promise<void> = async () => {};
  const retryChildrenLoad = () => retryChildren();

  // Tous les périodes chargées (racines + enfants chargés à la demande)
  const allPeriods = computed(() => sharedPeriods.value);

  watch(sharedPeriods, periods => {
    const ids = new Set(periods.map(period => period.id));
    const missing = selectionState.value.selectedIds.findIndex(id => !ids.has(id));
    if (missing >= 0) selectionState.value.selectedIds = selectionState.value.selectedIds.slice(0, missing);
  });

  // Colonne 0 = racines, colonnes suivantes = enfants du sélectionné
  const columns = computed(() => {
    const cols: ListPeriod[][] = [];

    // Colonne 0 : périodes sans parent
    const roots = allPeriods.value.filter(p => !p.parentId && !p.hasParent);
    cols.push(roots);

    // Colonnes suivantes : enfants directs du sélectionné dans chaque niveau
    for (const parentId of selectionState.value.selectedIds) {
      const children = allPeriods.value.filter(p => p.parentId === parentId);
      cols.push(children);
    }

    return cols;
  });

  // Une période a des enfants si le flag has_children est vrai OU si des enfants sont déjà dans le store
  const hasChildren = (itemId: string) => {
    const p = allPeriods.value.find(p => p.id === itemId);
    if (!p) return false;
    if (p.hasChildren) return true;
    return allPeriods.value.some(child => child.parentId === itemId);
  };

  const getParentLabel = (colIdx: number) => {
    if (colIdx === 0) return 'Périodes racines';
    const parentId = selectionState.value.selectedIds[colIdx - 1];
    if (!parentId) return `Niveau ${colIdx + 1}`;
    const parent = allPeriods.value.find(p => p.id === parentId);
    return parent ? parent.label.fr : `Niveau ${colIdx + 1}`;
  };

  function addSuggestions(rows: GeologicalPeriod[], parentId: string) {
    const existingIds = new Set(allPeriods.value.map(p => p.id));
    const existingQids = new Set(allPeriods.value.map(p => p.wikidata_id).filter(Boolean));
    const toAdd = rows.map(c => mapWikidataGeologicalChildToListPeriod(c, parentId))
      .filter(c => !existingIds.has(c.id) && !existingQids.has(c.wikidata_id ?? ''));
    if (toAdd.length) dataStore.addPeriodSuggestions(toAdd);
  }

  const handleSelect = async (period: ListPeriod, colIdx: number) => {
    const isCurrent = childRequests.begin();
    selectionState.value.selectedIds = selectionState.value.selectedIds.slice(0, colIdx);
    selectionState.value.selectedIds[colIdx] = period.id;
    const column = colIdx + 1;
    retryChildren = () => handleSelect(period, colIdx);
    childrenError.value = null;
    loadingChildrenColumnIndex.value = column;
    try {
      if (!period.id.startsWith('wikidata:')) await dataStore.ensureChildrenLoaded(period.id);
      if (!isCurrent() || !dataStore.periodById(period.id)) return;
      const qid = normalizeWikidataQId(period.wikidata_id);
      if (!dataStore.childrenOf(period.id).length && qid) {
        const rows = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId(qid);
        if (isCurrent() && dataStore.periodById(period.id)) addSuggestions(rows, period.id);
      }
    } catch (cause) {
      if (isCurrent()) childrenError.value = { column, message: cause instanceof Error ? cause.message : 'Erreur de chargement' };
    } finally {
      if (isCurrent()) loadingChildrenColumnIndex.value = null;
    }
  };

  const isDescendant = (childId: string, potentialAncestorId: string): boolean =>
    isPeriodDescendant(allPeriods.value, childId, potentialAncestorId);

  const enrichColumnWithWikidata = async (parent: ListPeriod, column: number) => {
    const qid = normalizeWikidataQId(parent.wikidata_id);
    if (!qid) return;
    const isCurrent = childRequests.begin();
    retryChildren = () => enrichColumnWithWikidata(parent, column);
    childrenError.value = null;
    loadingChildrenColumnIndex.value = column;
    try {
      const rows = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId(qid);
      if (isCurrent() && dataStore.periodById(parent.id)) addSuggestions(rows, parent.id);
    } catch (cause) {
      if (isCurrent()) childrenError.value = { column, message: cause instanceof Error ? cause.message : 'Erreur de chargement Wikidata' };
    } finally {
      if (isCurrent()) loadingChildrenColumnIndex.value = null;
    }
  };

  const loadInitialData = async () => {
    const isCurrent = initialRequests.begin();
    state.value.loading = true;
    state.value.error = null;
    try {
      await dataStore.ensureRootsLoaded();
    } catch (cause) {
      if (isCurrent()) state.value.error = cause instanceof Error ? cause.message : 'Erreur de chargement des périodes';
    } finally {
      if (isCurrent()) state.value.loading = false;
    }
  };

  return {
    state: state.value, modalState: modalState.value, selectionState: selectionState.value,
    allPeriods, columns,
    loadingChildrenColumnIndex, childrenError, retryChildrenLoad,
    hasChildren, getParentLabel, isDescendant, handleSelect,
    enrichColumnWithWikidata,
    loadInitialData,
    sharedLoading, sharedError,
  };
}
