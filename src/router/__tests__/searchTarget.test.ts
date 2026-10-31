import { expect, it } from 'vitest';
import { readSearchTarget, searchHitLocation } from '../searchTarget';
import type { LocationQuery } from 'vue-router';

it.each(['period', 'event'] as const)('routes a local %s by its canonical identifier, not the search label', type => {
  const hit = { id: 'legacy / ? & # id', type, label: { fr: 'Suggestion partielle', en: '' }, fromWikidata: false as const, dateLabel: '' };
  const location = searchHitLocation(hit);
  expect(location).toEqual({ name: type === 'period' ? 'graph' : 'events', query: { [type]: hit.id } });
  expect(readSearchTarget({ [type]: hit.id }, type)).toEqual({ kind: 'local', id: hit.id });
});
it.each(['period', 'event'] as const)('routes a Wikidata %s to a draft, with no local identifier', type => {
  expect(searchHitLocation({ id: 'Q123', type, label: 'À importer', fromWikidata: true, dateLabel: '' }))
    .toEqual({ name: type === 'period' ? 'graph' : 'events', query: { wikidata: 'Q123' } });
  expect(readSearchTarget({ wikidata: 'q123' }, type)).toEqual({ kind: 'wikidata', qid: 'Q123' });
});
it.each([
  { period: ['one', 'two'] }, { period: null }, { period: '' }, { period: '  ' },
  { period: 'a\n' }, { period: 'x'.repeat(201) }, { period: 'one', wikidata: 'Q123' },
  { wikidata: ['Q123'] }, { wikidata: 'Q0' }, { wikidata: 'https://wikidata.org/Q123' },
] as LocationQuery[])('rejects malformed or ambiguous route parameters: %j', query => {
  expect(() => readSearchTarget(query, 'period')).toThrow();
});
it('ignores unrelated parameters and preserves historical text identifiers', () => {
  expect(readSearchTarget({ category: 'any', event: 'other' }, 'period')).toBeNull();
  expect(readSearchTarget({ period: ' Époque ancienne ' }, 'period')).toEqual({ kind: 'local', id: 'Époque ancienne' });
});
