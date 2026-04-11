import { apiClient } from './ApiClient';
import type { Story, ListStory, Period, Event } from '../types/database';

/** Valeur renvoyée par l’API / pg (texte, Date, etc.) → chaîne pour DateService. */
function normalizeStoryBound(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  const str = String(v).trim();
  return str === '' ? undefined : str;
}

function mapToListStory(s: any): any {
  const startRaw = normalizeStoryBound(s.start_date ?? s.startDate);
  const endRaw = normalizeStoryBound(s.end_date ?? s.endDate);
  return {
    id: s.id,
    title: {
      fr: s.title_fr ?? s.title?.fr ?? '',
      en: s.title_en ?? s.title?.en ?? s.title_fr ?? s.title?.fr ?? '',
    },
    description: s.description_fr
      ? { fr: s.description_fr, en: s.description_en || s.description_fr }
      : (s.description ?? undefined),
    author: s.author,
    isPublic: s.is_public ?? s.isPublic ?? true,
    categories: s.categories || [],
    createdAt: s.created_at ? new Date(s.created_at) : new Date(),
    updatedAt: s.updated_at ? new Date(s.updated_at) : new Date(),
    ...(startRaw ? { startDate: startRaw } : {}),
    ...(endRaw ? { endDate: endRaw } : {}),
  };
}

export class StoryApiService {
  private static instance: StoryApiService;

  private constructor() {}

  public static getInstance(): StoryApiService {
    if (!StoryApiService.instance) {
      StoryApiService.instance = new StoryApiService();
    }
    return StoryApiService.instance;
  }

  async getListStories(): Promise<ListStory[]> {
    const data = await apiClient.get<any[]>('/stories');
    return data.map(mapToListStory);
  }

  /** Une ligne par story ayant au moins une période ou un événement lié. */
  async getStoriesTemporalBounds(): Promise<
    Array<{ story_id: string; start_date: string | null; end_date: string | null }>
  > {
    return apiClient.get('/stories/temporal-bounds');
  }

  async getAllStories(): Promise<Story[]> {
    const data = await apiClient.get<any[]>('/stories');
    return data.map(mapToListStory) as Story[];
  }

  async getStory(storyId: string): Promise<Story> {
    return apiClient.get<Story>(`/stories/${storyId}`);
  }

  async createStory(storyData: any): Promise<Story> {
    return apiClient.post<Story>('/stories', storyData);
  }

  async updateStory(storyId: string, storyData: any): Promise<Story> {
    return apiClient.put<Story>(`/stories/${storyId}`, storyData);
  }

  async deleteStory(storyId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}`);
  }

  async getStoryPeriods(storyId: string): Promise<Period[]> {
    return apiClient.get<Period[]>(`/stories/${storyId}/periods`);
  }

  async addPeriodToStory(storyId: string, periodId: string): Promise<void> {
    await apiClient.post(`/stories/${storyId}/periods/${periodId}`);
  }

  async removePeriodFromStory(storyId: string, periodId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}/periods/${periodId}`);
  }

  async getStoryEvents(storyId: string): Promise<Event[]> {
    return apiClient.get<Event[]>(`/stories/${storyId}/events`);
  }

  async addEventToStory(storyId: string, eventId: string): Promise<void> {
    await apiClient.post(`/stories/${storyId}/events/${eventId}`);
  }

  async removeEventFromStory(storyId: string, eventId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}/events/${eventId}`);
  }
}
