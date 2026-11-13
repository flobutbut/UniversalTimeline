import { uiFormat } from '@/i18n';
import { apiClient } from './ApiClient';
import type { EventImportance, Story, StorySummary, StorySuggestion, StoryAnchor, TagRef } from '../types/database';

import type { StoryDto, PeriodDto, StoryFormPayload, StoryLinkDto } from '@/types/api';
import { mapToListStory, mapToStory, mapToStorySuggestion, mapToTag } from './entityMappers';
import type { WikidataTimelineItem, ExistingWikidataStory } from '@/types/wikidataGeneration';
import { effectiveWikidataParent } from '@/lib/wikidataHierarchy';
import type { StoryNavigationSnapshot } from '../../server/src/shared/storyNavigation';
import { CATALOGUE_PAGE_SIZE, type StoryCatalogueQuery } from '../../server/src/shared/storyCatalogue';
export { mapToListStory } from './entityMappers';
export interface StoryFromPeriodResult { id: string; periodCount: number; eventCount: number; movedPeriodCount: number; linkedStoryCount: number }
export interface PublicStoryCataloguePage {
  items: StorySummary[];
  nextCursor: string | null;
  total: number | null;
  publicTotal: number;
  tags: TagRef[];
}
export type { StoryCatalogueQuery };

