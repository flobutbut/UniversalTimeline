import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/ApiClient';
import { StoryApiService } from '@/services/StoryApiService';
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
afterEach(() => vi.resetAllMocks());
const api = StoryApiService.getInstance();
const page = { items: [{ id: 12, title_fr: 'Marie Curie', is_public: true }], nextCursor: null, total: 1, publicTotal: 10, tags: [] };

it('requests only a page and passes search, themes, dates, period and cursor to the API', async () => {
  vi.mocked(apiClient.get).mockResolvedValue(page);
  const controller = new AbortController();
  const result = await api.getPublicCatalogue({ search: 'Curie & radium', tagIds: ['sciences'], timeRange: { oldBP: 200, recentBP: 0 }, periodRange: { oldBP: 150, recentBP: 20 } }, { cursor: '20', signal: controller.signal });
  const url = new URL(vi.mocked(apiClient.get).mock.calls[0][0], 'https://example.test');
  expect(url.pathname).toBe('/stories/catalogue');
  expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '24', q: 'Curie & radium', tags: 'sciences', cursor: '20', timeOld: '200', timeRecent: '0', periodOld: '150', periodRecent: '20' });
  expect(result.items[0]).toMatchObject({ id: '12', title: { fr: 'Marie Curie' }, isPublic: true });
  expect(vi.mocked(apiClient.get).mock.calls[0][1]?.signal).toBe(controller.signal);
});

it.each([
  null, { ...page, items: undefined }, { ...page, nextCursor: 'invalid' }, { ...page, publicTotal: -1 },
  { ...page, items: [{ ...page.items[0], is_public: false }] }, { ...page, items: Array(25).fill(page.items[0]) },
  { ...page, items: [page.items[0], page.items[0]] }, { ...page, items: [], nextCursor: '12' },
])('rejects malformed, private or unbounded catalogue responses', async invalid => {
  vi.mocked(apiClient.get).mockResolvedValue(invalid);
  await expect(api.getPublicCatalogue({ search: '', tagIds: [] })).rejects.toThrow();
});

it('rejects a cursor that does not advance instead of loading the same page forever', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ ...page, nextCursor: '12' });
  await expect(api.getPublicCatalogue({ search: '', tagIds: [] }, { cursor: '12' })).rejects.toThrow();
});
