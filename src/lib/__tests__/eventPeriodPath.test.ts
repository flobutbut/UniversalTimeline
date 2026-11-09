import { expect, it } from 'vitest';
import { eventPeriodPath } from '@/lib/timelineNavigation';
import { useTimelineEventFilter } from '@/composables/useTimelineEventFilter';
const NOW = Date.UTC(2026, 0, 1);
import type { ListEvent, ListPeriod } from '@/types/database';

const period = (id: string, startYearsBP: number, endYearsBP: number, storyParentId: string | null = null) =>
  ({ id, label: { fr: id, en: id }, startDate: `${startYearsBP} BCE`, endDate: `${endYearsBP} BCE`, storyParentId } as unknown as ListPeriod);
const event = (year: number | null) => ({ id: "e", label: { fr: "e", en: "e" }, date: year === null ? "" : `${year} BCE`, dateYearsBP: null } as unknown as ListEvent);
const periods = [period("root", 1000, 1), period('middle', 800, 400, 'root'), period('leaf', 700, 500, 'middle'), period('other', 300, 100, 'root')];

it('enters the deepest period with sub-periods, leaving the leaf visible among the bars', () => {
  expect(eventPeriodPath(periods, event(600), NOW).map(row => row.id)).toEqual(['root', 'middle']);
});
it('stops at the level that still contains the date', () => {
  expect(eventPeriodPath(periods, event(900), NOW).map(row => row.id)).toEqual(['root']);
});
it('stays on the overview for a date outside every period or an undated event', () => {
  expect(eventPeriodPath(periods, event(5000), NOW)).toEqual([]);
  expect(eventPeriodPath(periods, event(null), NOW)).toEqual([]);
});
it('does not loop on a cyclic hierarchy', () => {
  const cycle = [period("a", 10, 1, "b"), period("b", 10, 1, "a")];
  expect(eventPeriodPath(cycle, event(5), NOW)).toEqual([]);
});
it('keeps a requested event displayed whatever the chosen subject', () => {
  const tagged = (id: string, tag: string) => ({ ...event(1), id, tags: [{ id: tag, label: { fr: tag, en: tag }, family: 'f', position: 1, parentId: null }] }) as unknown as ListEvent;
  const rows = [tagged('kept', 'a'), tagged('other', 'b')];
  const filter = useTimelineEventFilter(() => ({ id: '1', events: rows, tags: [] }) as never);
  filter.select('b');
  expect(filter.apply(rows).map(row => row.id)).toEqual(['other']);
  expect(filter.apply(rows, 'kept').map(row => row.id)).toEqual(['kept', 'other']);
});
