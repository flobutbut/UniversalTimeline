import { expect, it } from 'vitest';
import { effectiveWikidataParent, wikidataDateWarnings, wikidataHierarchyError, wouldCreateWikidataCycle } from '../wikidataHierarchy';
import type { WikidataTimelineItem } from '@/types/wikidataGeneration';

const period = (qid: string, parentQid: string | null = null, startDate = '1789', endDate = '1799'): WikidataTimelineItem => ({ qid, parentQid, type: 'period', title: qid, startDate, endDate, description: '', selected: true });

it('makes an omitted or converted parent a root', () => {
  const parent = period('Q1'), child = period('Q2', 'Q1'), grandchild = period('Q3', 'Q2');
  expect(effectiveWikidataParent(child, [child, grandchild])).toBeNull();
  expect(effectiveWikidataParent(child, [child, { ...parent, type: 'event' }])).toBeNull();
});

it('detects indirect cycles', () => {
  const items = [period('Q1', 'Q3'), period('Q2', 'Q1'), period('Q3', 'Q2')];
  expect(wikidataHierarchyError(items)).toContain('boucle');
  expect(wouldCreateWikidataCycle('Q1', 'Q3', items)).toBe(true);
  expect(wikidataHierarchyError(items.slice(1))).toBeNull();
});

it('reports definite overflows without changing dates or parents', () => {
  const parent = period('Q1', null, '1789-07-14', '1799-11-09');
  const child = period('Q2', 'Q1', '1788', '1802');
  expect(wikidataDateWarnings(child, parent)).toEqual([expect.stringContaining('Commence avant'), expect.stringContaining('Se termine après')]);
  expect(child).toMatchObject({ parentQid: 'Q1', startDate: '1788', endDate: '1802' });
  expect(wikidataDateWarnings(period('Q3', 'Q1', '1792-09-20', '1795-10-26'), parent)).toEqual([]);
});

it('treats a month or year as an uncertain range rather than a fabricated first day', () => {
  const parent = period('Q1', null, '1789-07-14', '1799-11-09');
  expect(wikidataDateWarnings(period('Q2', 'Q1', '1789-07', '1792'), parent)).toEqual([expect.stringContaining('ne permettent pas de confirmer')]);
  expect(wikidataDateWarnings(period('Q2', 'Q1', '1790', '1799'), parent)).toEqual([expect.stringContaining('ne permettent pas de confirmer')]);
  expect(wikidataDateWarnings(period('Q2', 'Q1', '1790', '1798'), parent)).toEqual([]);
  expect(wikidataDateWarnings(period('Q2', null, '-0044', '-0040'), period('Q1', null, '-0050', '-0030'))).toEqual([]);
});
