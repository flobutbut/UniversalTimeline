import { ref } from 'vue';
import type { Period, Event, Story } from '../types';
import { DatabaseQueryService } from './DatabaseQueryService';

export class DatabaseViewService {
  private static instance: DatabaseViewService;
  private periods = ref<Period[]>([]);
  private events = ref<Event[]>([]);
  private stories = ref<Story[]>([]);
  private loading = ref(false);
  private error = ref<string | null>(null);

  private constructor() {}

  public static getInstance(): DatabaseViewService {
    if (!DatabaseViewService.instance) {
      DatabaseViewService.instance = new DatabaseViewService();
    }
    return DatabaseViewService.instance;
  }

  public async loadData() {
    this.loading.value = true;
    this.error.value = null;

    try {
      const [periodsData, eventsData, storiesData] = await Promise.all([
        DatabaseQueryService.getInstance().getAllPeriods(),
        DatabaseQueryService.getInstance().getAllEvents(),
        DatabaseQueryService.getInstance().getAllStories()
      ]);

      this.periods.value = periodsData;
      this.events.value = eventsData;
      this.stories.value = storiesData;
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : 'Une erreur est survenue';
    } finally {
      this.loading.value = false;
    }
  }

  public getPeriods() {
    return this.periods;
  }

  public getEvents() {
    return this.events;
  }

  public getStories() {
    return this.stories;
  }

  public getLoading() {
    return this.loading;
  }

  public getError() {
    return this.error;
  }
} 