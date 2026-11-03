import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { generateWikidataTimeline, wikidataTimelineItemError } from '../WikidataGenerationService';
import { mediaWiki, sparql, type WikidataEntity } from '../wikidataTransport';
import { wikidataHierarchyError } from '@/lib/wikidataHierarchy';

vi.mock('../wikidataTransport', async original => ({ ...await original<typeof import('../wikidataTransport')>(), mediaWiki: vi.fn(), sparql: vi.fn() }));
const time = (value: string, precision = 11, rank = 'normal') => ({ rank, mainsnak: { snaktype: 'value', datavalue: { value: { time: value, precision } } } });
let entities: Record<string, WikidataEntity>;
beforeEach(() => {
  entities = { Q1: { labels: { fr: { value: 'Sujet' } } } };
  vi.mocked(sparql).mockResolvedValue([]);
  vi.mocked(mediaWiki).mockImplementation(async url => ({ entities: Object.fromEntries(new URL(url).searchParams.get('ids')!.split('|').map(id => [id, entities[id] ?? { missing: '' }])) }));
});
afterEach(() => vi.clearAllMocks());

it('builds a deduplicated chronological draft, preferring best-ranked dates and their actual precision', async () => {
  entities.Q1.claims = { P580: [time('+1789-01-01T00:00:00Z', 9)], P582: [time('+1799-01-01T00:00:00Z', 9)] };
  entities.Q2 = { labels: { fr: { value: 'Événement' } }, claims: { P585: [time('+1800-01-01T00:00:00Z', 11, 'deprecated'), time('+1790-05-01T00:00:00Z', 10, 'preferred'), time('+1788-01-01T00:00:00Z')] } };
  vi.mocked(sparql).mockResolvedValue([{ item: { value: 'http://www.wikidata.org/entity/Q2' } }, { item: { value: 'http://www.wikidata.org/entity/Q2' } }]);
  const result = await generateWikidataTimeline('q1');
  expect(result.items.map(item => [item.qid, item.startDate, item.endDate, item.selected])).toEqual([['Q1', '1789', '1799', true], ['Q2', '1790-05', '', true]]);
  expect(result.items[0].type).toBe('period'); expect(result.items[1].type).toBe('event');
});

it('keeps an unknown end empty and excludes the incomplete interval until corrected', async () => {
  entities.Q1.claims = { P580: [time('+1789-07-14T00:00:00Z')] };
  const result = await generateWikidataTimeline('Q1'); const item = result.items[0];
  expect(item).toMatchObject({ endDate: '', selected: false, type: 'period' });
  expect(wikidataTimelineItemError(item)).toContain('fin');
  item.endDate = '1799'; expect(wikidataTimelineItemError(item)).toBeNull();
});

it('reads JSON years before Christ without a year 0 and keeps Julian days as written', async () => {
  const julian = (value: string, precision: number) => ({ mainsnak: { snaktype: 'value', datavalue: { value: { time: value, precision, calendarmodel: 'http://www.wikidata.org/entity/Q1985786' } } } });
  entities.Q1.claims = { P580: [julian('-0490-00-00T00:00:00Z', 9)], P582: [julian('-0044-03-15T00:00:00Z', 11)] };
  const item = (await generateWikidataTimeline('Q1')).items[0];
  expect(item).toMatchObject({ startDate: '490 BCE', endDate: '-0043-03-15', selected: true });
});

it.each([
  [time('+1789-07-14T00:00:00Z'), time('+1790-07-14T00:00:00Z')],
  [time('+1700-01-01T00:00:00Z', 7)],
  [{ mainsnak: { snaktype: 'value', datavalue: { value: { time: '+1789-07-14T00:00:00Z', precision: 11, calendarmodel: 'http://www.wikidata.org/entity/Q28892' } } } }],
  [{ mainsnak: { snaktype: 'value', datavalue: { value: { time: '+1789-07-14T00:00:00Z', precision: 11, before: 1, after: 0 } } } }],
].map(claims => ({ claims })))('requires review of conflicting, coarse, non-Gregorian or uncertain dates (%j)', async ({ claims }) => {
  entities.Q1.claims = { P585: claims };
  const item = (await generateWikidataTimeline('Q1')).items[0];
  expect(item.startDate).toBe(''); expect(item.selected).toBe(false); expect(item.warning).toContain('vérifier');
});

it('excludes people and undated related entities without inventing events', async () => {
  entities.Q1.claims = { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }], P569: [time('+1900-01-01T00:00:00Z')] };
  const result = await generateWikidataTimeline('Q1');
  expect(result.items).toEqual([]); expect(result.warnings.join(' ')).toContain('biographies');
});

