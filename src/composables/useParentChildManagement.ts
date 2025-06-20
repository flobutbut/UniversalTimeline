import { ref } from 'vue';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';

export interface ParentChildState {
  loading: boolean;
  error: string | null;
  childrenCount: string;
  hasConflict: boolean;
  conflictItem: any;
}

export interface ConflictResolution {
  hasConflict: boolean;
  item: any;
  resolution: 'keep' | 'replace' | 'merge' | 'cancel';
}

export function useParentChildManagement() {
  const state = ref<ParentChildState>({
    loading: false,
    error: null,
    childrenCount: '0',
    hasConflict: false,
    conflictItem: null
  });

  const queryService = DatabaseQueryService.getInstance();

  // Validation d'un Q-id
  const validateQid = async (qid: string, type: 'period' | 'event'): Promise<{ isValid: boolean; error: string; exists: boolean; item?: any }> => {
    if (!qid) {
      return { isValid: false, error: 'Le Q-id est requis', exists: false };
    }

    if (!qid.match(/^Q\d+$/)) {
      return { isValid: false, error: 'Format de Q-id invalide', exists: false };
    }

    try {
      state.value.loading = true;
      state.value.error = null;

      let existingItem = null;
      let exists = false;

      if (type === 'period') {
        const periods = await queryService.getAllPeriods();
        existingItem = periods.find(p => p.wikidata_id === qid);
        exists = !!existingItem;
      } else if (type === 'event') {
        try {
          existingItem = await queryService.getEventById(qid);
          exists = !!existingItem;
        } catch (e) {
          // L'événement n'existe pas
          exists = false;
        }
      }

      return {
        isValid: true,
        error: exists ? 'Ce Q-id existe déjà dans la base' : '',
        exists,
        item: existingItem
      };
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors de la validation du Q-id:', error);
      return {
        isValid: false,
        error: 'Erreur lors de la validation du Q-id',
        exists: false
      };
    } finally {
      state.value.loading = false;
    }
  };

  // Détection de conflit lors de la création
  const detectConflict = async (qid: string, type: 'period' | 'event', currentItemId?: string): Promise<ConflictResolution> => {
    const validation = await validateQid(qid, type);
    
    if (!validation.exists) {
      return {
        hasConflict: false,
        item: null,
        resolution: 'keep'
      };
    }

    // Si l'élément existe et que c'est le même que celui en cours d'édition, pas de conflit
    if (currentItemId && validation.item?.id === currentItemId) {
      return {
        hasConflict: false,
        item: validation.item,
        resolution: 'keep'
      };
    }

    // Conflit détecté
    state.value.hasConflict = true;
    state.value.conflictItem = validation.item;

    return {
      hasConflict: true,
      item: validation.item,
      resolution: 'cancel' // Par défaut, on annule
    };
  };

  // Résolution automatique des conflits (comportement actuel)
  const resolveConflictAutomatically = async (qid: string, type: 'period' | 'event'): Promise<boolean> => {
    try {
      const validation = await validateQid(qid, type);
      
      if (!validation.exists) {
        return true; // Pas de conflit
      }

      // Suppression automatique de l'élément existant
      if (type === 'event') {
        await queryService.deleteEvent(validation.item.id);
        console.log('[useParentChildManagement] Événement existant supprimé automatiquement');
      } else if (type === 'period') {
        await queryService.deletePeriod(validation.item.id);
        console.log('[useParentChildManagement] Période existante supprimée automatiquement');
      }

      return true;
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors de la résolution automatique:', error);
      state.value.error = error.message;
      return false;
    }
  };

  // Mise à jour du compteur d'enfants
  const updateChildrenCount = async (periodId: string): Promise<void> => {
    try {
      const children = await queryService.loadChildren(periodId);
      state.value.childrenCount = children.length.toString();
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors du comptage des enfants:', error);
      state.value.childrenCount = '0';
    }
  };

  // Gestion des relations parent/enfant
  const updateParentChildRelation = async (childId: string, newParentId: string | null): Promise<boolean> => {
    try {
      state.value.loading = true;
      state.value.error = null;

      // Mettre à jour la relation parent/enfant
      await queryService.updateHasParent(childId, !!newParentId);
      
      // Si un nouveau parent est défini, ajouter l'enfant à sa liste
      if (newParentId) {
        const parent = await queryService.getPeriod(newParentId);
        const updatedChildren = [...parent.children, childId];
        await queryService.updateChildren(newParentId, updatedChildren);
      }

      return true;
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors de la mise à jour de la relation:', error);
      state.value.error = error.message;
      return false;
    } finally {
      state.value.loading = false;
    }
  };

  // Vérification de la hiérarchie
  const validateHierarchy = async (parentId: string, childId: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Vérifier que l'enfant n'est pas déjà un parent de l'élément parent
      const child = await queryService.getPeriod(childId);
      if (child.children.includes(parentId)) {
        return {
          valid: false,
          error: 'Impossible de créer une relation circulaire'
        };
      }

      // Vérifier que l'enfant n'est pas déjà un enfant de l'élément parent
      const parent = await queryService.getPeriod(parentId);
      if (parent.children.includes(childId)) {
        return {
          valid: false,
          error: 'Cette relation existe déjà'
        };
      }

      return { valid: true };
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors de la validation de la hiérarchie:', error);
      return {
        valid: false,
        error: 'Erreur lors de la validation de la hiérarchie'
      };
    }
  };

  // Réinitialisation de l'état
  const resetState = () => {
    state.value.loading = false;
    state.value.error = null;
    state.value.childrenCount = '0';
    state.value.hasConflict = false;
    state.value.conflictItem = null;
  };

  return {
    state: state.value,
    validateQid,
    detectConflict,
    resolveConflictAutomatically,
    updateChildrenCount,
    updateParentChildRelation,
    validateHierarchy,
    resetState
  };
} 