import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useDatabaseSave } from './useDatabaseSave';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useToast } from './useToast';
import { useLoadingState } from './useLoadingState';
import { useModalState } from './useModalState';
import type { ListPeriod, Period } from '@/types/database';

export function useGraphModals() {
  const dataStore = useDataStore();
  const { periods } = storeToRefs(dataStore);
  const { handleSave: saveHandler } = useDatabaseSave();
  const toast = useToast();
  const { isLoading: loading, execute } = useLoadingState();

  const editModal = useModalState();
  const addModal = useModalState();
  const selectedPeriod = ref<Period | null>(null);
  const currentColumnIdx = ref<number | null>(null);
  /** Brouillon pour « Créer » prérempli (ex. période virtuelle Wikidata dans le finder). */
  const addModalInitialData = ref<Record<string, unknown> | null>(null);

  const handleEdit = async (itemId: string) => {
    const result = await execute(async () => {
      await dataStore.ensureDataLoaded();

      const period = periods.value.find(p => p.id === itemId);
      if (!period) throw new Error(`Période ${itemId} non trouvée dans le store`);

      selectedPeriod.value = {
        ...period,
        description: (period as any).description || { fr: '', en: '' },
        categories: period.categories || [],
        hasParent: (period as any).hasParent || false,
        children: (period as any).children || [],
        temporalLocation: (period as any).temporalLocation || '',
        createdAt: (period as any).createdAt || new Date().toISOString(),
        updatedAt: (period as any).updatedAt || new Date().toISOString(),
      };
      editModal.open();
      return true;
    });

    if (result === null) {
      toast.show('Erreur lors du chargement de la période', 'error');
    }
  };

  const closeEditModal = () => { editModal.close(); selectedPeriod.value = null; };

  const handleEditSubmit = async (formData: any) => {
    try {
      if (!selectedPeriod.value) throw new Error('Aucune période sélectionnée');

      const success = await saveHandler(formData, 'period', 'edit', selectedPeriod.value);

      if (success) {
        closeEditModal();
      }
    } catch (error) {
      console.error('[GraphView] Erreur lors de la mise à jour:', error);
      toast.show(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la période', 'error');
    }
  };

  const handleAddPeriod = (colIdx: number) => {
    addModalInitialData.value = null;
    currentColumnIdx.value = colIdx;
    addModal.open();
  };

  /** Ouvre la création avec les champs issus d’une ligne finder `wikidata:…`. */
  const handleAddFromWikidataFinderItem = async (colIdx: number, itemId: string) => {
    const result = await execute(async () => {
      await dataStore.ensureDataLoaded();
      const period = periods.value.find(p => p.id === itemId) as ListPeriod | undefined;
      if (!period || !itemId.startsWith('wikidata:')) {
        throw new Error('Période Wikidata introuvable');
      }
      const endRaw = period.endDate?.trim() || '';
      const endForForm =
        endRaw.toUpperCase() === 'TODAY' || endRaw.toUpperCase() === 'NOW' ? 'NOW' : endRaw;
      addModalInitialData.value = {
        wikidata_id: period.wikidata_id || itemId.replace(/^wikidata:/i, ''),
        label: period.label,
        description: period.description || { fr: '', en: '' },
        startDate: period.startDate || '',
        endDate: endForForm,
        temporalLocation: period.temporalLocation || '',
      };
      currentColumnIdx.value = colIdx;
      addModal.open();
      return true;
    });
    if (result === null) {
      toast.show('Impossible d’ouvrir la création pour cette ligne', 'error');
    }
  };

  const closeAddModal = () => {
    addModal.close();
    currentColumnIdx.value = null;
    addModalInitialData.value = null;
  };

  const handleAddSubmit = async (formData: any, selectedIds: string[]) => {
    try {
      // Capturer immédiatement avant tout await (closeAddModal peut remettre currentColumnIdx à null)
      const colIdx = currentColumnIdx.value;
      const parentId = colIdx !== null && colIdx > 0
        ? selectedIds[colIdx - 1] ?? null
        : null;

      const periodService = PeriodApiService.getInstance();
      const newPeriod = await periodService.createPeriod(formData);

      // Lier au parent si nécessaire
      if (parentId) {
        await periodService.updateParent(newPeriod.id, parentId);
      }

      const periodForStore = {
        id: newPeriod.id,
        label: { fr: formData.title.fr, en: formData.title.en },
        startDate: formData.startDate,
        endDate: formData.endDate,
        parentId: parentId ?? null,
        hasParent: !!parentId,
        hasChildren: false,
        children: [],
        categories: [],
        wikidata_id: formData.qid,
      };

      // Remplace l'entrée wikidata temporaire (wikidata:QID) par la vraie période DB
      const wikidataKey = formData.qid ? `wikidata:${formData.qid}` : null;
      const updatedPeriods = periods.value
        .filter(p => !wikidataKey || p.id !== wikidataKey)
        .concat(periodForStore as any);

      dataStore.updatePeriods(updatedPeriods);
      closeAddModal();
      toast.show('Période ajoutée avec succès', 'success');
    } catch (error: any) {
      console.error('[GraphView] Erreur lors de la création:', error);
      toast.show(error.response?.data?.message || error.message || 'Erreur lors de la création de la période', 'error');
    }
  };

  return {
    showEditModal: editModal.isOpen,
    showAddModal: addModal.isOpen,
    selectedPeriod,
    currentColumnIdx,
    addModalInitialData,
    loading,
    handleEdit,
    closeEditModal,
    handleEditSubmit,
    handleAddPeriod,
    handleAddFromWikidataFinderItem,
    closeAddModal,
    handleAddSubmit,
  };
}
