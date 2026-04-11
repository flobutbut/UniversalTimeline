import { ref } from 'vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';

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
    conflictItem: null,
  });

  const validateQid = async (qid: string, type: 'period' | 'event'): Promise<{ isValid: boolean; error: string; exists: boolean; item?: any }> => {
    if (!qid) return { isValid: false, error: 'Le Q-id est requis', exists: false };
    if (!qid.match(/^Q\d+$/)) return { isValid: false, error: 'Format de Q-id invalide', exists: false };

    try {
      state.value.loading = true;
      state.value.error = null;

      let existingItem = null;
      let exists = false;

      if (type === 'period') {
        const periods = await PeriodApiService.getInstance().getAllPeriods();
        existingItem = periods.find((p: any) => p.wikidata_id === qid) ?? null;
        exists = !!existingItem;
      } else if (type === 'event') {
        try {
          existingItem = await EventApiService.getInstance().getEventById(qid);
          exists = !!existingItem;
        } catch {
          exists = false;
        }
      }

      return { isValid: true, error: exists ? 'Ce Q-id existe déjà dans la base' : '', exists, item: existingItem };
    } catch (error: any) {
      console.error('[useParentChildManagement] Erreur lors de la validation du Q-id:', error);
      return { isValid: false, error: 'Erreur lors de la validation du Q-id', exists: false };
    } finally {
      state.value.loading = false;
    }
  };

  const detectConflict = async (qid: string, type: 'period' | 'event', currentItemId?: string): Promise<ConflictResolution> => {
    const validation = await validateQid(qid, type);
    if (!validation.exists) return { hasConflict: false, item: null, resolution: 'keep' };
    if (currentItemId && validation.item?.id === currentItemId) return { hasConflict: false, item: validation.item, resolution: 'keep' };

    state.value.hasConflict = true;
    state.value.conflictItem = validation.item;
    return { hasConflict: true, item: validation.item, resolution: 'cancel' };
  };

  const resolveConflictAutomatically = async (qid: string, type: 'period' | 'event'): Promise<boolean> => {
    try {
      const validation = await validateQid(qid, type);
      if (!validation.exists) return true;

      if (type === 'event') {
        await EventApiService.getInstance().deleteEvent(validation.item.id);
      } else if (type === 'period') {
        await PeriodApiService.getInstance().deletePeriod(validation.item.id);
      }
      return true;
    } catch (error: any) {
      state.value.error = error.message;
      return false;
    }
  };

  const updateChildrenCount = async (periodId: string): Promise<void> => {
    try {
      const children = await PeriodApiService.getInstance().loadChildren(periodId);
      state.value.childrenCount = children.length.toString();
    } catch {
      state.value.childrenCount = '0';
    }
  };

  const updateParentChildRelation = async (childId: string, newParentId: string | null): Promise<boolean> => {
    try {
      state.value.loading = true;
      state.value.error = null;
      await PeriodApiService.getInstance().updateParent(childId, newParentId);
      return true;
    } catch (error: any) {
      state.value.error = error.message;
      return false;
    } finally {
      state.value.loading = false;
    }
  };

  const validateHierarchy = async (parentId: string, childId: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Vérifie qu'on ne crée pas une relation circulaire via les enfants déjà chargés
      const periodService = PeriodApiService.getInstance();
      const children = await periodService.loadChildren(childId);
      if (children.some(c => c.id === parentId)) return { valid: false, error: 'Impossible de créer une relation circulaire' };
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: 'Erreur lors de la validation de la hiérarchie' };
    }
  };

  const resetState = () => {
    state.value = { loading: false, error: null, childrenCount: '0', hasConflict: false, conflictItem: null };
  };

  return { state: state.value, validateQid, detectConflict, resolveConflictAutomatically, updateChildrenCount, updateParentChildRelation, validateHierarchy, resetState };
}
