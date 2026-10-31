// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { semanticSearch } from '../src/services/semanticSearch';
afterEach(() => vi.unstubAllGlobals());
it('uses the documented multilingual API and caches validated, independent candidate copies', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ QID: 'Q43653', similarity_score: 0.9, rrf_score: 0.02 }] });
  vi.stubGlobal('fetch', fetchMock);
  const first = await semanticSearch('semantic cache test'); first[0].id = 'changed';
  expect(await semanticSearch('semantic cache test')).toEqual([{ id: 'Q43653', score: 0.9 }]); expect(fetchMock).toHaveBeenCalledOnce();
  const url = fetchMock.mock.calls[0][0] as URL;
  expect(url.hostname).toBe('wd-vectordb.wmcloud.org'); expect(url.searchParams.get('lang')).toBe('all');
  expect(fetchMock.mock.calls[0][1].headers['User-Agent']).toContain('UniversalTimeline');
});
it('rejects malformed provider payloads instead of caching an empty success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ QID: 'not-an-id', similarity_score: 0.9 }] }));
  await expect(semanticSearch('semantic malformed test')).rejects.toThrow('invalide');
});
