import { expect, it } from 'vitest';
import { formatYearsBP, formatStoryTimeRange, positionFromYearsBP, rangeFromPeriod, storyOverlapsRange, yearsBPFromPosition, OLDEST_BP } from '../storyTimeFilter';

const now = Date.UTC(2026, 10, 1);
it('gives every order of magnitude the same room, oldest on the left', () => {
  expect(positionFromYearsBP(OLDEST_BP)).toBe(0);
  expect(positionFromYearsBP(0)).toBe(1);
  const step = positionFromYearsBP(1e3) - positionFromYearsBP(1e6);
  expect(positionFromYearsBP(1e6) - positionFromYearsBP(1e9)).toBeCloseTo(step, 2);
  for (const bp of [0, 80, 5000, 66e6, 4.5e9]) expect(yearsBPFromPosition(positionFromYearsBP(bp))).toBeCloseTo(bp, 3);
});
it('labels bounds at every scale', () => {
  expect(formatYearsBP(0, now)).toBe('aujourd’hui');
  expect(formatYearsBP(81.2, now)).toBe('1945'); // 2 September 1945, not rounded up to 1946
  expect(formatYearsBP(87.2, now)).toBe('1939');
  expect(formatYearsBP(2026.8 + 43, now)).toBe('44 av. J.-C.');
  expect(formatYearsBP(42000, now)).toBe('42 ka');
  expect(formatYearsBP(66e6, now)).toBe('66 Ma');
  expect(formatYearsBP(4.54e9, now)).toBe('4,54 Ga');
  expect(formatStoryTimeRange({ oldBP: 66e6, recentBP: 0 }, now)).toBe('66 Ma → aujourd’hui');
});
it('keeps frises overlapping the range, even partially, and never frises without dates', () => {
  const ww2 = { oldBP: 87, recentBP: 81 }; // ≈ 1939 → 1945
  expect(storyOverlapsRange({ startDate: '1914-06-28', endDate: 'TODAY' }, ww2, now)).toBe(true);
  expect(storyOverlapsRange({ startDate: '-13798000000-01-01T00:00:00Z', endDate: 'TODAY' }, ww2, now)).toBe(true);
  expect(storyOverlapsRange({ startDate: '0476-01-01', endDate: '1492-01-01' }, ww2, now)).toBe(false);
  expect(storyOverlapsRange({ startDate: '1944-06-06' }, ww2, now)).toBe(true);
  expect(storyOverlapsRange({}, ww2, now)).toBe(false);
  expect(storyOverlapsRange({ startDate: 'règne obscur', endDate: 'TODAY' }, ww2, now)).toBe(false);
});
it('derives a range from a catalogue period, in either order, or none without dates', () => {
  expect(rangeFromPeriod({ startDate: 'M201.4', endDate: 'M145' }, now)).toEqual({ oldBP: 201.4e6, recentBP: 145e6 });
  expect(rangeFromPeriod({ startDate: '', endDate: 'TODAY' }, now)).toBeNull();
});
