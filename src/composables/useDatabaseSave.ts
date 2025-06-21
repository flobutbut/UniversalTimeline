import { ref } from 'vue';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { useDatabaseDataStore } from './useDatabaseDataStore';
import { EditFormValidator } from '@/validators/editFormValidators';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';

export function useDatabaseSave() {
  const queryService = DatabaseQueryService.getInstance();
  const databaseViewService = DatabaseViewService.getInstance();
  const conflictService = ConflictResolutionService.getInstance();
  const { updatePeriods, updateEvents, updateStories } = useDatabaseDataStore();
  const loading = ref(false);

  const handleSave = async (formData: any, currentType: 'period' | 'event' | 'story', currentMode: 'create' | 'edit', currentItem: any) => {
    // Afficher un toast de chargement persistant
    window.toast.show('Sauvegarde en cours...', 'info', 0);

    try {
      loading.value = true;

      // 1. Validation des données
      const validation = EditFormValidator.validateForm(formData, currentType);
      if (!validation.isValid) {
        window.showToast(validation.errors.join(', '), 'error');
        return false;
      }
      if (currentType !== 'story') {
        const qidValidation = EditFormValidator.validateQid(formData.qid);
        if (!qidValidation.isValid) {
          window.showToast(qidValidation.errors.join(', '), 'error');
          return false;
        }
      }

      // 2. Détection et résolution des conflits (en mode édition)
      if (currentType !== 'story' && currentMode === 'edit') {
        const conflictInfo = await conflictService.detectConflict(formData.qid, currentType, currentItem?.id);
        if (conflictInfo.hasConflict) {
          const resolved = await conflictService.resolveConflictAutomatically(conflictInfo);
          if (!resolved) {
            window.showToast('Impossible de résoudre le conflit', 'error');
            return false;
          }
        }
      }

      // 3. Opération de sauvegarde
      let updatedItem;
      let retryCount = 0;
      const maxRetries = 3;

      const executeWithRetry = async (operation: () => Promise<any>) => {
        while (retryCount < maxRetries) {
          try {
            return await operation();
          } catch (error: any) {
            if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
              retryCount++;
              if (retryCount === maxRetries) {
                throw error;
              }
              // Attendre un peu avant de réessayer
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            throw error;
          }
        }
      };

      if (currentType === 'period') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updatePeriod(itemId, formData)
          );
          // Mettre à jour uniquement la période modifiée dans le store partagé
          const { periods } = useDatabaseDataStore();
          const updatedPeriods = [...periods.value];
          const index = updatedPeriods.findIndex(p => p.id === itemId);
          if (index !== -1) {
            updatedPeriods[index] = {
              ...updatedPeriods[index],
              label: { fr: formData.title.fr, en: formData.title.en },
              startDate: formData.startDate,
              endDate: formData.endDate,
              categories: updatedPeriods[index].categories
            };
            updatePeriods(updatedPeriods);
            // Synchroniser aussi DatabaseViewService
            databaseViewService.setPeriods(updatedPeriods);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createPeriod(formData)
          );
          // Ajouter la nouvelle période au store partagé
          const { periods } = useDatabaseDataStore();
          const updatedPeriods = [...periods.value];
          updatedPeriods.push({
            id: updatedItem.id,
            label: { fr: formData.title.fr, en: formData.title.en },
            startDate: formData.startDate,
            endDate: formData.endDate,
            categories: []
          });
          updatePeriods(updatedPeriods);
          // Synchroniser aussi DatabaseViewService
          databaseViewService.setPeriods(updatedPeriods);
        }
      } else if (currentType === 'event') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateEvent(itemId, formData)
          );
          // Mettre à jour uniquement l'événement modifié dans le store partagé
          const { events } = useDatabaseDataStore();
          const updatedEvents = [...events.value];
          const index = updatedEvents.findIndex(e => e.id === itemId);
          if (index !== -1) {
            updatedEvents[index] = {
              ...updatedEvents[index],
              label: { fr: formData.title.fr, en: formData.title.en },
              date: formData.date,
              categories: updatedEvents[index].categories
            };
            updateEvents(updatedEvents);
            // Synchroniser aussi DatabaseViewService
            databaseViewService.setEvents(updatedEvents);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createEvent(formData)
          );
          // Ajouter le nouvel événement au store partagé
          const { events } = useDatabaseDataStore();
          const updatedEvents = [...events.value];
          updatedEvents.push({
            id: updatedItem.id,
            label: { fr: formData.title.fr, en: formData.title.en },
            date: formData.date,
            categories: []
          });
          updateEvents(updatedEvents);
          // Synchroniser aussi DatabaseViewService
          databaseViewService.setEvents(updatedEvents);
        }
      } else if (currentType === 'story') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateStory(itemId, formData)
          );
          // Mettre à jour uniquement la story modifiée dans le store partagé
          const { stories } = useDatabaseDataStore();
          const updatedStories = [...stories.value];
          const index = updatedStories.findIndex(s => s.id === itemId);
          if (index !== -1) {
            updatedStories[index] = {
              ...updatedStories[index],
              title: { fr: formData.title.fr, en: formData.title.en },
              categories: updatedStories[index].categories
            };
            updateStories(updatedStories);
            // Synchroniser aussi DatabaseViewService
            databaseViewService.setStories(updatedStories);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createStory(formData)
          );
          // Ajouter la nouvelle story au store partagé
          const { stories } = useDatabaseDataStore();
          const updatedStories = [...stories.value];
          updatedStories.push({
            id: updatedItem.id,
            title: { fr: formData.title.fr, en: formData.title.en },
            categories: []
          });
          updateStories(updatedStories);
          // Synchroniser aussi DatabaseViewService
          databaseViewService.setStories(updatedStories);
        }
      }

      // Masquer le toast de chargement et afficher le succès
      window.toast.hide();
      window.showToast('Données mises à jour avec succès', 'success');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);

      // Masquer le toast de chargement et afficher l'erreur
      window.toast.hide();
      if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
        window.showToast('Erreur de connexion. Veuillez réessayer.', 'error');
      } else {
        window.showToast('Erreur lors de la sauvegarde des données', 'error');
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    handleSave
  };
} 