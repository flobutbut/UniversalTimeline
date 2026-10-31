import { expect, it } from 'vitest';
import { creationSearchScore } from '../creationSearchRanking';
it('uses the active frise as a ranking hint without filtering other periods', () => {
  const bounds = { start: 100, end: 30 };
  const outside = { label: 'Mission', source: 'wikidata', startDate: '1800-01-01', semanticRank: 0 };
  const inside = { label: 'Mission', source: 'wikidata', startDate: '1969-07-21', semanticRank: 1 };
  expect(creationSearchScore('mission', inside, bounds)).toBeGreaterThan(creationSearchScore('mission', outside, bounds));
  expect(creationSearchScore('mission', outside, bounds)).toBeGreaterThan(0);
});
it('prefers existing catalogue items for equivalent relevance and keeps exact matches strong', () => {
  const candidate = { label: 'Crétacé', source: 'wikidata' };
  expect(creationSearchScore('cretace', { ...candidate, source: 'local' })).toBeGreaterThan(creationSearchScore('cretace', candidate));
  expect(creationSearchScore('cretace', candidate)).toBeGreaterThan(creationSearchScore('cretace', { label: 'autre période', source: 'wikidata' }));
});
