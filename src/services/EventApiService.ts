import { apiClient } from './ApiClient';
import { buildNewEntityCoreFields } from '@/lib/buildNewEntityCoreFields';
import { mapToEvent, mapToPeriod } from './entityMappers';
import type { EventDto, EventFormPayload, PeriodDto, PeriodFormPayload } from '@/types/api';
import type { Event, ListEvent, Period } from '../types/database';

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
    // Some historical internal IDs look like Q-ids: only the stored Wikidata link identifies the item.
    const found = events.find((e) => e.wikidata_id?.toUpperCase() === qid);
    return found ? mapToEvent(found) : null;
  }

  async createEvent(formData: EventFormPayload): Promise<Event> {
    const payload = {
      ...buildNewEntityCoreFields(formData),
      date: formData.date,
      tags: formData.tags,
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
      tags: formData.tags,
      ...(formData.wikipedia ? { wikipedia: formData.wikipedia } : {}),
    };
    return mapToEvent(await apiClient.put<EventDto>(`/events/${eventId}`, payload));
  }

  /** Replaces the event everywhere by a new root period (frises, entry points, anchors); no automatic retry. */
  async convertToPeriod(eventId: string, formData: PeriodFormPayload): Promise<Period> {
    const payload = {
      ...buildNewEntityCoreFields(formData),
      start_date: formData.startDate, end_date: formData.endDate || 'NOW', categories: formData.categories, tags: formData.tags, nonThematic: formData.nonThematic,
    };
    return mapToPeriod(await apiClient.post<PeriodDto>(`/events/${encodeURIComponent(eventId)}/convert-to-period`, payload));
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
