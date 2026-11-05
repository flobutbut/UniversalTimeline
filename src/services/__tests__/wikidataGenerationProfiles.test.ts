import { expect, it } from 'vitest';
import { generationDraftFromCollection, wikidataTimelineItemError } from '../WikidataGenerationService';
import { parseGeneratedStory } from '../../../server/src/api/wikidataGenerationInput';
import { effectiveWikidataParent } from '@/lib/wikidataHierarchy';
import { wikidataItemKey } from '@/types/wikidataGeneration';
import type { WikidataGenerationCollection } from '@/lib/wikidataGenerationModel';
import { parseTemporal } from '@temporal';
import { DateService } from '../DateService';
import { normalizeDateInput } from '@/lib/normalizeDateInput';

const fixtures = import.meta.glob<{ default: WikidataGenerationCollection }>('../../dev/generation-prototype/fixtures/*.json');
it.each(Object.entries(fixtures))('produces independently saveable, sourced records for %s', async (_path, load) => {
  const collection = (await load()).default;
  const draft = generationDraftFromCollection(collection);
  const selected = draft.items.filter(i => i.selected);
  expect(selected.length).toBeGreaterThan(0);
  expect(selected.every(i => wikidataTimelineItemError(i) === null)).toBe(true);
  expect(new Set(selected.map(wikidataItemKey)).size).toBe(selected.length);
  const parsed = parseGeneratedStory({ qid: draft.qid, title: draft.title, description: draft.description, items: selected.map(item => ({ ...item, parentQid: item.type === 'period' ? effectiveWikidataParent(item, selected) : null })) });
  expect(parsed.items).toHaveLength(selected.length);
  for (const item of parsed.items) {
    expect(item.source).toBeDefined();
    if (item.sourceKey.startsWith('fact:')) expect(item.data.wikidata_id).toBeNull();
  }
});
it('preserves approximate precision through parsing, formatting and form normalization', () => {
  for (const text of ['vers 1400 (siècle)', 'vers 1650 (siècle)', 'vers 1500 (décennie)', 'vers 1400 av. J.-C. (siècle)', 'vers 1900']) {
    const parsed = parseTemporal(text);
    expect(parsed.kind).toBe('calendar'); expect(parsed.approximate).toBe(true);
    expect(parsed.yearsBeforePresent).not.toBeNull();
    expect(DateService.formatBound(parsed)).toBe(text);
    expect(normalizeDateInput(text)).toBe(text);
  }
  expect(parseTemporal('vers 1400 (siècle)').precision).toBe('century');
});
