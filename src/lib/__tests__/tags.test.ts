import { expect, it } from 'vitest';
import { matchesTags, mergeSuggestedTags, primaryTag, tagFilterOptions, tagsSortKey } from '@/lib/tags';
import { matchesCatalogueFilters, type CatalogueFilterState } from '@/lib/catalogueFilters';
import { mapWikidataClassesToTags } from '@/services/WikidataTagMapper';

const ref = (id: string, family = 'societes', position = 1, parentId: string | null = null) => ({ id, label: { fr: id.toUpperCase(), en: id }, family, position, parentId });
const none: CatalogueFilterState = { tagIds: [], storyIds: [], timeRange: null, period: null };

it('matches any selected tag and includes sub-domains of a selected parent', () => {
  const item = { tags: [ref('droit', 'societes', 101, 'pouvoir'), ref('conflits')] };
  expect(matchesTags(item, [])).toBe(true);
  expect(matchesTags({}, [])).toBe(true);
  expect(matchesTags(item, ['sport', 'conflits'])).toBe(true);
  expect(matchesTags(item, ['pouvoir'])).toBe(true);
  expect(matchesTags(item, ['sport'])).toBe(false);
  expect(matchesTags({}, ['sport'])).toBe(false);
});

it('offers only used first-level domains, in grid order with their family', () => {
  const options = tagFilterOptions([{ tags: [ref('sport', 'productions', 16), ref('conflits', 'societes', 6)] }, { tags: [ref('conflits', 'societes', 6), ref('droit', 'societes', 101, 'pouvoir')] }, {}]);
  expect(options).toEqual([{ value: 'conflits', label: 'CONFLITS', group: 'Sociétés' }, { value: 'sport', label: 'SPORT', group: 'Productions' }]);
});

it('reads the primary tag first and keeps a stable sort key', () => {
  expect(primaryTag({ tags: [ref('a'), ref('b')] })?.id).toBe('a');
  expect(primaryTag({})).toBeNull();
  expect(tagsSortKey({ tags: [ref('a'), ref('b')] })).toBe('A\u0001B');
});

it('adds known suggestions after the current choice, up to three tags', () => {
  const known = new Set(['a', 'b', 'c', 'd']);
  expect(mergeSuggestedTags(['b'], ['a', 'x', 'c', 'd'], known)).toEqual(['b', 'a', 'c']);
  expect(mergeSuggestedTags(['b'], ['x'], known)).toBeNull();
  expect(mergeSuggestedTags(['b'], undefined, known)).toBeNull();
});

it('combines dimensions with AND and keeps OR inside each one', () => {
  const access = { storyIdsOf: (item: { stories: string[] }) => item.stories, overlaps: () => true };
  const item = { tags: [ref('conflits')], stories: ['1'] };
  expect(matchesCatalogueFilters(item, none, access)).toBe(true);
  expect(matchesCatalogueFilters(item, { ...none, tagIds: ['sport', 'conflits'], storyIds: ['2', '1'] }, access)).toBe(true);
  expect(matchesCatalogueFilters(item, { ...none, tagIds: ['conflits'], storyIds: ['2'] }, access)).toBe(false);
  const range = { oldBP: 2, recentBP: 1 };
  expect(matchesCatalogueFilters(item, { ...none, timeRange: range }, { ...access, overlaps: () => false })).toBe(false);
});

it('suggests domains from verified Wikidata classes, primary first', () => {
  expect(mapWikidataClassesToTags(['Q178561'])).toEqual(['conflits']);
  expect(mapWikidataClassesToTags(['Q2133344'])).toEqual(['techniques-inventions', 'territoires-exploration']);
  expect(mapWikidataClassesToTags(['Q5'])).toEqual([]);
});
