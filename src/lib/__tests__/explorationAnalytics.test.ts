import { expect, it } from 'vitest';
import { announceTimelineEntry, entryVia, positionShape, storyMaxDepth, takeAnnouncedEntry } from '@/lib/explorationAnalytics';
import type { ListPeriod } from '@/types/database';

const node = (id: string, parentId: string | null) => ({ id, parentId, label: { fr: id, en: '' } }) as unknown as ListPeriod;

it('measures how deep a frise goes and what a position offers, with counts only', () => {
  const periods = [node('a', null), node('b', 'a'), node('c', 'b'), node('d', 'a'), node('e', null)];
  expect(storyMaxDepth(periods)).toBe(3);
  expect(storyMaxDepth([])).toBe(0);
  // A parent outside the frise or a cycle makes no valid path: those periods do not count.
  expect(storyMaxDepth([node('x', 'missing'), node('y', 'z'), node('z', 'y'), node('r', null)])).toBe(1);
  expect(positionShape({ storyPeriods: periods, displayedPeriods: [], events: [{}, {}], hasPrevious: true, hasNext: false }))
    .toEqual({ child_count: 0, event_count: 2, has_previous: true, has_next: false, story_max_depth: 3 });
});
import { searchTermForAnalytics } from '@/composables/useSearchAnalytics';

it('keeps a normalised search term with its years, and refuses what may identify someone', () => {
  expect(searchTermForAnalytics('  Bataille   de MARIGNAN 1515 ')).toBe('bataille de marignan 1515');
  for (const text of ['de 1789 à 1799', 'grande guerre 1914-1918', 'empire 1804 1815', 'big bang 13.8']) expect(searchTermForAnalytics(text)).toBe(text);
  expect(searchTermForAnalytics('a'.repeat(80))).toHaveLength(50);
  for (const text of ['marie@exemple.fr', 'https://site.test/x', 'www.exemple.com', 'monsite.fr', '0612345678', '06 12 34 56 78', '06-12-34-56-78', '123 456 789', '   ']) {
    expect(searchTermForAnalytics(text)).toBeNull();
  }
});

it('labels an entry from a landing, another page or outside, and lets an announced search expire', () => {
  expect(entryVia('/')).toBe('landing'); expect(entryVia('/voyage?x=1')).toBe('landing');
  expect(entryVia('/database')).toBe('app'); expect(entryVia(null)).toBe('link');
  announceTimelineEntry('search', 1000);
  expect(takeAnnouncedEntry(2000)).toBe('search'); expect(takeAnnouncedEntry(2000)).toBeNull();
  announceTimelineEntry('search', 1000);
  expect(takeAnnouncedEntry(20_000)).toBeNull();
});
