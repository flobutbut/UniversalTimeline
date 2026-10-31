import type { LocalSearchResult } from '@/services/SearchApiService';
import type { ListPeriod, ListEvent } from '@/types/database';

/** Search hits are partial display entities, never authoritative saved records. */
export function localSearchHitToPeriod(hit: LocalSearchResult): ListPeriod {
  return {
    id: hit.id, label: hit.label, startDate: hit.startDate ?? '', endDate: hit.endDate ?? '', categories: [],
    parentId: hit.parentId ?? null, hasParent: !!hit.parentId, hasChildren: hit.hasChildren ?? false,
    wikidata_id: hit.wikidataId, startYearsBP: hit.startYearsBP ?? undefined, endYearsBP: hit.endYearsBP ?? undefined,
  };
}
export function localSearchHitToEvent(hit: LocalSearchResult): ListEvent {
  return { id: hit.id, label: hit.label, date: hit.date ?? '', categories: [] };
}
