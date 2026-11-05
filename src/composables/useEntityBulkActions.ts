import { computed } from 'vue';
import { useCatalogueBulkActions, type CatalogueBulkAction } from './useCatalogueBulkActions';
import type { useStoryLinks } from './useStoryLinks';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod, ListEvent } from '@/types/database';

export function useEntityBulkActions(kind: 'period' | 'event', items: () => Array<ListPeriod | ListEvent>, links: ReturnType<typeof useStoryLinks>) {
  const store = useDataStore(); const auth = useAuthStore();
  const editableStories = computed(() => store.stories.filter(auth.canEditStory).map(story => ({ value: story.id, label: story.title.fr || story.title.en || story.id })));
  const actions: { value: CatalogueBulkAction; label: string }[] = [
    { value: 'add-story', label: 'Ajouter à une frise' }, { value: 'remove-story', label: 'Retirer d’une frise' },
    { value: 'export', label: 'Exporter en CSV' }, { value: 'delete', label: 'Supprimer du catalogue' },
  ];
  const bulk = useCatalogueBulkActions({
    items, label: kind === 'period' ? 'Périodes' : 'Événements', itemLabel: item => item.label.fr || item.label.en || item.id,
    deleteItem: async item => {
      if (kind === 'period') store.removeDeletedPeriod(await PeriodApiService.getInstance().deletePeriod(item.id));
      else { await EventApiService.getInstance().deleteEvent(item.id); store.updateEvents(store.events.filter(event => event.id !== item.id)); }
    },
    reload: async () => {
      if (kind === 'period') await store.ensureRootsLoaded(true);
      else await store.ensureEventsLoaded(true);
      await links.load();
    },
    invalidate: () => store.invalidateCatalogue(kind),
    canEditStory: id => { const story = store.storyById(id); return !!story && auth.canEditStory(story); },
    associate: async (ids, storyId, remove) => {
      await StoryApiService.getInstance().changeAssociations(storyId, kind, ids, remove);
      store.invalidateStory(storyId);
      await links.load();
    },
    csvRow: item => ({ ID: item.id, Nom: item.label.fr || item.label.en,
      ...('startDate' in item ? { Début: item.startDate, Fin: item.endDate } : { Date: item.date }),
      Catégories: item.categories.map(category => category.label.fr || category.label.en).join(', '),
      Frises: links.storyIdsOf(item.id).map(id => store.storyById(id)?.title.fr || id).join(', '),
    }),
  });
  return { ...bulk, actions, editableStories };
}
