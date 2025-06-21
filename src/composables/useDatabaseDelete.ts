import { ref } from 'vue';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import { useDatabaseDataStore } from './useDatabaseDataStore';

export function useDatabaseDelete() {
  const queryService = DatabaseQueryService.getInstance();
  const { periods, events, stories, updatePeriods, updateEvents, updateStories } = useDatabaseDataStore();
  const loading = ref(false);

  const handleDelete = async (item: any, type: 'period' | 'event' | 'story') => {
    if (!item) {
      window.toast.show('Aucun élément à supprimer', 'error');
      return false;
    }

    const confirmed = await window.showConfirm(
      'Confirmation de suppression',
      `Êtes-vous sûr de vouloir supprimer "${item.label?.fr || item.title?.fr}" ? Cette action est irréversible.`
    );

    if (!confirmed) {
      return false;
    }

    window.toast.show('Suppression en cours...', 'info', 0);
    loading.value = true;

    try {
      let success = false;
      if (type === 'period') {
        await queryService.deletePeriod(item.id);
        const newPeriods = periods.value.filter(p => p.id !== item.id);
        updatePeriods(newPeriods);
        success = true;
      } else if (type === 'event') {
        await queryService.deleteEvent(item.id);
        const newEvents = events.value.filter(e => e.id !== item.id);
        updateEvents(newEvents);
        success = true;
      } else if (type === 'story') {
        await queryService.deleteStory(item.id);
        const newStories = stories.value.filter(s => s.id !== item.id);
        updateStories(newStories);
        success = true;
      }

      if (success) {
        window.toast.hide();
        window.showToast('Élément supprimé avec succès', 'success');
      } else {
        throw new Error("Type d'élément non reconnu");
      }

      return true;
    } catch (error: any) {
        window.toast.hide();
        window.showToast(error.message || 'Erreur lors de la suppression', 'error');
        return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    handleDelete,
  };
} 