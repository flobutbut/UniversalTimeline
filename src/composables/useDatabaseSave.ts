import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { EditFormValidator } from '@/validators/editFormValidators';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
import { useToast } from './useToast';
import { useLoadingState } from './useLoadingState';

export function useDatabaseSave() {
  const dataStore = useDataStore();
  const { periods, events, stories } = storeToRefs(dataStore);
  const conflictService = ConflictResolutionService.getInstance();
  const toast = useToast();
  const { isLoading: loading } = useLoadingState();

  const handleSave = async (formData: any, currentType: 'period' | 'event' | 'story', currentMode: 'create' | 'edit', currentItem: any) => {
    toast.show('Sauvegarde en cours...', 'info', 0);

    try {
      loading.value = true;

      // 1. Validation
      const validation = EditFormValidator.validateForm(formData, currentType);
      if (!validation.isValid) {
        toast.hide();
        toast.show(validation.errors.join(', '), 'error');
        return false;
      }
      if (currentType !== 'story') {
        const qidValidation = EditFormValidator.validateQid(formData.qid);
        if (!qidValidation.isValid) {
          toast.hide();
          toast.show(qidValidation.errors.join(', '), 'error');
          return false;
        }
      }

      // 2. Détection et résolution des conflits (mode édition uniquement)
      if (currentType !== 'story' && currentMode === 'edit') {
        const conflictInfo = await conflictService.detectConflict(formData.qid, currentType, currentItem?.id);
        if (conflictInfo.hasConflict) {
          const resolved = await conflictService.resolveConflictAutomatically(conflictInfo);
          if (!resolved) {
            toast.hide();
            toast.show('Impossible de résoudre le conflit', 'error');
            return false;
          }
        }
      }

      // 3. Sauvegarde avec retry sur erreurs réseau
      let updatedItem: any;
      let retryCount = 0;
      const maxRetries = 3;

      const executeWithRetry = async (operation: () => Promise<any>) => {
        while (retryCount < maxRetries) {
          try {
            return await operation();
          } catch (error: any) {
            if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
              retryCount++;
              if (retryCount === maxRetries) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            throw error;
          }
        }
      };

      if (currentType === 'period') {
        const periodService = PeriodApiService.getInstance();
        if (currentMode === 'edit' && currentItem) {
          updatedItem = await executeWithRetry(() => periodService.updatePeriod(currentItem.id, formData));
          const idx = periods.value.findIndex(p => p.id === currentItem.id);
          if (idx !== -1) {
            const updated = [...periods.value];
            updated[idx] = { ...updated[idx], label: { fr: formData.title.fr, en: formData.title.en }, startDate: formData.startDate, endDate: formData.endDate };
            dataStore.updatePeriods(updated);
          }
        } else {
          updatedItem = await executeWithRetry(() => periodService.createPeriod(formData));
          dataStore.updatePeriods([...periods.value, { id: updatedItem.id, label: { fr: formData.title.fr, en: formData.title.en }, startDate: formData.startDate, endDate: formData.endDate, categories: [] }]);
        }
      } else if (currentType === 'event') {
        const eventService = EventApiService.getInstance();
        if (currentMode === 'edit' && currentItem) {
          updatedItem = await executeWithRetry(() => eventService.updateEvent(currentItem.id, formData));
          const idx = events.value.findIndex(e => e.id === currentItem.id);
          if (idx !== -1) {
            const updated = [...events.value];
            updated[idx] = { ...updated[idx], label: { fr: formData.title.fr, en: formData.title.en }, date: formData.date };
            dataStore.updateEvents(updated);
          }
        } else {
          updatedItem = await executeWithRetry(() => eventService.createEvent(formData));
          dataStore.updateEvents([...events.value, { id: updatedItem.id, label: { fr: formData.title.fr, en: formData.title.en }, date: formData.date, categories: [] }]);
        }
      } else if (currentType === 'story') {
        const storyService = StoryApiService.getInstance();
        if (currentMode === 'edit' && currentItem) {
          updatedItem = await executeWithRetry(() => storyService.updateStory(currentItem.id, formData));
          const idx = stories.value.findIndex(s => s.id === currentItem.id);
          if (idx !== -1) {
            const updated = [...stories.value];
            updated[idx] = { ...updated[idx], title: { fr: formData.title.fr, en: formData.title.en } };
            dataStore.updateStories(updated);
          }
        } else {
          updatedItem = await executeWithRetry(() => storyService.createStory(formData));
          dataStore.updateStories([...stories.value, { id: updatedItem.id, title: { fr: formData.title.fr, en: formData.title.en }, categories: [] }]);
        }
      }

      toast.hide();
      toast.show('Données mises à jour avec succès', 'success');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.hide();
      if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
        toast.show('Erreur de connexion. Veuillez réessayer.', 'error');
      } else {
        toast.show(error.response?.data?.message || error.message || 'Erreur lors de la sauvegarde des données', 'error');
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  return { loading, handleSave };
}
