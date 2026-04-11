import { apiClient } from './ApiClient';
import { buildNewEntityCoreFields } from '@/lib/buildNewEntityCoreFields';
import { DateService } from './DateService';
import type { Event, ListEvent } from '../types/database';

function mapToEvent(e: any): any {
  const date = e.date || '';
  return {
    id: e.id,
    wikidata_id: e.wikidata_id || '',
    label: {
      fr: e.label?.fr ?? e.label_fr ?? '',
      en: e.label?.en ?? e.label_en ?? e.label?.fr ?? e.label_fr ?? '',
    },
    description: e.description
      ? { fr: e.description.fr || e.description_fr || '', en: e.description.en || e.description_en || e.description.fr || '' }
      : { fr: e.description_fr || '', en: e.description_en || e.description_fr || '' },
    date,
    dateYearsBP: e.date_years_bp != null
      ? Number(e.date_years_bp)
      : DateService.toYearsBP(date),
    categories: e.categories || [],
    createdAt: parseOptionalDate(e.created_at ?? e.createdAt) ?? new Date(),
    updatedAt: parseOptionalDate(e.updated_at ?? e.updatedAt) ?? new Date(),
  };
}

function parseOptionalDate(v: unknown): Date | undefined {
  if (v == null || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

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
    const data = await apiClient.get<any[]>('/events');
    return data.map(mapToEvent);
  }

  async getAllEvents(): Promise<Event[]> {
    const data = await apiClient.get<any[]>('/events');
    return data.map(mapToEvent);
  }

  async getEvent(eventId: string): Promise<Event> {
    const data = await apiClient.get<any>(`/events/${eventId}`);
    return mapToEvent(data);
  }

  async getEventsByPeriod(periodId: string): Promise<Event[]> {
    const data = await apiClient.get<any[]>(`/periods/${periodId}/events`);
    return data.map(mapToEvent);
  }

  async getEventById(qid: string): Promise<Event> {
    if (!qid.match(/^Q\d+$/)) throw new Error('Format de Q-id invalide');
    const events = await apiClient.get<any[]>('/events');
    const found = events.find((e: any) => e.wikidata_id === qid || e.id === qid);
    if (!found) throw new Error('Événement non trouvé');
    return mapToEvent(found);
  }

  async createEvent(formData: any): Promise<any> {
    const payload = {
      ...buildNewEntityCoreFields(formData),
      date: formData.date,
      categories: formData.categories || [],
    };
    return apiClient.post('/events', payload);
  }

  async updateEvent(eventId: string, formData: any): Promise<any> {
    const payload = {
      wikidata_id: formData.qid,
      label: { fr: formData.title.fr, en: formData.title.en },
      description: { fr: formData.description.fr, en: formData.description.en },
      date: formData.date,
      categories: formData.categories,
    };
    return apiClient.put(`/events/${eventId}`, payload);
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
