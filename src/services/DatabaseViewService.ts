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
    return this.periods.value;
  }

  public getEvents() {
    return this.events.value;
  }

  public getStories() {
    return this.stories.value;
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
      console.log('[DatabaseViewService] Début du chargement des données de liste');
      const [periodsData, eventsData, storiesData] = await Promise.all([
        this.databaseQueryService.getListPeriods(),
        this.databaseQueryService.getListEvents(),
        this.databaseQueryService.getListStories()
      ]);

      console.log('[DatabaseViewService] Périodes chargées:', periodsData.length);
      console.log('[DatabaseViewService] Événements chargés:', eventsData.length);
      console.log('[DatabaseViewService] Stories chargées:', storiesData.length);

      this.periods.value = periodsData;
      this.events.value = eventsData;
      this.stories.value = storiesData;
    } catch (error) {
      console.error('[DatabaseViewService] Erreur lors du chargement des données:', error);
      this.error.value = 'Erreur lors du chargement des données';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  public async loadFullPeriod(periodId: string): Promise<Period> {
    try {
      console.log('[DatabaseViewService] Chargement des données complètes de la période:', periodId);
      const periods = await this.databaseQueryService.getListPeriods();
      const period = periods.find(p => p.id === periodId);
      if (!period) {
        throw new Error('Période non trouvée');
      }
      return {
        ...period,
        description: { fr: '', en: '' },
        wikidata_id: (period as any).wikidata_id || '',
        parentId: null,
        temporalLocation: '',
        children: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('[DatabaseViewService] Erreur lors du chargement des données complètes de la période:', error);
      throw error;
    }
  }

  public async loadFullEvent(eventId: string): Promise<Event> {
    try {
      console.log('[DatabaseViewService] Chargement des données complètes de l\'événement:', eventId);
      const events = await this.databaseQueryService.getListEvents();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }
      return {
        ...event,
        description: { fr: '', en: '' },
        wikidata_id: (event as any).wikidata_id || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('[DatabaseViewService] Erreur lors du chargement des données complètes de l\'événement:', error);
      throw error;
    }
  }

  public async loadFullStory(storyId: number): Promise<Story> {
    try {
      console.log('[DatabaseViewService] Chargement des données complètes de la story:', storyId);
      // En attendant que le backend soit prêt, on utilise les données de liste
      const stories = await this.databaseQueryService.getListStories();
      const story = stories.find(s => s.id === storyId);
      if (!story) {
        throw new Error('Story non trouvée');
      }
      // Convertir les données de liste en données complètes
      return {
        ...story,
        description: { fr: '', en: '' }, // Valeurs par défaut
        author: '',
        isPublic: false,
        periods: [],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('[DatabaseViewService] Erreur lors du chargement des données complètes de la story:', error);
      throw error;
    }
  }
} 