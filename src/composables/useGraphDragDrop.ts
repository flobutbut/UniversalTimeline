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
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (newParentId && (newParentId === childId || isDescendant(newParentId, childId))) {
      toast.show('Impossible de déplacer un parent dans un de ses propres descendants.', 'error');
      return;
    }

    try {
      const savedPeriod = await periodService.updateParent(childId, newParentId);

      dataStore.upsertSavedPeriod(savedPeriod);
      toast.show('Période déplacée avec succès', 'success');
    } catch (error: any) {
      console.error('[movePeriod] Erreur lors du déplacement:', error);
      toast.show(error?.response?.data?.error || 'Erreur lors du déplacement de la période', 'error');
    }
  };

  const onDrop = async (
    targetItemId: string,
    draggedItemId: string | null,
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (!draggedItemId || !targetItemId) return;
    await movePeriod(draggedItemId, targetItemId, isDescendant);
  };

  const onColumnDrop = async (
    colIdx: number,
    draggedItemId: string | null,
    selectedIds: string[],
    columns: any[][],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (!draggedItemId) return;
    const originColIdx = columns.findIndex(col => col.some(item => item.id === draggedItemId));
    if (colIdx === originColIdx) return;

    const newParentId = colIdx === 0 ? null : (selectedIds[colIdx - 1] || null);
    await movePeriod(draggedItemId, newParentId, isDescendant);
  };

  return { movePeriod, onDrop, onColumnDrop };
}
