import { ref } from 'vue';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import { useDatabaseDataStore } from './useDatabaseDataStore';

export function useDatabaseSave() {
  const queryService = DatabaseQueryService.getInstance();
  const { loadInitialData: sharedLoadInitialData } = useDatabaseDataStore();
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
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createPeriod(formData)
          );
        }
      } else if (currentType === 'event') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateEvent(itemId, formData)
          );
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createEvent(formData)
          );
        }
      } else if (currentType === 'story') {
        if (currentMode === 'edit' && currentItem) {
          const itemId = currentItem.id;
          updatedItem = await executeWithRetry(() => 
            queryService.updateStory(itemId, formData)
          );
        } else {
          updatedItem = await executeWithRetry(() => 
            queryService.createStory(formData)
          );
        }
      }

      // Recharger toutes les données depuis l'API pour s'assurer de la cohérence
      await sharedLoadInitialData();

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