import { it, expect } from 'vitest';
import { isPeriodDescendant } from './periodHierarchy';

it('finds indirect descendants, stops on missing entries and ignores unrelated branches', () => {
  const periods = [{ id: 'root' }, { id: 'middle', parentId: 'root' }, { id: 'child', parentId: 'middle' }];
  expect(isPeriodDescendant(periods, 'child', 'root')).toBe(true);
  expect(isPeriodDescendant(periods, 'root', 'child')).toBe(false);
  expect(isPeriodDescendant(periods, 'missing', 'root')).toBe(false);
});

it('terminates on a corrupt local cycle', () => {
  expect(isPeriodDescendant([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }], 'a', 'other')).toBe(false);
});

it('handles a deep hierarchy without overflowing the call stack', () => {
  const periods = Array.from({ length: 12000 }, (_, i) => ({ id: String(i), parentId: i ? String(i - 1) : null }));
  expect(isPeriodDescendant(periods, '11999', '0')).toBe(true);
});
