import { apiClient } from './ApiClient';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';

export interface LocalSearchResult {
  id: string;
  wikidataId?: string;
  type: 'period' | 'event';
  label: { fr: string; en: string };
  dateLabel: string;
  fromWikidata: false;
}

export interface WikidataSearchResult {
  id: string; // Q-id Wikidata
  type: 'period' | 'event';
  label: string;
  dateLabel: string;
  fromWikidata: true;
}

export type SearchHit = LocalSearchResult | WikidataSearchResult;

interface ApiSearchResponse {
  periods: Array<{
    id: string; wikidataId?: string; label: { fr: string; en: string };
    startDate?: string; endDate?: string;
  }>;
  events: Array<{
    id: string; wikidataId?: string; label: { fr: string; en: string };
    date?: string;
  }>;
}

export class SearchApiService {
  private static instance: SearchApiService;
  private constructor() {}
  static getInstance() {
    if (!SearchApiService.instance) SearchApiService.instance = new SearchApiService();
    return SearchApiService.instance;
  }

  async searchLocal(q: string): Promise<LocalSearchResult[]> {
    const data = await apiClient.get<ApiSearchResponse>(`/search?q=${encodeURIComponent(q)}`);
    const results: LocalSearchResult[] = [];

    for (const p of data.periods) {
      const start = formatSearchResultDateBound(p.startDate);
      const end = formatSearchResultDateBound(p.endDate);
      results.push({
        id: p.id, wikidataId: p.wikidataId, type: 'period', label: p.label,
        dateLabel: start && end ? `${start} → ${end}` : start || end,
        fromWikidata: false,
      });
    }

    for (const e of data.events) {
      results.push({
        id: e.id, wikidataId: e.wikidataId, type: 'event', label: e.label,
        dateLabel: formatSearchResultDateBound(e.date),
        fromWikidata: false,
      });
    }

    return results;
  }

  async searchWikidata(q: string): Promise<WikidataSearchResult[]> {
    const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
    const params = new URLSearchParams({
      action: 'wbsearchentities', search: q, language: 'fr',
      uselang: 'fr', format: 'json', origin: '*', limit: '20', type: 'item',
    });

    const res = await fetch(`${WIKIDATA_API}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.search?.length) return [];

    // Fetch details to determine type + dates
    const ids = data.search.map((s: any) => s.id).join('|');
    const detailParams = new URLSearchParams({
      action: 'wbgetentities', ids, props: 'claims', languages: 'fr',
      format: 'json', origin: '*',
    });
    const detailRes = await fetch(`${WIKIDATA_API}?${detailParams}`);
    if (!detailRes.ok) return [];
    const detailData = await detailRes.json();

    const results: WikidataSearchResult[] = [];
    for (const item of data.search) {
      const entity = detailData.entities?.[item.id];
      if (!entity) continue;
      const claims = entity.claims ?? {};
      const hasStart = !!claims.P580?.[0]?.mainsnak?.datavalue;
      const hasEnd   = !!claims.P582?.[0]?.mainsnak?.datavalue;
      const hasPoint = !!claims.P585?.[0]?.mainsnak?.datavalue;
      if (!hasStart && !hasEnd && !hasPoint) continue;

      const type: 'period' | 'event' = (hasStart || hasEnd) ? 'period' : 'event';
      const rawDate = (
        claims.P580?.[0]?.mainsnak?.datavalue?.value?.time ??
        claims.P585?.[0]?.mainsnak?.datavalue?.value?.time ?? ''
      );
      const rawEnd = claims.P582?.[0]?.mainsnak?.datavalue?.value?.time ?? '';
      const start = rawDate ? formatSearchResultDateBound(rawDate) : '';
      const end   = rawEnd  ? formatSearchResultDateBound(rawEnd) : '';

      results.push({
        id: item.id, type, label: item.label || item.id,
        dateLabel: start && end ? `${start} → ${end}` : start || end,
        fromWikidata: true,
      });
    }
    return results;
  }
}
