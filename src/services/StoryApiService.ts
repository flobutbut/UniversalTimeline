import { apiClient } from './ApiClient';
import type { Story, StorySummary, StorySuggestion, StoryAnchor } from '../types/database';

import type { StoryDto, PeriodDto, StoryFormPayload, StoryLinkDto } from '@/types/api';
import { mapToListStory, mapToStory, mapToStorySuggestion } from './entityMappers';
export { mapToListStory } from './entityMappers';

const storyPayload = (data: StoryFormPayload): StoryFormPayload => ({
  title: data.title, description: data.description, author: data.author,
  isPublic: data.isPublic, categories: data.categories,
});

export class StoryApiService {
  private static instance: StoryApiService;

  private constructor() {}

  public static getInstance(): StoryApiService {
    if (!StoryApiService.instance) {
      StoryApiService.instance = new StoryApiService();
    }
    return StoryApiService.instance;
  }

  async getListStories(): Promise<StorySummary[]> {
    const data = await apiClient.get<StoryDto[]>('/stories');
    return data.map(mapToListStory);
  }

  async getStory(storyId: string, options?: { signal?: AbortSignal }): Promise<Story> {
    try {
      const story = await apiClient.get<StoryDto>(`/stories/${storyId}`, options);
      return mapToStory(story);
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 404) {
        throw new Error('Cette frise est introuvable ou n’est pas accessible.');
      }
      throw error;
    }
  }

  async createStory(storyData: StoryFormPayload): Promise<StorySummary> {
    return mapToListStory(await apiClient.post<StoryDto>('/stories', storyPayload(storyData)));
  }

  async updateStory(storyId: string, storyData: StoryFormPayload): Promise<StorySummary> {
    return mapToListStory(await apiClient.put<StoryDto>(`/stories/${storyId}`, storyPayload(storyData)));
  }

  async deleteStory(storyId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}`);
  }

  async getStoryPeriods(storyId: string): Promise<PeriodDto[]> {
    return apiClient.get<PeriodDto[]>(`/stories/${storyId}/periods`);
  }

  /** Frises lisibles contenant chaque période ou événement : id → storyIds. */
  async getMemberships(kind: 'period' | 'event', options?: { signal?: AbortSignal }): Promise<Map<string, string[]>> {
    const rows = await apiClient.get<StoryLinkDto[]>(`/${kind === 'period' ? 'periods' : 'events'}/story-links`, options);
    const invalid = () => new Error(`Réponse invalide pour les frises des ${kind === 'period' ? 'périodes' : 'événements'}.`);
    if (!Array.isArray(rows)) throw invalid();
    const links = new Map<string, string[]>();
    for (const row of rows) {
      const id = (row as Record<string, unknown> | null)?.[`${kind}_id`];
      if (typeof id !== 'string' || (typeof row.story_id !== 'string' && typeof row.story_id !== 'number')) throw invalid();
      links.set(id, [...(links.get(id) ?? []), String(row.story_id)]);
    }
    return links;
  }

  async changeAssociations(storyId: string, kind: 'period' | 'event', ids: string[], remove = false, parentPeriodId?: string | null): Promise<void> {
    await apiClient.post(`/stories/${storyId}/${kind === 'period' ? 'periods' : 'events'}`, { ids: [...new Set(ids)], operation: remove ? 'remove' : 'add', ...(parentPeriodId !== undefined ? { parentPeriodId } : {}) });
  }
  /** Crée une frise enfant ancrée sur une période : branche de périodes et événements de sa plage copiés. */
  async createStoryFromPeriod(storyId: string, periodId: string, title: string): Promise<{ id: string; periodCount: number; eventCount: number }> {
    const result = await apiClient.post<{ id: string | number; periodCount: number; eventCount: number }>(`/stories/${storyId}/from-period`, { periodId, title });
    if (!result || (typeof result.id !== 'string' && typeof result.id !== 'number') || !Number.isInteger(result.periodCount) || !Number.isInteger(result.eventCount)) {
      throw new Error('Réponse invalide après la création de la frise.');
    }
    return { id: String(result.id), periodCount: result.periodCount, eventCount: result.eventCount };
  }
  async changeRootPeriod(storyId: string, periodId: string): Promise<void> {
    await apiClient.put(`/stories/${storyId}/root-period`, { periodId });
  }

  /** Rattache une story enfant (définit son parent_story_id). */
  async linkChildStories(parentStoryId: string, childStoryIds: string[], anchor?: StoryAnchor): Promise<void> {
    await apiClient.post(`/stories/${parentStoryId}/child-stories`, { childStoryIds: [...new Set(childStoryIds)], ...(anchor ? { anchor: { anchorType: anchor.type, anchorId: anchor.id } } : {}) });
  }

  /** Détache une story enfant et supprime toutes ses ancres. */
  async unlinkChildStory(parentStoryId: string, childStoryId: string): Promise<void> {
    await apiClient.delete(`/stories/${parentStoryId}/child-stories/${childStoryId}`);
  }

  /** Ajoute une ancre (période ou événement) à une story enfant. */
  async addAnchor(storyId: string, anchor: StoryAnchor): Promise<void> {
    await apiClient.post(`/stories/${storyId}/anchors`, {
      anchorType: anchor.type,
      anchorId: anchor.id,
    });
  }

  /** Supprime une ancre d'une story enfant. */
  async removeAnchor(storyId: string, anchor: StoryAnchor): Promise<void> {
    await apiClient.delete(`/stories/${storyId}/anchors`, {
      data: { anchorType: anchor.type, anchorId: anchor.id },
    });
  }

  /** Stories enfants suggérées depuis une pile de navigation (périodes + événements). */
  async getSuggestions(storyId: string, periodIds: string[], eventIds: string[] = [], options?: { signal?: AbortSignal }): Promise<StorySuggestion[]> {
    if (periodIds.length === 0 && eventIds.length === 0) return [];
    const params = new URLSearchParams({ story_id: storyId });
    if (periodIds.length > 0) params.set('period_ids', periodIds.join(','));
    if (eventIds.length > 0)  params.set('event_ids',  eventIds.join(','));
    const raw = await apiClient.get<StoryDto[]>(`/stories/suggestions?${params}`, options);
    return raw.map(mapToStorySuggestion);
  }
}
