import { afterEach, expect, it, vi } from 'vitest';
import { StoryApiService } from '../StoryApiService';
import { apiClient } from '../ApiClient';
import type { WikidataTimelineItem } from '@/types/wikidataGeneration';

afterEach(() => vi.restoreAllMocks());
const period = (qid: string, parentQid: string | null): WikidataTimelineItem => ({ qid, parentQid, type: 'period', title: qid, description: '', startDate: '1789', endDate: '1799', selected: true });

it('sends only selected-period parents and excludes discovery metadata and event parents', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: '42', periodCount: 2, eventCount: 1 });
  await StoryApiService.getInstance().createFromWikidata('Q1', 'Frise', [
    { ...period('Q2', 'Q1'), parentCandidates: ['Q1'], warning: 'à vérifier' },
    period('Q3', 'Q2'), { ...period('Q4', 'Q2'), type: 'event' },
  ]);
  expect(post).toHaveBeenCalledWith('/stories/from-wikidata', { qid: 'Q1', title: 'Frise', isPublic: false, items: [
    expect.objectContaining({ qid: 'Q2', parentQid: null }), expect.objectContaining({ qid: 'Q3', parentQid: 'Q2' }),
    { qid: 'Q4', type: 'event', title: 'Q4', description: '', startDate: '1789', endDate: '1799' },
  ] });
  const payload = post.mock.calls[0][1] as { items: object[] };
  expect(payload.items.every(item => !('parentCandidates' in item) && !('warning' in item))).toBe(true);
});

it('transmits an explicit public visibility choice', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: '42', periodCount: 1, eventCount: 0 });
  await StoryApiService.getInstance().createFromWikidata('Q1', 'Frise', [period('Q1', null)], true);
  expect(post).toHaveBeenCalledWith('/stories/from-wikidata', expect.objectContaining({ isPublic: true }));
});

it('transmits the edited description, including an intentional empty description', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: '42', periodCount: 1, eventCount: 0 });
  for (const description of ['Description modifiée\nDeuxième ligne.', '']) {
    await StoryApiService.getInstance().createFromWikidata('Q1', 'Frise', [period('Q1', null)], false, description);
    expect(post).toHaveBeenLastCalledWith('/stories/from-wikidata', expect.objectContaining({ description }));
  }
});

it('only sends the explicitly acknowledged story IDs and validates the duplicate-check response', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: '42', periodCount: 1, eventCount: 0 });
  await StoryApiService.getInstance().createFromWikidata('Q1', 'Frise', [period('Q1', null)], false, '', ['30']);
  expect(post).toHaveBeenCalledWith('/stories/from-wikidata', expect.objectContaining({ acknowledgedStoryIds: ['30'] }));
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue([{ id: '30', title: 'Frise existante', reason: 'subject' }]);
  expect(await StoryApiService.getInstance().findWikidataStories('Q1', 'Frise')).toHaveLength(1);
  get.mockResolvedValueOnce([{ id: 'invalid', title: 'Frise', reason: 'subject' }]);
  await expect(StoryApiService.getInstance().findWikidataStories('Q1', 'Frise')).rejects.toThrow('Réponse invalide');
});
