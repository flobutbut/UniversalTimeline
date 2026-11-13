import { localizedText, uiFormat } from '@/i18n';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { useToast } from './useToast';
import { useLoadingState } from './useLoadingState';
import { useConfirm } from './useConfirm';

export function useDatabaseDelete() {
  const dataStore = useDataStore();
  const { events, stories } = storeToRefs(dataStore);
  const toast = useToast();
  const confirm = useConfirm();
  const { isLoading: loading } = useLoadingState();

  const handleDelete = async (item: any, type: 'period' | 'event' | 'story') => {
    if (loading.value) return false;
    if (!item) {
      toast.show('Aucun élément à supprimer', 'error');
      return false;
    }

    loading.value = true;
    try {
      const policy = type === 'period' ? ' Seules les périodes sans sous-période et sans lien vers une frise peuvent être supprimées.' : '';
      const confirmed = await confirm(
        'Confirmation de suppression',
        uiFormat`Êtes-vous sûr de vouloir supprimer "${localizedText(item.label) || localizedText(item.title)}" ? Cette action est irréversible.${policy}`
      );
      if (!confirmed) return false;
      toast.show('Suppression en cours...', 'info', 0);
      if (type === 'period') {
        const deleted = await PeriodApiService.getInstance().deletePeriod(item.id);
        dataStore.removeDeletedPeriod(deleted);
      } else if (type === 'event') {
        await EventApiService.getInstance().deleteEvent(item.id);
        dataStore.updateEvents(events.value.filter(e => e.id !== item.id));
      } else if (type === 'story') {
        await StoryApiService.getInstance().deleteStory(item.id);
        dataStore.updateStories(stories.value.filter(s => s.id !== item.id));
      } else {
        throw new Error("Type d'élément non reconnu");
      }
      toast.hide();
      toast.show('Élément supprimé avec succès', 'success');
      return true;
    } catch (error: any) {
      toast.hide();
      toast.show(error?.response?.data?.error || error?.message || 'Erreur lors de la suppression', 'error');
      return false;
    } finally {
      loading.value = false;
    }
  };

  return { loading, handleDelete };
}
