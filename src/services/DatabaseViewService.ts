import { ref } from 'vue';
import { DatabaseQueryService } from './DatabaseQueryService';
import type { Period, Event, Story, ListPeriod, ListEvent, ListStory } from '../types/database';

export class DatabaseViewService {
  private static instance: DatabaseViewService;
  private periods = ref<ListPeriod[]>([]);
  private events = ref<ListEvent[]>([]);
  private stories = ref<ListStory[]>([]);
  private loading = ref(false);
  private error = ref<string | null>(null);
  private databaseQueryService = DatabaseQueryService.getInstance();

  private constructor() {}

  public static getInstance(): DatabaseViewService {
    if (!DatabaseViewService.instance) {
      DatabaseViewService.instance = new DatabaseViewService();
    }
    return DatabaseViewService.instance;
  }

  public getPeriods() {
    return this.periods.value.map((p: any) => ({
      ...p,
      hasParent: typeof p.hasParent === 'boolean' ? p.hasParent : !!(p.parent_id),
      children: Array.isArray(p.children) ? p.children : [],
    }));
  }

  public getEvents() {
    return this.events.value;
  }

  public getStories() {
    return this.stories.value;
  }

  public setPeriods(periods: ListPeriod[]) {
    this.periods.value = periods;
  }

  public setEvents(events: ListEvent[]) {
    this.events.value = events;
  }

  public setStories(stories: ListStory[]) {
    this.stories.value = stories;
  }

  public getLoading() {
    return this.loading.value;
  }

  public getError() {
    return this.error.value;
  }

  public async loadListData(): Promise<void> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const [periodsData, eventsData, storiesData] = await Promise.all([
        this.databaseQueryService.getListPeriods(),
        this.databaseQueryService.getListEvents(),
        this.databaseQueryService.getListStories()
      ]);

      this.periods.value = periodsData;
      this.events.value = eventsData;
      this.stories.value = storiesData;
    } catch (error) {
      this.error.value = 'Erreur lors du chargement des données';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  public async loadFullPeriod(periodId: string): Promise<Period> {
    try {
      const periods = this.getPeriods();
      console.log('[loadFullPeriod] Recherche de la période avec id:', periodId);
      console.log('[loadFullPeriod] Liste des ids disponibles:', periods.map(p => p.id));
      const period = periods.find(p => p.id === periodId);
      if (!period) {
        console.error('[loadFullPeriod] Période non trouvée pour id:', periodId);
        throw new Error('Période non trouvée');
      }
      return {
        id: period.id,
        wikidata_id: (period as any).wikidata_id || '',
        label: period.label,
        description: (period as any).description ?? { fr: '', en: '' },
        startDate: (period as any).startDate || (period as any).start_date || '',
        endDate: (period as any).endDate || (period as any).end_date || '',
        hasParent: (period as any).hasParent || (period as any).has_parent || false,
        children: (period as any).children || [],
        temporalLocation: (period as any).temporalLocation || (period as any).temporal_location || '',
        categories: (period as any).categories ?? [],
        createdAt: (period as any).createdAt ?? new Date(),
        updatedAt: (period as any).updatedAt ?? new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  public async loadFullEvent(eventId: string): Promise<Event> {
    try {
      const events = this.getEvents();
      console.log('[loadFullEvent] Recherche de l\'événement avec id:', eventId);
      console.log('[loadFullEvent] Liste des ids disponibles:', events.map(e => e.id));
      const event = events.find(e => e.id === eventId);
      if (!event) {
        console.error('[loadFullEvent] Événement non trouvé pour id:', eventId);
        throw new Error('Événement non trouvé');
      }
      return {
        id: event.id,
        wikidata_id: (event as any).wikidata_id || '',
        label: event.label,
        description: (event as any).description ?? { fr: '', en: '' },
        date: (event as any).date || (event as any).temporalData?.[0]?.date || '',
        categories: (event as any).categories ?? [],
        createdAt: (event as any).createdAt ?? new Date(),
        updatedAt: (event as any).updatedAt ?? new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  public async loadFullStory(storyId: string): Promise<Story> {
    try {
      // Appel à l'API de détail pour récupérer toutes les infos de la story
      const story = await this.databaseQueryService.getStory(storyId);
      if (!story) {
        throw new Error('Story non trouvée');
      }
      return story;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Met à jour les enfants d'une période
   */
  public async updateChildren(periodId: string, newChildren: string[]): Promise<any> {
    return this.databaseQueryService.updateChildren(periodId, newChildren);
  }

  /**
   * Met à jour has_parent d'une période
   */
  public async updateHasParent(periodId: string, hasParent: boolean): Promise<any> {
    return this.databaseQueryService.updateHasParent(periodId, hasParent);
  }
} 