import { clearWikidataCache } from '../wikidataTransport';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SearchApiService } from '@/services/SearchApiService';
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
const api = SearchApiService.getInstance();
const fetchMock = vi.fn();
beforeEach(() => { clearWikidataCache(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

it.each(['http', 'logical', 'network', 'malformed'] as const)('rejects a %s failure instead of returning an empty result', async kind => {
  if (kind === 'http') fetchMock.mockResolvedValue(response({}, false));
  if (kind === 'logical') fetchMock.mockResolvedValue(response({ error: { code: 'maxlag' } }));
  if (kind === 'network') fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
  if (kind === 'malformed') fetchMock.mockResolvedValue(response({}));
  await expect(api.searchWikidataEntityLabels('Mars')).rejects.toThrow('Wikidata');
});

it('returns a successful empty list only for a successful empty search', async () => {
  fetchMock.mockResolvedValue(response({ search: [] }));
  await expect(api.searchWikidata('absent')).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('does not turn a failed details request into an empty global Wikidata search', async () => {
  fetchMock.mockResolvedValueOnce(response({ search: [{ id: 'Q123', label: 'Trouvé' }] })).mockResolvedValueOnce(response({}, false));
  await expect(api.searchWikidata('Trouvé')).rejects.toThrow('Wikidata');
});

it('does not offer unfiltered event candidates when semantic classification fails', async () => {
  fetchMock.mockResolvedValueOnce(response({ search: [{ id: 'Q123', label: 'Candidat' }] })).mockResolvedValueOnce(response({}, false));
  await expect(api.searchWikidataEntityLabels('Candidat', { restrictToEventConcepts: true })).rejects.toThrow('Wikidata');
});

it('forwards cancellation through both search and details requests', async () => {
  const controller = new AbortController();
  fetchMock.mockResolvedValueOnce(response({ search: [{ id: 'Q123', label: 'Événement' }] })).mockResolvedValueOnce(response({ entities: { Q123: { claims: { P585: [{ mainsnak: { datavalue: { value: { time: '+1944-06-06T00:00:00Z' } } } }] } } } }));
  const hits = await api.searchWikidata('Événement', { signal: controller.signal });
  expect(hits).toHaveLength(1); expect(hits[0].type).toBe('event');
  expect(fetchMock.mock.calls.every(call => call[1].signal instanceof AbortSignal)).toBe(true);
});

it.each([true, false])('handles cyclic class ancestry with an event root reachable=%s', async reachable => {
  const claim = (id: string) => ({ mainsnak: { snaktype: 'value', datavalue: { value: { 'entity-type': 'item', id } } } });
  const entities: Record<string, any> = {
    Q123: { claims: { P31: [claim('Q100')] } },
    Q100: { claims: { P279: [claim('Q101')] } },
    Q101: { claims: { P279: [claim('Q100'), ...(reachable ? [claim('Q1190554')] : [])] } },
    Q1190554: { claims: {} },
  };
  fetchMock.mockImplementation(async (url: string) => {
    const params = new URL(url).searchParams;
    if (params.get('action') === 'wbsearchentities') return response({ search: [{ id: 'Q123', label: 'Événement' }] });
    return response({ entities: Object.fromEntries(params.get('ids')!.split('|').map(id => [id, entities[id]])) });
  });
  const hits = await api.searchWikidataEntityLabels('Événement', { restrictToEventConcepts: true });
  expect(hits.map(hit => hit.id)).toEqual(reachable ? ['Q123'] : []);
});

it('does not fetch broader ancestry once a known classification boundary is reached', async () => {
  fetchMock.mockResolvedValueOnce(response({ search: [{ id: 'Q123', label: 'Guerre' }] })).mockResolvedValueOnce(response({ entities: { Q123: { claims: { P31: [{ mainsnak: { snaktype: 'value', datavalue: { value: { 'entity-type': 'item', id: 'Q198' } } } }] } } } }));
  const hits = await api.searchWikidataEntityLabels('Guerre', { restrictToEventConcepts: true });
  expect(hits.map(hit => hit.id)).toEqual(['Q123']); expect(fetchMock).toHaveBeenCalledTimes(2);
});
