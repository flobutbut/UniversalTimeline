import { ref } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';

export function useGraphDragDrop() {
  const databaseViewService = DatabaseViewService.getInstance();

  // Fonction pour déplacer une période
  const movePeriod = async (
    childId: string, 
    newParentId: string | null, 
    allPeriods: any[],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (newParentId && isDescendant(childId, newParentId)) {
      window?.showToast?.('Impossible de déplacer un parent dans un de ses propres descendants.', 'error');
      console.warn('[movePeriod] Opération interdite : cycle détecté');
      return;
    }
    
    const parentOrigin = allPeriods.find(p => Array.isArray(p.children) && p.children.includes(childId));
    const updatedPeriods = [...allPeriods];

    try {
      // 1. Retirer du parent d'origine
      if (parentOrigin) {
        const newChildren = parentOrigin.children.filter((id: string) => id !== childId);
        await databaseViewService.updateChildren(parentOrigin.id, newChildren);
        // Mise à jour locale immédiate
        const idx = updatedPeriods.findIndex(p => p.id === parentOrigin.id);
        if (idx !== -1) {
          updatedPeriods[idx] = {
            ...updatedPeriods[idx],
            children: newChildren
          };
        }
      }
      
      // 2. Ajouter au parent cible
      if (newParentId) {
        const parentTarget = allPeriods.find(p => p.id === newParentId);
        if (parentTarget) {
          const newChildren = Array.isArray(parentTarget.children) ? [...parentTarget.children] : [];
          if (!newChildren.includes(childId)) {
            newChildren.push(childId);
            await databaseViewService.updateChildren(parentTarget.id, newChildren);
            // Mise à jour locale immédiate
            const idx = updatedPeriods.findIndex(p => p.id === newParentId);
            if (idx !== -1) {
              updatedPeriods[idx] = {
                ...updatedPeriods[idx],
                children: newChildren
              };
            }
          }
        }
      }
      
      // 3. Mettre à jour has_parent
      const updated = await databaseViewService.updateHasParent(childId, !!newParentId);
      console.log('[movePeriod] updateHasParent response:', updated);
      
      // 4. Mettre à jour l'objet déplacé
      const draggedIdx = updatedPeriods.findIndex(p => p.id === childId);
      if (draggedIdx !== -1 && updated && typeof updated.has_parent !== 'undefined') {
        updatedPeriods[draggedIdx] = {
          ...updatedPeriods[draggedIdx],
          hasParent: updated.has_parent
        };
      }
      
      databaseViewService.setPeriods(updatedPeriods);
    } catch (error) {
      console.error('[movePeriod] Erreur lors du déplacement:', error);
    }
  };

  // Fonction pour gérer le drop sur un élément
  const onDrop = async (
    targetItemId: string, 
    draggedItemId: string | null,
    allPeriods: any[],
    isDescendant: (childId: string, potentialAncestorId: string) => boolean
  ) => {
    if (!draggedItemId || !targetItemId) return;
    await movePeriod(draggedItemId, targetItemId, allPeriods, isDescendant);
  };

  // Fonction pour gérer le drop sur une colonne
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
    
    let newParentId: string | null = null;
    if (colIdx === 0) {
      newParentId = null;
    } else {
      newParentId = selectedIds[colIdx - 1] || null;
    }
    
    await movePeriod(draggedItemId, newParentId, allPeriods, isDescendant);
  };

  return {
    movePeriod,
    onDrop,
    onColumnDrop
  };
} 