// Le serveur signe la frise avec le compte connecté ; un auteur vide n'est pas transmis.
const storyPayload = (data: StoryFormPayload): StoryFormPayload => ({
  title: data.title, description: data.description, author: data.author?.trim() || undefined,
  isPublic: data.isPublic, categories: data.categories, tags: data.tags,
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

  async getListStories(options?: { compact?: boolean; signal?: AbortSignal }): Promise<StorySummary[]> {
    const data = await apiClient.get<StoryDto[]>(options?.compact ? '/stories?view=summary' : '/stories', { signal: options?.signal });
    return data.map(mapToListStory);
  }
  async getPublicCatalogue(query: StoryCatalogueQuery, options: { cursor?: string | null; signal?: AbortSignal } = {}): Promise<PublicStoryCataloguePage> {
    const params = new URLSearchParams({ limit: String(CATALOGUE_PAGE_SIZE) });
    if (query.search) params.set('q', query.search);
    if (query.tagIds.length) params.set('tags', query.tagIds.join(','));
    if (options.cursor) params.set('cursor', options.cursor);
    for (const [prefix, range] of [['time', query.timeRange], ['period', query.periodRange]] as const) {
      if (range) { params.set(`${prefix}Old`, String(range.oldBP)); params.set(`${prefix}Recent`, String(range.recentBP)); }
    }
    const data = await apiClient.get<Omit<PublicStoryCataloguePage, 'items'> & { items: StoryDto[] }>(`/stories/catalogue?${params}`, { signal: options.signal });
    const invalid = () => new Error('Réponse invalide lors du chargement du catalogue.');
    if (!data || !Array.isArray(data.items) || data.items.length > CATALOGUE_PAGE_SIZE || !Array.isArray(data.tags)
      || (data.nextCursor !== null && (typeof data.nextCursor !== 'string' || !/^[1-9]\d*$/.test(data.nextCursor)))
      || (data.total !== null && (!Number.isSafeInteger(data.total) || data.total < 0))
      || !Number.isSafeInteger(data.publicTotal) || data.publicTotal < 0) throw invalid();
    const items = data.items.map(mapToListStory);
    if (items.some((story, index) => !story.isPublic || !/^[1-9]\d{0,9}$/.test(story.id) || Number(story.id) > 2147483647
      || (index > 0 && Number(items[index - 1].id) <= Number(story.id))
      || (options.cursor != null && Number(story.id) >= Number(options.cursor)))
      || (data.nextCursor !== null && data.nextCursor !== items[items.length - 1]?.id)) throw invalid();
    return { ...data, items, tags: data.tags.map(mapToTag) };
  }
  async getNavigationStories(signal?: AbortSignal): Promise<StoryNavigationSnapshot[]> {
    const rows = await apiClient.get<StoryNavigationSnapshot[]>('/stories/navigation', { signal });
    if (!Array.isArray(rows) || rows.some(row => !/^[1-9]\d*$/.test(row.id) || !Array.isArray(row.periods) || !Array.isArray(row.events))) throw new Error('Parcours des frises indisponibles.');
    return rows;
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
    const placement = storyData.storyPlacement;
    return mapToListStory(await apiClient.post<StoryDto>('/stories', { ...storyPayload(storyData), ...(placement ? {
      parentStoryId: placement.parentStoryId, ...(placement.anchorPeriodId ? { anchor: { anchorType: 'period', anchorId: placement.anchorPeriodId } } : {}),
    } : {}) }));
  }

  async findWikidataStories(qid: string, title: string, signal?: AbortSignal): Promise<ExistingWikidataStory[]> {
    const result = await apiClient.get<ExistingWikidataStory[]>(`/stories/wikidata-matches?${new URLSearchParams({ qid, title })}`, { signal });
    if (!Array.isArray(result) || result.some(story => !story || !/^[1-9]\d*$/.test(story.id) || typeof story.title !== 'string' || !['subject', 'title'].includes(story.reason))) throw new Error('Réponse invalide lors de la vérification des frises.');
    return result;
  }

  async createFromWikidata(qid: string, title: string, items: WikidataTimelineItem[], isPublic = false, description?: string, acknowledgedStoryIds?: string[], texts?: WikidataTimelineItem['texts']): Promise<{ id: string; periodCount: number; eventCount: number }> {
    const result = await apiClient.post<{ id: string; periodCount: number; eventCount: number }>('/stories/from-wikidata', {
      qid, title, isPublic, ...(texts ? { texts } : {}), ...(description === undefined ? {} : { description }), ...(acknowledgedStoryIds?.length ? { acknowledgedStoryIds } : {}), items: items.map(item => {
        const { qid, type, title, description, startDate, endDate, id, origin, source, wikipedia } = item;
        // Un fait dérivé n'a pas d'article propre.
        return { qid, type, title, description, ...(item.texts ? { texts: item.texts } : {}), startDate, endDate, ...(id ? { id, origin, source } : {}), ...(wikipedia && origin !== 'fact' ? { wikipedia } : {}), ...(type === 'period' ? { parentQid: effectiveWikidataParent(item, items) } : {}) };
      }),
    });
    if (!result || !/^[1-9]\d*$/.test(result.id) || !Number.isInteger(result.periodCount) || !Number.isInteger(result.eventCount)) throw new Error('Réponse invalide après la création de la frise.');
    return result;
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
    const invalid = () => new Error(uiFormat`Réponse invalide pour les frises des ${kind === 'period' ? 'périodes' : 'événements'}.`);
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
  /** Crée une frise enfant ancrée sur une période : sous-périodes et leurs liens déplacés, événements de sa plage copiés. */
  async createStoryFromPeriod(storyId: string, periodId: string, title: string): Promise<StoryFromPeriodResult> {
    const result = await apiClient.post<Partial<Record<keyof StoryFromPeriodResult, unknown>>>(`/stories/${storyId}/from-period`, { periodId, title });
    const counts = ['periodCount', 'eventCount', 'movedPeriodCount', 'linkedStoryCount'] as const;
    if (!result || (typeof result.id !== 'string' && typeof result.id !== 'number') || !counts.every(key => Number.isInteger(result[key]))) {
      throw new Error('Réponse invalide après la création de la frise.');
    }
    return { id: String(result.id), periodCount: result.periodCount as number, eventCount: result.eventCount as number,
      movedPeriodCount: result.movedPeriodCount as number, linkedStoryCount: result.linkedStoryCount as number };
  }
  async changePresentation(contextId: string, periodId: string, targetStoryId: string, remove = false): Promise<void> {
    await apiClient.post(`/stories/${contextId}/presentations`, { periodId, targetStoryId, operation: remove ? 'remove' : 'add' });
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

  async changeEntryPoints(sourceId: string, targetIds: string[], anchor: StoryAnchor | null | undefined, remove = false): Promise<void> {
    await apiClient.post(`/stories/${sourceId}/entry-points`, {
      childStoryIds: [...new Set(targetIds)], operation: remove ? 'remove' : 'add',
      ...(anchor ? { anchor: { anchorType: anchor.type, anchorId: anchor.id } } : anchor === null ? {anchor:null} : {}),
    });
  }

  async moveEntryPoint(sourceId: string, targetStoryId: string, from: StoryAnchor | null, to: StoryAnchor | null): Promise<void> {
    const location = (anchor: StoryAnchor | null) => anchor ? { anchorType: anchor.type, anchorId: anchor.id } : null;
    await apiClient.post(`/stories/${sourceId}/entry-points/move`, { targetStoryId, from: location(from), to: location(to) });
  }
  async setEntryDisplay(sourceId: string, targetStoryId: string, anchor: StoryAnchor | null, asPeriod: boolean): Promise<void> {
    await apiClient.post(`/stories/${sourceId}/entry-points/display`, { targetStoryId, location: anchor ? { anchorType: anchor.type, anchorId: anchor.id } : null, asPeriod });
  }

  /** Importance d'un événement dans cette frise ; aucune relance automatique (écriture). */
  async setEventImportance(storyId: string, eventId: string, importance: EventImportance): Promise<void> {
    await apiClient.put(`/stories/${storyId}/events/${encodeURIComponent(eventId)}/importance`, { importance });
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
