import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useStoryLinks } from '../useStoryLinks';
import { apiClient } from '@/services/ApiClient';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const stories = StoryApiService.getInstance();
let scope: EffectScope;
function start(kind: 'period' | 'event' = 'event') { scope = effectScope(); return scope.run(() => useStoryLinks(kind))!; }
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(stories, 'getListStories').mockResolvedValue([]);
});
afterEach(() => { scope?.stop(); vi.restoreAllMocks(); vi.mocked(apiClient.get).mockReset(); });

it.each([
  ['event', '/events/story-links', 'event_id', 'EVT_EUKAR'],
  ['period', '/periods/story-links', 'period_id', 'Q12554'],
] as const)('groups readable %s memberships by entity and normalizes integer story IDs', async (kind, url, column, id) => {
  vi.mocked(apiClient.get).mockResolvedValue([{ [column]: id, story_id: 2 }, { [column]: id, story_id: '11' }]);
  expect([...await stories.getMemberships(kind)]).toEqual([[id, ['2', '11']]]);
  expect(apiClient.get).toHaveBeenCalledWith(url, undefined);
});
it('rejects a malformed response instead of showing an entity as unlinked', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([{ event_id: 'EVT_EUKAR' }]);
  await expect(stories.getMemberships('event')).rejects.toThrow('Réponse invalide');
  vi.mocked(apiClient.get).mockResolvedValue([{ event_id: 'EVT_EUKAR', story_id: 2 }]);
  await expect(stories.getMemberships('period')).rejects.toThrow('Réponse invalide pour les frises des périodes');
  vi.mocked(apiClient.get).mockResolvedValue({ rows: [] });
  await expect(stories.getMemberships('event')).rejects.toThrow('Réponse invalide');
});
it('keeps a load failure visible rather than an empty membership list', async () => {
  vi.spyOn(stories, 'getMemberships').mockRejectedValue(new Error('API indisponible'));
  const links = start(); await links.load();
  expect(links.error.value).toBe('API indisponible'); expect(links.loading.value).toBe(false);
});
it.each(['event', 'period'] as const)('adds and removes one %s per transaction and invalidates only that story', async kind => {
  vi.spyOn(stories, 'getMemberships').mockResolvedValue(new Map([['item', ['2']]]));
  const change = vi.spyOn(stories, 'changeAssociations').mockResolvedValue(undefined);
  const invalidate = vi.spyOn(useDataStore(), 'invalidateStory');
  const links = start(kind); await links.load();
  expect(stories.getMemberships).toHaveBeenCalledWith(kind, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(await links.change('item', '14', false)).toBe(true);
  expect(change).toHaveBeenLastCalledWith('14', kind, ['item'], false);
  expect(links.storyIdsOf('item')).toEqual(['2', '14']);
  expect(await links.change('item', '2', true)).toBe(true);
  expect(change).toHaveBeenLastCalledWith('2', kind, ['item'], true);
  expect(links.storyIdsOf('item')).toEqual(['14']);
  expect(invalidate.mock.calls).toEqual([['14'], ['2']]);
});
it('does not resend or alter local links after a lost response', async () => {
  vi.spyOn(stories, 'getMemberships').mockResolvedValue(new Map([['event', ['2']]]));
  const change = vi.spyOn(stories, 'changeAssociations').mockRejectedValue(Object.assign(new Error('socket hang up'), { request: {} }));
  const links = start(); await links.load();
  expect(await links.change('event', '14', false)).toBe(false);
  expect(change).toHaveBeenCalledOnce();
  expect(links.storyIdsOf('event')).toEqual(['2']);
  expect(links.changeError.value).toMatch(/Rechargez les données/);
  expect(links.pending.value).toBeNull();
});
