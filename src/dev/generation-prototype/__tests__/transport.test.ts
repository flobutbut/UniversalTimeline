import { beforeEach, expect, it, vi } from 'vitest';
import { readLive } from '../transport';
import { mediaWiki, sparql } from '@/services/wikidataTransport';
import { generateLegacyWikidataTimeline as generateWikidataTimeline } from '@/services/WikidataGenerationService';

vi.mock('@/services/wikidataTransport', async original => ({ ...await original<typeof import('@/services/wikidataTransport')>(), mediaWiki: vi.fn(), sparql: vi.fn() }));
vi.mock('@/services/WikidataGenerationService', () => ({ generateLegacyWikidataTimeline: vi.fn() }));
const signal = () => new AbortController().signal;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mediaWiki).mockImplementation(async url => ({ entities: Object.fromEntries(new URL(url).searchParams.get('ids')!.split('|').map(id => [id, { id, labels: { fr: { value: id } } }])) }));
  vi.mocked(sparql).mockResolvedValue([]);
  vi.mocked(generateWikidataTimeline).mockResolvedValue({ qid: 'Q1', title: 'Sujet', description: '', items: [], warnings: [] });
});
it('validates an identifier before building any remote query', async () => {
  await expect(readLive('Q1 } UNION {?s ?p ?o}', 'history', signal(), vi.fn())).rejects.toThrow('Q-id');
  expect(mediaWiki).not.toHaveBeenCalled(); expect(sparql).not.toHaveBeenCalled();
});
it('makes a bounded historical collection ranked before truncation and reads each candidate once', async () => {
  vi.mocked(sparql).mockResolvedValue(Array.from({ length: 121 }, (_, i) => ({ item: { value: `http://www.wikidata.org/entity/Q${i + 10}` } })));
  const data = await readLive('q1', 'history', signal(), vi.fn());
  expect(data.truncated).toBe(true); expect(data.eligible).toHaveLength(120);
  expect(vi.mocked(sparql).mock.calls[0][0]).toContain('P31/wdt:P279*');
  expect(vi.mocked(sparql).mock.calls[0][0]).toContain('ORDER BY DESC(?links) ?item LIMIT 121');
  const ids = vi.mocked(mediaWiki).mock.calls.flatMap(([url]) => new URL(url).searchParams.get('ids')!.split('|'));
  expect(ids).toHaveLength(121); expect(new Set(ids).size).toBe(121);
  expect(vi.mocked(mediaWiki).mock.calls.every(([url]) => new URL(url).searchParams.get('ids')!.split('|').length <= 50)).toBe(true);
});
it('reports incomplete discovery without pretending the direct subject has no data', async () => {
  vi.mocked(sparql).mockRejectedValue(new Error('WDQS unavailable'));
  const data = await readLive('Q1', 'space', signal(), vi.fn());
  expect(data.entities.Q1).toBeDefined();
  expect(data.notices?.join(' ')).toContain('Collecte inverse indisponible');
  expect(data.baseline).not.toBeNull();
});
it('keeps a baseline failure separate from a successful experimental read', async () => {
  vi.mocked(generateWikidataTimeline).mockRejectedValue(new Error('Comparaison refusée'));
  const data = await readLive('Q1', 'person', signal(), vi.fn());
  expect(data.entities.Q1).toBeDefined(); expect(data.baseline).toBeNull();
  expect(data.baselineError).toBe('Comparaison refusée');
  expect(sparql).not.toHaveBeenCalled();
});
it('does not swallow an aborted discovery as a partial success', async () => {
  const controller = new AbortController();
  vi.mocked(sparql).mockImplementation(async () => { controller.abort(); throw new DOMException('Cancelled', 'AbortError'); });
  await expect(readLive('Q1', 'history', controller.signal, vi.fn())).rejects.toThrow('Cancelled');
  expect(generateWikidataTimeline).not.toHaveBeenCalled();
});
