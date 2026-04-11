import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useToast } from './useToast';

export function useGraphDragDrop() {
  const dataStore = useDataStore();
  const periodService = PeriodApiService.getInstance();
  const toast = useToast();

  const movePeriod = async (
    childId: string,
    newParentId: string | null,
    allPeriods: any[],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (newParentId && isDescendant(newParentId, childId)) {
      toast.show('Impossible de déplacer un parent dans un de ses propres descendants.', 'error');
      return;
    }

    try {
      // Met à jour parent_id directement en base
      await periodService.updateParent(childId, newParentId);

      // Mise à jour locale du store
      const updatedPeriods = allPeriods.map(p => {
        if (p.id === childId) {
          return { ...p, parentId: newParentId, hasParent: !!newParentId };
        }
        return p;
      });

      dataStore.updatePeriods(updatedPeriods);
      toast.show('Période déplacée avec succès', 'success');
    } catch (error) {
      console.error('[movePeriod] Erreur lors du déplacement:', error);
      toast.show('Erreur lors du déplacement de la période', 'error');
    }
  };

  const onDrop = async (
    targetItemId: string,
    draggedItemId: string | null,
    allPeriods: any[],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (!draggedItemId || !targetItemId) return;
    await movePeriod(draggedItemId, targetItemId, allPeriods, isDescendant);
  };

  const onColumnDrop = async (
    colIdx: number,
    draggedItemId: string | null,
    selectedIds: string[],
    columns: any[][],
    allPeriods: any[],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (!draggedItemId) return;
    const originColIdx = columns.findIndex(col => col.some(item => item.id === draggedItemId));
    if (colIdx === originColIdx) return;

    const newParentId = colIdx === 0 ? null : (selectedIds[colIdx - 1] || null);
    await movePeriod(draggedItemId, newParentId, allPeriods, isDescendant);
  };

  return { movePeriod, onDrop, onColumnDrop };
}