it('caps discovery and detail batches and explicitly reports truncation', async () => {
  vi.mocked(sparql).mockResolvedValue(Array.from({ length: 81 }, (_, i) => ({ item: { value: `http://www.wikidata.org/entity/Q${i + 100}` } })));
  const result = await generateWikidataTimeline('Q1');
  expect(vi.mocked(sparql).mock.calls[0][0]).toContain('LIMIT 81');
  const batches = vi.mocked(mediaWiki).mock.calls.map(([url]) => new URL(url).searchParams.get('ids')!.split('|'));
  expect(batches.map(batch => batch.length)).toEqual([1, 50, 30]);
  expect(result.warnings.join(' ')).toContain('limitée');
});

it('validates the subject before any read and propagates discovery failures with retry options', async () => {
  await expect(generateWikidataTimeline('Q1 } UNION { ?s ?p ?o')).rejects.toThrow('Q-id');
  expect(mediaWiki).not.toHaveBeenCalled();
  vi.mocked(sparql).mockRejectedValueOnce(new Error('Wikidata indisponible'));
  const controller = new AbortController();
  await expect(generateWikidataTimeline('Q1', { force: true, signal: controller.signal })).rejects.toThrow('indisponible');
  expect(sparql).toHaveBeenCalledWith(expect.any(String), { force: true, signal: controller.signal });
});

const relation = (id: string, rank = 'normal') => ({ rank, mainsnak: { snaktype: 'value', datavalue: { value: { id } } } });
const interval = () => ({ P580: [time('+1789-01-01T00:00:00Z', 9)], P582: [time('+1799-01-01T00:00:00Z', 9)] });
function discover(...ids: string[]) { vi.mocked(sparql).mockResolvedValue(ids.map(id => ({ item: { value: `http://www.wikidata.org/entity/${id}` } }))); }

it('retains explicit P361 and inverse P527 parents, including dates outside the parent', async () => {
  entities.Q1.claims = { ...interval(), P527: [relation('Q2')] };
  entities.Q2 = { claims: { ...interval(), P527: [relation('Q3')] } };
  entities.Q3 = { claims: { ...interval(), P361: [relation('Q2')] } };
  entities.Q4 = { claims: { P580: [time('+1780-01-01T00:00:00Z', 9)], P582: [time('+1802-01-01T00:00:00Z', 9)], P361: [relation('Q1')] } };
  entities.Q5 = { claims: interval() }; // Containment alone never assigns a parent.
  discover('Q2', 'Q3', 'Q4', 'Q5');
  const items = (await generateWikidataTimeline('Q1')).items;
  expect(items.find(item => item.qid === 'Q2')).toMatchObject({ parentQid: 'Q1', parentCandidates: ['Q1'] });
  expect(items.find(item => item.qid === 'Q3')).toMatchObject({ parentQid: 'Q2', parentCandidates: ['Q2'] });
  expect(items.find(item => item.qid === 'Q4')).toMatchObject({ parentQid: 'Q1', selected: true });
  expect(items.find(item => item.qid === 'Q5')?.parentQid).toBeNull();
});

it('leaves multiple parents to review and does not automatically create a cycle', async () => {
  entities.Q1.claims = interval();
  entities.Q2 = { claims: { ...interval(), P361: [relation('Q3')] } };
  entities.Q3 = { claims: { ...interval(), P361: [relation('Q2')] } };
  entities.Q4 = { claims: { ...interval(), P361: [relation('Q1'), relation('Q2')] } };
  discover('Q2', 'Q3', 'Q4');
  const items = (await generateWikidataTimeline('Q1')).items;
  expect(items.find(item => item.qid === 'Q4')).toMatchObject({ parentQid: null, parentCandidates: ['Q1', 'Q2'] });
  expect(wikidataHierarchyError(items)).toBeNull();
  expect(items.filter(item => ['Q2', 'Q3'].includes(item.qid) && item.parentQid)).toHaveLength(1);
});

it('ignores deprecated relation claims and prefers best-ranked parent statements', async () => {
  entities.Q1.claims = interval();
  entities.Q2 = { claims: { ...interval(), P361: [relation('Q1'), relation('Q3', 'preferred'), relation('Q4', 'deprecated')] } };
  entities.Q3 = { claims: interval() };
  entities.Q4 = { claims: interval() };
  discover('Q2', 'Q3', 'Q4');
  expect((await generateWikidataTimeline('Q1')).items.find(item => item.qid === 'Q2')).toMatchObject({ parentQid: 'Q3', parentCandidates: ['Q3'] });
});
