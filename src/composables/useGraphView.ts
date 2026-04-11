import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { DateService } from '@/services/DateService';
import type { ListPeriod } from '@/types/database';
import type { Period as GeologicalPeriod } from '@/types/geological';

/** Extrait un Q-id canonique (accepte URL Wikidata, espaces, casse). */
export function normalizeWikidataQId(raw?: string | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (/^Q[1-9]\d*$/i.test(s)) return s.toUpperCase();
  const fromUrl = s.match(/\/entity\/(Q[1-9]\d*)/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const word = s.match(/\b(Q[1-9]\d*)\b/i);
  return word ? word[1].toUpperCase() : null;
}

/** Mappe un enfant géologique Wikidata vers une entrée finder (non persistée, id préfixé `wikidata:`). */
export function mapWikidataGeologicalChildToListPeriod(
  child: GeologicalPeriod,
  parentDbId: string
): ListPeriod {
  const startDate = child.temporalData[0]?.startDate ?? '';
  const endDate = child.temporalData[0]?.endDate ?? '';
  const qid = child.id;
  return {
    id: `wikidata:${qid}`,
    wikidata_id: qid,
    label: child.label,
    description: child.description,
    startDate,
    endDate,
    startYearsBP: DateService.toYearsBP(startDate),
    endYearsBP: DateService.toYearsBP(endDate),
    parentId: parentDbId,
    hasParent: true,
    hasChildren: child.hasChildren,
    children: [],
    categories: [],
    temporalLocation: 'Globale',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

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
  /** Colonne (index) dont la liste d’enfants est en cours de chargement (API puis Wikidata). */
  const loadingChildrenColumnIndex = ref<number | null>(null);
  /** Incrémenté à chaque `handleSelect` qui lance un fetch ; évite qu’un `finally` obsolète enlève le chargement. */
  const childrenFetchSeq = ref(0);

  // Tous les périodes chargées (racines + enfants chargés à la demande)
  const allPeriods = computed(() => sharedPeriods.value);

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

  const handleSelect = async (period: ListPeriod, colIdx: number) => {
    // Tronquer la sélection à ce niveau et sélectionner cette période
    selectionState.value.selectedIds = selectionState.value.selectedIds.slice(0, colIdx);
    selectionState.value.selectedIds[colIdx] = period.id;

    const alreadyLoaded = allPeriods.value.some(p => p.parentId === period.id);
    if (alreadyLoaded) return;

    const willFetchChildren =
      period.hasChildren || normalizeWikidataQId(period.wikidata_id) != null;
    const targetColIdx = colIdx + 1;
    const fetchSeq = ++childrenFetchSeq.value;
    if (willFetchChildren) {
      loadingChildrenColumnIndex.value = targetColIdx;
    }

    try {
      // Charger les enfants DB via le store (dédupliqué, mis en cache)
      if (period.hasChildren) {
        try {
          await dataStore.ensureChildrenLoaded(period.id);
        } catch (error) {
          console.error('[GraphView] Erreur lors du chargement des enfants (API):', error);
        }
      }

      // Fallback Wikidata si aucun enfant en base
      const parentQid = normalizeWikidataQId(period.wikidata_id);
      const hasDbChildren = allPeriods.value.some(p => p.parentId === period.id);
      if (!hasDbChildren && parentQid) {
        try {
          const geoChildren = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId(
            parentQid
          );
          const newChildren = geoChildren.map(c => mapWikidataGeologicalChildToListPeriod(c, period.id));
          const existingIds = new Set(allPeriods.value.map(p => p.id));
          const existingWikidataIds = new Set(
            allPeriods.value.map(p => p.wikidata_id).filter(Boolean)
          );
          const toAdd = newChildren.filter(c =>
            !existingIds.has(c.id) && !existingWikidataIds.has(c.wikidata_id ?? '')
          );
          if (toAdd.length > 0) {
            dataStore.updatePeriods([...allPeriods.value, ...toAdd]);
          }
        } catch (error) {
          console.error('[GraphView] Erreur lors du chargement des enfants (Wikidata):', error);
        }
      }
    } finally {
      if (willFetchChildren && fetchSeq === childrenFetchSeq.value) {
        loadingChildrenColumnIndex.value = null;
      }
    }
  };

  // Vérifie récursivement si childId est un descendant de potentialAncestorId (via parent_id)
  const isDescendant = (childId: string, potentialAncestorId: string): boolean => {
    const child = allPeriods.value.find(p => p.id === childId);
    if (!child || child.parentId == null || child.parentId === '') return false;
    if (child.parentId === potentialAncestorId) return true;
    return isDescendant(child.parentId, potentialAncestorId);
  };

  /**
   * Enrichit manuellement une colonne avec les enfants Wikidata, même si des enfants
   * sont déjà présents en base. Appelé via un bouton explicite dans l'UI.
   */
  const enrichColumnWithWikidata = async (parentPeriod: ListPeriod, colIdx: number) => {
    const parentQid = normalizeWikidataQId(parentPeriod.wikidata_id);
    if (!parentQid) return;

    const targetColIdx = colIdx + 1;
    const fetchSeq = ++childrenFetchSeq.value;
    loadingChildrenColumnIndex.value = targetColIdx;

    try {
      const geoChildren = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId(parentQid);
      const newChildren = geoChildren.map(c => mapWikidataGeologicalChildToListPeriod(c, parentPeriod.id));
      const existingIds = new Set(allPeriods.value.map(p => p.id));
      const existingWikidataIds = new Set(
        allPeriods.value.map(p => p.wikidata_id).filter(Boolean)
      );
      const toAdd = newChildren.filter(c =>
        !existingIds.has(c.id) && !existingWikidataIds.has(c.wikidata_id ?? '')
      );
      if (toAdd.length > 0) {
        dataStore.updatePeriods([...allPeriods.value, ...toAdd]);
      }
    } catch (error) {
      console.error('[GraphView] Erreur enrichissement Wikidata:', error);
    } finally {
      if (fetchSeq === childrenFetchSeq.value) {
        loadingChildrenColumnIndex.value = null;
      }
    }
  };

  const loadInitialData = () => dataStore.ensureDataLoaded();

  return {
    state: state.value, modalState: modalState.value, selectionState: selectionState.value,
    allPeriods, columns,
    loadingChildrenColumnIndex,
    hasChildren, getParentLabel, isDescendant, handleSelect,
    enrichColumnWithWikidata,
    loadInitialData,
    sharedLoading, sharedError,
  };
}
