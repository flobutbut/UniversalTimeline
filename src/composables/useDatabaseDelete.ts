import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { useToast } from './useToast';
import { useLoadingState } from './useLoadingState';

export function useDatabaseDelete() {
  const dataStore = useDataStore();
  const { periods, events, stories } = storeToRefs(dataStore);
  const toast = useToast();
  const { isLoading: loading, execute } = useLoadingState();

  const handleDelete = async (item: any, type: 'period' | 'event' | 'story') => {
    if (!item) {
      toast.show('Aucun élément à supprimer', 'error');
      return false;
    }

    const confirmed = await window.showConfirm(
      'Confirmation de suppression',
      `Êtes-vous sûr de vouloir supprimer "${item.label?.fr || item.title?.fr}" ? Cette action est irréversible.`
    );
    if (!confirmed) return false;

    toast.show('Suppression en cours...', 'info', 0);

    const result = await execute(async () => {
      if (type === 'period') {
        await PeriodApiService.getInstance().deletePeriod(item.id);
        dataStore.updatePeriods(periods.value.filter(p => p.id !== item.id));
      } else if (type === 'event') {
        await EventApiService.getInstance().deleteEvent(item.id);
        dataStore.updateEvents(events.value.filter(e => e.id !== item.id));
      } else if (type === 'story') {
        await StoryApiService.getInstance().deleteStory(item.id);
        dataStore.updateStories(stories.value.filter(s => s.id !== item.id));
      } else {
        throw new Error("Type d'élément non reconnu");
      }
      return true;
    });

    toast.hide();
    if (result) {
      toast.show('Élément supprimé avec succès', 'success');
      return true;
    } else {
      toast.show('Erreur lors de la suppression', 'error');
      return false;
    }
  };

  return { loading, handleDelete };
}
