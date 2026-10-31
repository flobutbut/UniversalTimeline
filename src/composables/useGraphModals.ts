import { ref, computed, onScopeDispose } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useDatabaseSave } from './useDatabaseSave';
import { useDatabaseDelete } from './useDatabaseDelete';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useToast } from './useToast';
import { useModalState } from './useModalState';
import { useLatestRequest } from './useLatestRequest';
import type { Period } from '@/types/database';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import type { EditInitialData, EditFormSubmission } from '@/types/editForm';

export function useGraphModals() {
  const dataStore = useDataStore();
  const { handleSave: saveHandler, loading: saveLoading, error: saveError } = useDatabaseSave();
  const { handleDelete: deleteHandler, loading: deleteLoading } = useDatabaseDelete();
  const toast = useToast();
  const loading = ref(false);
  const openingError = ref<string | null>(null);
  const openingRequests = useLatestRequest();
  let retryOpeningTask: (() => Promise<void>) | null = null;

  function cancelOpening() {
    openingRequests.cancel();
    loading.value = false;
    openingError.value = null;
    retryOpeningTask = null;
  }
  const retryOpening = () => retryOpeningTask?.();
  onScopeDispose(cancelOpening);

  const addLoading = ref(false);
  const addError = ref<string | null>(null);
  const busy = computed(() => saveLoading.value || deleteLoading.value || addLoading.value);

  const editModal = useModalState();
  const addModal = useModalState();
  const selectedPeriod = ref<Period | null>(null);
  const currentColumnIdx = ref<number | null>(null);
  /** Brouillon pour « Créer » prérempli (ex. période virtuelle Wikidata dans le finder). */
  const addModalInitialData = ref<EditInitialData | null>(null);

  function resetModals() {
    cancelOpening();
    editModal.close();
    addModal.close();
    selectedPeriod.value = null;
    currentColumnIdx.value = null;
    addModalInitialData.value = null;
    addError.value = null;
  }

  const handleEdit = async (itemId: string) => {
    if (busy.value) return;
    resetModals();
    const isCurrent = openingRequests.begin();
    retryOpeningTask = () => handleEdit(itemId);
    loading.value = true;
    saveError.value = null;
    try {
      const period = await PeriodApiService.getInstance().getPeriod(itemId);
      if (!isCurrent()) return;
      selectedPeriod.value = {
        ...period,
        description: period.description || { fr: '', en: '' },
        categories: period.categories || [],
        hasParent: period.hasParent || false,
        children: period.children || [],
        temporalLocation: period.temporalLocation || '',
      };
      editModal.open();
    } catch (cause) {
      if (isCurrent()) openingError.value = cause instanceof Error ? cause.message : 'Erreur lors du chargement de la période';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  };

  const closeEditModal = () => { cancelOpening(); editModal.close(); selectedPeriod.value = null; };

  const handleDelete = async () => {
    const period = selectedPeriod.value;
    if (!period || busy.value) return;
    const deleted = await deleteHandler(period, 'period');
    if (deleted && selectedPeriod.value?.id === period.id) closeEditModal();
  };

  const handleEditSubmit = async (formData: EditFormSubmission) => {
    if (busy.value) return;
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

  const handleAddPeriod = (colIdx: number, initialPatch?: EditInitialData | null) => {
    if (busy.value) return;
    resetModals();
    addModalInitialData.value = initialPatch && Object.keys(initialPatch).length > 0 ? initialPatch : null;
    currentColumnIdx.value = colIdx;
    addModal.open();
  };

  /** Ouvre la création avec les champs issus d’une ligne finder Wikidata. */
  const handleAddFromWikidataFinderItem = (colIdx: number, itemId: string, opts?: { dbParentId?: string | null }) => {
    if (busy.value) return;
    cancelOpening();
    try {
      // This row is already loaded. Capture its draft and parent without another
      // roots request that could later open the form in a different context.
      const period = dataStore.periodById(itemId);
      if (!period || !itemId.startsWith('wikidata:')) {
        throw new Error('Période Wikidata introuvable');
      }
      const endRaw = period.endDate?.trim() || '';
      const endForForm =
        endRaw.toUpperCase() === 'TODAY' || endRaw.toUpperCase() === 'NOW' ? 'NOW' : endRaw;
      const parentFromOpts = opts?.dbParentId ?? null;
      handleAddPeriod(colIdx, {
        wikidata_id: period.wikidata_id || itemId.replace(/^wikidata:/i, ''),
        label: period.label,
        description: period.description || { fr: '', en: '' },
        startDate: period.startDate || '',
        endDate: endForForm,
        temporalLocation: period.temporalLocation || '',
        ...(parentFromOpts ? { parent_id: parentFromOpts } : {}),
      });
    } catch (cause) {
      openingError.value = cause instanceof Error ? cause.message : "Impossible d'ouvrir la création pour cette ligne";
      retryOpeningTask = async () => { handleAddFromWikidataFinderItem(colIdx, itemId, opts); };
    }
  };

  const closeAddModal = () => {
    cancelOpening();
    addModal.close();
    currentColumnIdx.value = null;
    addModalInitialData.value = null;
  };

  const handleAddSubmit = async (formData: EditFormSubmission, selectedIds: string[]) => {
    if (busy.value) return;
    addLoading.value = true;
    addError.value = null;
    try {
      const colIdx = currentColumnIdx.value;
      const formParent = typeof formData.parentId === 'string' && formData.parentId.trim() ? formData.parentId.trim() : null;
      const parentId = Object.prototype.hasOwnProperty.call(formData, 'parentId')
        ? formParent : (colIdx !== null && colIdx > 0 ? selectedIds[colIdx - 1] ?? null : null);
      const service = PeriodApiService.getInstance();
      const period = await service.createPeriod({ ...formData, parentId });
      dataStore.upsertSavedPeriod(period);
      closeAddModal();
      toast.show('Période ajoutée avec succès', 'success');
    } catch (cause: unknown) {
      addError.value = mutationErrorMessage(cause, 'Erreur lors de la création de la période');
      toast.show(addError.value!, 'error');
    } finally {
      addLoading.value = false;
    }
  };

  return {
    showEditModal: editModal.isOpen,
    deleteLoading,
    busy,
    saveError,
    addError,
    handleDelete,
    showAddModal: addModal.isOpen,
    selectedPeriod,
    currentColumnIdx,
    addModalInitialData,
    loading,
    openingError,
    retryOpening,
    cancelOpening,
    handleEdit,
    closeEditModal,
    handleEditSubmit,
    handleAddPeriod,
    handleAddFromWikidataFinderItem,
    closeAddModal,
    handleAddSubmit,
  };
}
