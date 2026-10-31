import { useDebouncedSearch } from './useDebouncedSearch';
import { SearchApiService, type WikidataEntityLabelHit, type LocalSearchResult } from '@/services/SearchApiService';

export interface MeaningSearchHit extends WikidataEntityLabelHit { localMatch?: LocalSearchResult }
export function useMeaningSearch(query: () => string, context: () => { enabled: boolean; type: 'period' | 'event'; keywordLoading: boolean; keywordCount: number; resolveLocal: boolean }) {
  const api = SearchApiService.getInstance();
  return useDebouncedSearch<MeaningSearchHit>(query, async (text, signal) => {
    const type = context().type;
    const hits = await api.searchWikidataByMeaning(text, { type, signal });
    // A semantic result may already be saved under another label in our catalogue.
    const local = context().resolveLocal ? await api.searchLocalByWikidataIds(hits.map(hit => hit.id), type, signal) : [];
    const byQid = new Map(local.map(hit => [hit.wikidataId || hit.id, hit]));
    return hits.map(hit => ({ ...hit, localMatch: byQid.get(hit.id) }));
  }, {
    minLength: 3, delayMs: 650, timeoutMs: 28000, criteria: () => context().type,
    enabled: () => {
      const value = context();
      return value.enabled && (query().trim().split(/\s+/).length >= 3 || (!value.keywordLoading && value.keywordCount === 0));
    },
  });
}
