import { ref } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';

export function useDatabaseSave() {
  const databaseService = DatabaseViewService.getInstance();
  const queryService = DatabaseQueryService.getInstance();
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
          // Mettre à jour uniquement la période modifiée dans la liste
          const periods = [...databaseService.getPeriods()];
          const index = periods.findIndex(p => p.id === itemId);
          if (index !== -1) {
            periods[index] = {
              ...periods[index],
              label: { fr: formData.title.fr, en: formData.title.en },
              startDate: formData.startDate,
              endDate: formData.endDate,
              categories: periods[index].categories
            };
            databaseService.setPeriods(periods);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createPeriod(formData)
          );
          // Ajouter la nouvelle période à la liste
          const periods = [...databaseService.getPeriods()];
          periods.push({
            id: updatedItem.id,
            label: { fr: formData.title.fr, en: formData.title.en },
            startDate: formData.startDate,
            endDate: formData.endDate,
            categories: []
          });
          databaseService.setPeriods(periods);
        }
      } else if (currentType === 'event') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateEvent(itemId, formData)
          );
          // Mettre à jour uniquement l'événement modifié dans la liste
          const events = [...databaseService.getEvents()];
          const index = events.findIndex(e => e.id === itemId);
          if (index !== -1) {
            events[index] = {
              ...events[index],
              label: { fr: formData.title, en: formData.title },
              date: formData.date,
              categories: events[index].categories
            };
            databaseService.setEvents(events);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createEvent(formData)
          );
          // Ajouter le nouvel événement à la liste
          const events = [...databaseService.getEvents()];
          events.push({
            id: updatedItem.id,
            label: { fr: formData.title, en: formData.title },
            date: formData.date,
            categories: []
          });
          databaseService.setEvents(events);
        }
      } else if (currentType === 'story') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateStory(itemId, formData)
          );
          // Mettre à jour uniquement la story modifiée dans la liste
          const stories = [...databaseService.getStories()];
          const index = stories.findIndex(s => s.id === itemId);
          if (index !== -1) {
            stories[index] = {
              ...stories[index],
              title: { fr: formData.title, en: formData.title },
              categories: stories[index].categories
            };
            databaseService.setStories(stories);
          }
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createStory(formData)
          );
          // Ajouter la nouvelle story à la liste
          const stories = [...databaseService.getStories()];
          stories.push({
            id: updatedItem.id,
            title: { fr: formData.title, en: formData.title },
            categories: []
          });
          databaseService.setStories(stories);
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