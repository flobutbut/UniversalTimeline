import { expect, it } from 'vitest';
import { announceTimelineEntry, entryVia, takeAnnouncedEntry } from '@/lib/explorationAnalytics';
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
