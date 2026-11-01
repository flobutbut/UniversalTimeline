// @vitest-environment node
import { expect, it } from 'vitest';
import { periodSubtree, itemsWithinPeriod } from '../src/domain/storySplit';
import { parseStoryFromPeriod } from '../src/api/inputValidation';

const placements = [
  { id: 'root', parent_id: 'catalogue-parent-outside' }, { id: 'apollo', parent_id: 'root' },
  { id: 'gemini', parent_id: 'apollo' }, { id: 'mercury', parent_id: 'apollo' }, { id: 'mir', parent_id: 'root' },
];
it('makes the chosen period the root and keeps its descendants in the frise placement', () => {
  expect(periodSubtree(placements, 'apollo')).toEqual([
    { id: 'apollo', parent_id: null }, { id: 'gemini', parent_id: 'apollo' }, { id: 'mercury', parent_id: 'apollo' },
  ]);
  expect(periodSubtree(placements, 'mir')).toEqual([{ id: 'mir', parent_id: null }]);
});
it('refuses a period outside the frise and never loops on a corrupted cycle', () => {
  expect(periodSubtree(placements, 'absent')).toBeNull();
  expect(periodSubtree([{ id: 'a', parent_id: 'b' }, { id: 'b', parent_id: 'a' }], 'a')).toEqual([{ id: 'a', parent_id: null }, { id: 'b', parent_id: 'a' }]);
});
it('keeps events inside the period bounds, inclusive, and none when the bounds are unknown or reversed', () => {
  const events = [{ id: 'start', yearsBP: 65 }, { id: 'in', yearsBP: 57 }, { id: 'end', yearsBP: 54 }, { id: 'out', yearsBP: 40 }, { id: 'undated', yearsBP: null }];
  expect(itemsWithinPeriod(events, 65, 54)).toEqual(['end', 'in', 'start']);
  expect(itemsWithinPeriod(events, null, 54)).toEqual([]);
  expect(itemsWithinPeriod(events, 54, 65)).toEqual([]);
});
it('requires a period and a non-empty title', () => {
  expect(parseStoryFromPeriod({ periodId: 'apollo', title: '  Apollo  ' })).toEqual({ periodId: 'apollo', title: 'Apollo' });
  expect(() => parseStoryFromPeriod({ periodId: 'apollo', title: ' ' })).toThrow('title');
  expect(() => parseStoryFromPeriod({ title: 'Apollo' })).toThrow('periodId');
});
