import { apiClient } from './ApiClient';
import { buildNewEntityCoreFields } from '@/lib/buildNewEntityCoreFields';
import { mapToEvent } from './entityMappers';
import type { EventDto, EventFormPayload } from '@/types/api';
import type { Event, ListEvent } from '../types/database';

export { mapToEvent } from './entityMappers';

export class EventApiService {
  private static instance: EventApiService;

  private constructor() {}

  public static getInstance(): EventApiService {
    if (!EventApiService.instance) {
      EventApiService.instance = new EventApiService();
    }
    return EventApiService.instance;
  }

  async getListEvents(): Promise<ListEvent[]> {
    const data = await apiClient.get<EventDto[]>('/events');
    return data.map(mapToEvent);
  }

  async getStoryListEvents(storyId: string): Promise<ListEvent[]> {
    const data = await apiClient.get<EventDto[]>(`/stories/${storyId}/events`);
    return data.map(mapToEvent);
  }

  async getEventById(qid: string): Promise<Event | null> {
    if (!qid.match(/^Q\d+$/)) throw new Error('Format de Q-id invalide');
    const events = await apiClient.get<EventDto[]>('/events');
    const found = events.find((e) => e.wikidata_id === qid || e.id === qid);
    return found ? mapToEvent(found) : null;
  }

  async createEvent(formData: EventFormPayload): Promise<Event> {
    const payload = {
      ...buildNewEntityCoreFields(formData),
      date: formData.date,
      categories: formData.categories || [],
    };
    return mapToEvent(await apiClient.post<EventDto>('/events', payload));
  }

  async updateEvent(eventId: string, formData: EventFormPayload): Promise<Event> {
    const payload = {
      wikidata_id: formData.qid,
      label: { fr: formData.title.fr, en: formData.title.en },
      description: { fr: formData.description?.fr ?? '', en: formData.description?.en ?? formData.description?.fr ?? '' },
      date: formData.date,
      categories: formData.categories,
    };
    return mapToEvent(await apiClient.put<EventDto>(`/events/${eventId}`, payload));
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await apiClient.delete(`/events/${eventId}`);
    } catch (error: any) {
      // 404 = déjà supprimé, on ignore
      if (error?.response?.status === 404) return;
      throw error;
    }
  }
}
