import { withTransaction } from '../api/database.js';
import { comparableYearsBeforePresent, temporalBounds } from '../shared/temporal.js';
import type { CatalogueRange, StoryCatalogueInput } from '../shared/storyCatalogue.js';
import * as catalogue from '../repositories/storyCatalogueRepository.js';
import { mappedTags, mapTag } from './mappers.js';

export function listPublicStoryCatalogue(input: StoryCatalogueInput) {
  return withTransaction(async db => {
    const now = Date.now();
    const ranges = [input.timeRange, input.periodRange].filter((value): value is CatalogueRange => !!value);
    const batchSize = ranges.length ? 64 : input.limit + 1;
    const matches: Array<{ row: catalogue.CatalogueCandidate; start: string | null; end: string | null }> = [];
    let cursor = input.cursor;
    // Temporal parsing remains in the shared domain. Narrow searches are scanned in bounded
    // batches rather than loading every frise, or maintaining a second date parser in SQL.
    while (matches.length <= input.limit) {
      const batch = await catalogue.listCatalogueCandidates(db, input, cursor, batchSize);
      for (const row of batch) {
        const { start, end } = temporalBounds(row.temporal_candidates, now);
        const a = comparableYearsBeforePresent(start, undefined, now);
        const b = comparableYearsBeforePresent(end, undefined, now) ?? a;
        if (ranges.every(range => a !== null && b !== null && Math.max(a, b) >= range.recentBP && Math.min(a, b) <= range.oldBP)) {
          matches.push({ row, start, end });
          if (matches.length > input.limit) break;
        }
      }
      if (matches.length > input.limit || batch.length < batchSize) break;
      cursor = String(batch[batch.length - 1].id);
    }
    const selected = matches.slice(0, input.limit);
    const previews = new Map((await catalogue.readCataloguePreviews(db, selected.map(item => item.row.id))).map(row => [row.id, row]));
    const facets = await catalogue.readCatalogueFacets(db, input);
    return {
      items: selected.map(({ row, start, end }) => ({
        id: row.id, title_fr: row.title_fr, title_en: row.title_en,
        description_fr: row.description_fr, description_en: row.description_en,
        author: row.author, is_public: true, ...mappedTags(row),
        start_date: start, end_date: end,
        preview_periods: previews.get(row.id)?.preview_periods ?? [],
        preview_events: previews.get(row.id)?.preview_events ?? [],
      })),
      nextCursor: matches.length > input.limit ? String(selected[selected.length - 1].row.id) : null,
      // Date-filtered totals would require a full scan. The UI reports the number loaded instead.
      total: ranges.length ? null : facets.matching_total,
      publicTotal: facets.public_total,
      tags: facets.tags.map(mapTag),
    };
  });
}
