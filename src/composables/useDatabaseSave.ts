import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { EditFormValidator } from '@/validators/editFormValidators';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
import { useToast } from './useToast';
import { useLoadingState } from './useLoadingState';
import { ref } from 'vue';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import type { EditFormSubmission, EditFormType, EditFormMode, EditableItem } from '@/types/editForm';

export function useDatabaseSave() {
  const dataStore = useDataStore();
  const conflictService = ConflictResolutionService.getInstance();
  const toast = useToast();
  const { isLoading: loading } = useLoadingState();
  const error = ref<string | null>(null);
  const savedStoryId = ref<string | null>(null);
  const fail = (message: string) => {
    error.value = message;
    toast.hide();
    toast.show(message, 'error');
    return false;
  };

  const handleSave = async (formData: EditFormSubmission, currentType: EditFormType, currentMode: EditFormMode, currentItem?: Pick<EditableItem, 'id'> | null) => {
    if (loading.value) return false;
    error.value = null;
    savedStoryId.value = null;
    toast.show('Sauvegarde en cours...', 'info', 0);

    try {
      loading.value = true;

      // 1. Validation
      const validation = EditFormValidator.validateForm(formData, currentType);
      if (!validation.isValid) {
        return fail(validation.errors.join(', '));
      }
      if (currentMode === 'edit' && !currentItem) return fail('Aucun élément sélectionné pour la modification.');
      const submission = { ...formData, qid: formData.qid.trim().toUpperCase() };

      // 2. Refuser les conflits sans modifier ni supprimer un autre élément
      if (currentType !== 'story' && currentMode === 'edit' && submission.qid) {
        const conflictInfo = await conflictService.detectConflict(submission.qid, currentType, currentItem?.id);
        if (conflictInfo.hasConflict) {
          return fail('Ce Q-id est déjà utilisé. Aucun élément n’a été modifié ou supprimé.');
        }
      }

      // A response can be lost after COMMIT: send each write once.
      if (currentType === 'period') {
        const service = PeriodApiService.getInstance();
        const updatedItem = await (currentMode === 'edit' && currentItem
          ? service.updatePeriod(currentItem.id, submission) : service.createPeriod(submission));
        dataStore.upsertSavedPeriod(updatedItem);
      } else if (currentType === 'event') {
        const service = EventApiService.getInstance();
        const updatedItem = await (currentMode === 'edit' && currentItem
          ? service.updateEvent(currentItem.id, submission) : service.createEvent(submission));
        dataStore.upsertSavedEvent(updatedItem);
      } else {
        const service = StoryApiService.getInstance();
        const updatedItem = await (currentMode === 'edit' && currentItem
          ? service.updateStory(currentItem.id, submission) : service.createStory(submission));
        dataStore.upsertSavedStory(updatedItem);
        savedStoryId.value = updatedItem.id;
        // The parent now proposes the new frise on its anchor.
        if (submission.storyPlacement) dataStore.invalidateStory(submission.storyPlacement.parentStoryId);
      }

      toast.hide();
      toast.show('Données mises à jour avec succès', 'success');
      return true;
    } catch (error: unknown) {
      console.error('Erreur lors de la sauvegarde:', error);
      return fail(mutationErrorMessage(error, 'Erreur lors de la sauvegarde des données'));
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, handleSave, savedStoryId };
}
