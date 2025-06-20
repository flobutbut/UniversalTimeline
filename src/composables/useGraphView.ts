import { ref, computed } from 'vue';
import { useDatabaseDataStore } from './useDatabaseDataStore';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import type { ApiPeriod } from '@/types/geological';

export interface GraphViewState {
  loading: boolean;
  error: string | null;
}

export interface ModalState {
  showEditModal: boolean;
  showAddModal: boolean;
  selectedPeriod: ApiPeriod | null;
  currentColumnIdx: number | null;
}

export interface SelectionState {
  selectedIds: string[];
  draggedItemId: string | null;
  dragOverColumnIdx: number | null;
}

export function useGraphView() {
  const databaseViewService = DatabaseViewService.getInstance();
  const databaseQueryService = DatabaseQueryService.getInstance();
  const {
    periods,
    loading: sharedLoading,
    error: sharedError,
    loadInitialData: sharedLoadInitialData,
    updatePeriods: sharedUpdatePeriods
  } = useDatabaseDataStore();

  // États réactifs propres à la vue
  const state = ref<GraphViewState>({
    loading: false,
    error: null
  });

  const modalState = ref<ModalState>({
    showEditModal: false,
    showAddModal: false,
    selectedPeriod: null,
    currentColumnIdx: null
  });

  const selectionState = ref<SelectionState>({
    selectedIds: [],
    draggedItemId: null,
    dragOverColumnIdx: null
  });

  // Computed properties
  const allPeriods = computed(() =>
    periods.value.map((p: any) => ({
      ...p,
      hasParent: typeof p.hasParent === 'boolean' ? p.hasParent : !!(p.parent_id),
      children: Array.isArray(p.children) ? p.children : [],
    }))
  );

  const columns = computed(() => {
    const cols: any[][] = [];
    const usedIds = new Set<string>();
    // 1. Racine : objets sans parent
    let currentLevel = allPeriods.value.filter(p => !p.hasParent);
    currentLevel = currentLevel.filter(p => !usedIds.has(p.id));
    currentLevel.forEach(p => usedIds.add(p.id));
    cols.push(currentLevel);

    for (const id of selectionState.value.selectedIds) {
      const selected = allPeriods.value.find(p => p.id === id);
      if (!selected) break;
      // 2. Enfants : objets dont l'ID est dans le champ children du parent sélectionné
      let children = allPeriods.value.filter(p => Array.isArray(selected.children) && selected.children.includes(p.id));
      // On retire ceux déjà utilisés dans une colonne précédente
      children = children.filter(p => !usedIds.has(p.id));
      children.forEach(p => usedIds.add(p.id));
      cols.push(children);
      currentLevel = children;
    }
    return cols;
  });

  // Fonctions utilitaires
  const hasChildren = (itemId: string): boolean => {
    const period = allPeriods.value.find(p => p.id === itemId);
    return period?.children?.length > 0;
  };

  const getParentLabel = (colIdx: number): string => {
    if (colIdx === 0) return 'Périodes racines';
    const parentId = selectionState.value.selectedIds[colIdx - 1];
    if (!parentId) return `Niveau ${colIdx + 1}`;
    const parent = allPeriods.value.find(p => p.id === parentId);
    return parent ? parent.label.fr : `Niveau ${colIdx + 1}`;
  };

  const isDescendant = (childId: string, potentialAncestorId: string): boolean => {
    const all = allPeriods.value;
    const child = all.find(p => p.id === childId);
    if (!child || !Array.isArray(child.children)) return false;
    if (child.children.includes(potentialAncestorId)) return true;
    return child.children.some((id: string) => isDescendant(id, potentialAncestorId));
  };

  // Fonctions de sélection
  const handleSelect = async (period: ApiPeriod, colIdx: number) => {
    selectionState.value.selectedIds = selectionState.value.selectedIds.slice(0, colIdx);
    selectionState.value.selectedIds[colIdx] = period.id;

    if (period.children && period.children.length > 0) {
      try {
        const childrenDetails = await Promise.all(
          period.children.map(async (childId: string) => {
            const response = await fetch(`/api/periods/${childId}`);
            if (!response.ok) {
              throw new Error(`Erreur lors du chargement de la période ${childId}`);
            }
            return response.json() as Promise<ApiPeriod>;
          })
        );

        const updatedPeriods = [...allPeriods.value];
        childrenDetails.forEach((childData: ApiPeriod) => {
          // Transformer ApiPeriod en ListPeriod
          const listPeriod = {
            id: childData.id,
            label: childData.label,
            startDate: childData.startDate,
            endDate: childData.endDate,
            categories: childData.categories || []
          };
          
          const existingIndex = updatedPeriods.findIndex(p => p.id === childData.id);
          if (existingIndex !== -1) {
            updatedPeriods[existingIndex] = {
              ...updatedPeriods[existingIndex],
              ...listPeriod,
              hasParent: childData.hasParent,
              children: childData.children || []
            };
          } else {
            updatedPeriods.push({
              ...listPeriod,
              hasParent: childData.hasParent,
              children: childData.children || []
            });
          }
        });

        sharedUpdatePeriods([...updatedPeriods]);
      } catch (error) {
        console.error('[GraphView] Erreur lors du chargement des enfants:', error);
      }
    }
  };

  // Fonction de chargement (utilise le store partagé)
  const loadInitialData = async () => {
    await sharedLoadInitialData();
  };

  return {
    // États
    state: state.value,
    modalState: modalState.value,
    selectionState: selectionState.value,
    // Computed
    allPeriods,
    columns,
    // Fonctions utilitaires
    hasChildren,
    getParentLabel,
    isDescendant,
    // Fonctions de sélection
    handleSelect,
    // Fonctions de chargement
    loadInitialData,
    // Accès direct au loading et error partagés
    sharedLoading,
    sharedError
  };
} 