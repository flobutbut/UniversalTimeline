import { ref } from 'vue';
import { DatabaseQueryService } from './DatabaseQueryService';
import type { Period, Event, Story } from '../types/database';

export class DatabaseViewService {
  private static instance: DatabaseViewService;
  private periods = ref<Period[]>([]);
  private events = ref<Event[]>([]);
  private stories = ref<Story[]>([]);
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

  public async loadData(): Promise<void> {
    this.loading.value = true;
    this.error.value = null;

    try {
      console.log('[DatabaseViewService] Début du chargement des données');
      const [periodsData, eventsData, storiesData] = await Promise.all([
        this.databaseQueryService.getAllPeriods(),
        this.databaseQueryService.getAllEvents(),
        this.databaseQueryService.getAllStories()
      ]);

      console.log('[DatabaseViewService] Périodes chargées:', periodsData.length);
      console.log('[DatabaseViewService] Premier événement chargé:', JSON.stringify(eventsData[0], null, 2));
      console.log('[DatabaseViewService] Stories chargées:', storiesData.length);

      this.periods.value = periodsData;
      this.events.value = eventsData;
      this.stories.value = storiesData;
    } catch (error) {
      console.error('[DatabaseViewService] Erreur lors du chargement des données:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
} 