import { ref } from 'vue';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import { useDatabaseDataStore } from './useDatabaseDataStore';

export function useDatabaseSave() {
  const queryService = DatabaseQueryService.getInstance();
  const { updatePeriods, updateEvents, updateStories } = useDatabaseDataStore();
  const loading = ref(false);

  const handleSave = async (formData: any, currentType: 'period' | 'event' | 'story', currentMode: 'create' | 'edit', currentItem: any) => {
    try {
      loading.value = true;
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
        }
      }

      window.showToast('Données mises à jour avec succès', 'success');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
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