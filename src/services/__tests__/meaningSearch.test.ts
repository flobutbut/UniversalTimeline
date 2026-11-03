import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { SearchApiService } from '../SearchApiService';
import { apiClient } from '../ApiClient';
import { clearWikidataCache } from '../wikidataTransport';
vi.mock('../ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const api = SearchApiService.getInstance();
const fetchMock = vi.fn();
const claim = (id: string) => ({ mainsnak: { snaktype: 'value', datavalue: { value: { 'entity-type': 'item', id } } } });
const time = { mainsnak: { snaktype: 'value', datavalue: { value: { time: '+1969-07-21T00:00:00Z' } } } };
beforeEach(() => { clearWikidataCache(); vi.resetAllMocks(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());
it('uses related spaceflights as event candidates when a descriptive query retrieves a person', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([{ id: 'Q1085', score: 0.9 }]);
  const entities: Record<string, unknown> = {
    Q1085: { labels: { fr: { value: 'Neil Armstrong' } }, claims: { P31: [claim('Q5')], P450: [claim('Q43653')] } },
    Q43653: { labels: { fr: { value: 'Apollo 11' } }, descriptions: { fr: { value: 'Mission lunaire' } }, claims: { P31: [claim('Q1190554')], P585: [time] } },
  };
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => ({ entities: Object.fromEntries(new URL(url).searchParams.get('ids')!.split('|').map(id => [id, entities[id]])) }) }));
  const hits = await api.searchWikidataByMeaning('premier homme à marcher sur la lune', { type: 'event' });
  expect(hits).toEqual([{ id: 'Q43653', label: 'Apollo 11', description: 'Mission lunaire', searchOrigin: 'semantic', startDate: '1969-07-21', endDate: undefined }]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/search/semantic?'), expect.objectContaining({ timeout: 20000 }));
});
it('rejects unavailable or malformed semantic responses rather than inventing candidates', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Unavailable'));
  await expect(api.searchWikidataByMeaning('une requête', { type: 'period' })).rejects.toThrow('momentanément indisponible');
  vi.mocked(apiClient.get).mockResolvedValueOnce([{ id: 'invalid', score: 0.9 }]);
  await expect(api.searchWikidataByMeaning('autre requête', { type: 'period' })).rejects.toThrow('invalide');
});
it('rejects malformed labels from Wikidata metadata', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([{ id: 'Q1', score: 0.9 }]);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ entities: { Q1: { labels: { fr: { value: 123 } } } } }) });
  await expect(api.searchWikidataByMeaning('une période', { type: 'period' })).rejects.toThrow('Wikidata');
});
