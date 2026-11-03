import type { LocationQuery, RouteLocationRaw } from 'vue-router';
import type { GlobalSearchResult, SearchHit } from '@/services/SearchApiService';
import { normalizeWikidataId } from '@/services/wikidataTransport';
import { readStoryTarget, storyTimelineLocation } from './storyTarget';

/** The header and dedicated search page share the same validated destinations. */
export function globalSearchLocation(hit: GlobalSearchResult): RouteLocationRaw {
  return 'fromWikidata' in hit && hit.fromWikidata
    ? { name: 'wikidata-generation', query: { wikidata: normalizeWikidataId(hit.id) } }
    : storyTimelineLocation(hit.id);
}

export type SearchTarget = { kind: 'local'; id: string } | { kind: 'wikidata'; qid: string };

/** Only identifiers cross the route boundary; views load their canonical records. */
export function readSearchTarget(query: LocationQuery, type: 'period' | 'event'): SearchTarget | null {
  const local = query[type];
  const wikidata = query.wikidata;
  if (local === undefined && wikidata === undefined) return null;
  if (local !== undefined && wikidata !== undefined) throw new Error('La destination de recherche est ambiguë.');
  const value = local === undefined ? wikidata : local;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error('La destination de recherche est invalide.');
  }
  if (local !== undefined) return { kind: 'local', id: value.trim() };
  if (!/^Q[1-9]\d*$/i.test(value)) throw new Error('Le Q-id de recherche est invalide.');
  return { kind: 'wikidata', qid: value.toUpperCase() };
}

export function searchHitLocation(hit: SearchHit): RouteLocationRaw {
  const query = hit.fromWikidata ? { wikidata: hit.id } : { [hit.type]: hit.id };
  readSearchTarget(query, hit.type);
  return { name: hit.type === 'period' ? 'graph' : 'events', query };
}

/** Open a canonical record in Frises, independently of its memberships. */
export function databaseRecordLocation(type: 'story' | 'period' | 'event', id: string): RouteLocationRaw {
  if (type === 'story') return { name: 'database', query: { story: readStoryTarget(id) } };
  const query = { [type]: id };
  readSearchTarget(query, type);
  return { name: 'database', query };
}
