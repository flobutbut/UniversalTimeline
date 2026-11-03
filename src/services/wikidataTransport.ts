import axios from 'axios';
import type { WikidataBinding } from '@/types/geological';
import { createReadCache } from '@/lib/readCache';
import { ReadFailure, readOperation, retryAfterMilliseconds } from '../../server/src/shared/readOperation';

export interface WikidataReadOptions { signal?: AbortSignal; force?: boolean }
export interface WikidataStatement { rank?: string; mainsnak?: { snaktype?: string; datavalue?: { value?: unknown } } }
export interface WikidataEntity {
  id?: string; missing?: unknown; redirect?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, WikidataStatement[]>;
}
export interface MediaWikiData {
  search?: Array<{ id: string; label?: string; description?: string }>;
  entities?: Record<string, WikidataEntity>;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const bindingsCache = createReadCache<WikidataBinding[]>({ maxEntries: 160, ttlMs: 5 * 60000, copy: value => structuredClone(value) });
const mediaCache = createReadCache<MediaWikiData>({ maxEntries: 200, ttlMs: 5 * 60000, copy: value => structuredClone(value) });
const unavailable = () => new ReadFailure('Wikidata est momentanément indisponible. Réessayez.', true);
const malformed = () => new ReadFailure('La réponse Wikidata est invalide. Réessayez.');
export function normalizeWikidataId(raw: string): string {
  const id = raw.trim().replace(/^wikidata:/i, '').toUpperCase();
  if (!/^Q[1-9]\d*$/.test(id)) throw new Error('Saisissez un Q-id Wikidata valide, par exemple Q12345.');
  return id;
}
export function sparqlEndpoint(): string {
  const custom = import.meta.env.VITE_WIKIDATA_SPARQL_URL;
  return typeof custom === 'string' && custom.trim() ? custom.trim() : import.meta.env.DEV ? '/api/wikidata/sparql' : 'https://query.wikidata.org/sparql';
}
export function readSparqlBindings(data: unknown): WikidataBinding[] {
  if (!record(data) || data.error || !record(data.results) || !Array.isArray(data.results.bindings)
    || data.results.bindings.some(row => !record(row) || Object.values(row).some(node => !record(node) || typeof node.value !== 'string'))) throw malformed();
  return data.results.bindings as WikidataBinding[];
}
export async function sparql(query: string, options: WikidataReadOptions = {}): Promise<WikidataBinding[]> {
  const endpoint = sparqlEndpoint();
  return bindingsCache.read(JSON.stringify([endpoint, query]), signal => readOperation(async active => {
    let data: unknown;
    try {
      data = (await axios.get<unknown>(endpoint, { params: { query, format: 'json' }, timeout: 30000, signal: active, headers: { Accept: 'application/sparql-results+json' } })).data;
    } catch (error) {
      if (active.aborted) throw error;
      const failure = error as { response?: { status?: number; headers?: Record<string, string> } };
      const status = failure.response?.status;
      throw status ? new ReadFailure('Wikidata est momentanément indisponible. Réessayez.', status === 429 || status === 408 || status >= 500, retryAfterMilliseconds(failure.response?.headers?.['retry-after'])) : unavailable();
    }
    return readSparqlBindings(data);
  }, { signal, timeoutMs: 30000 }), options);
}
function validateMediaWiki(data: unknown, params: URLSearchParams, retryAfterMs?: number): MediaWikiData {
  if (!record(data)) throw malformed();
  if (data.error || (Array.isArray(data.errors) && data.errors.length)) {
    const code = record(data.error) ? data.error.code : undefined;
    throw new ReadFailure('La recherche Wikidata est indisponible. Réessayez.', code === 'maxlag' || code === 'ratelimited', retryAfterMs);
  }
  if (params.get('action') === 'wbsearchentities') {
    if (!Array.isArray(data.search) || data.search.some(hit => !record(hit) || typeof hit.id !== 'string' || !/^Q[1-9]\d*$/i.test(hit.id)
      || (hit.label !== undefined && typeof hit.label !== 'string') || (hit.description !== undefined && typeof hit.description !== 'string'))) throw malformed();
  } else {
    if (!record(data.entities) || Object.values(data.entities).some(entity => !record(entity))) throw malformed();
    for (const entity of Object.values(data.entities)) {
      if (!record(entity)) throw malformed();
      if (entity.redirect !== undefined && typeof entity.redirect !== 'string') throw malformed();
      for (const field of ['labels','descriptions']) {
        const values = entity[field];
        if (values !== undefined && (!record(values) || Object.values(values).some(value => !record(value) || typeof value.value !== 'string'))) throw malformed();
      }
      if (entity.claims === undefined) continue;
      if (!record(entity.claims)) throw malformed();
      for (const [property, statements] of Object.entries(entity.claims)) {
        if (!Array.isArray(statements)) throw malformed();
        for (const statement of statements) {
          if (!record(statement) || (statement.mainsnak !== undefined && !record(statement.mainsnak))) throw malformed();
          const snak = statement.mainsnak;
          if (!record(snak)) continue;
          if (snak.snaktype !== undefined && typeof snak.snaktype !== 'string') throw malformed();
          if (snak.datavalue !== undefined && !record(snak.datavalue)) throw malformed();
          if (['P580','P582','P585'].includes(property) && record(snak.datavalue)) {
            const value = snak.datavalue.value;
            if (!record(value) || typeof value.time !== 'string') throw malformed();
          }
        }
      }
    }
    const returned = new Set(Object.keys(data.entities).map(id => id.toUpperCase()));
    if ((params.get('ids') ?? '').split('|').some(id => !returned.has(id.toUpperCase()))) throw malformed();
    return { ...data, entities: Object.fromEntries(Object.entries(data.entities).map(([id, entity]) => [id.toUpperCase(), entity])) } as MediaWikiData;
  }
  return data as MediaWikiData;
}
export function mediaWiki(url: string, options: WikidataReadOptions = {}): Promise<MediaWikiData> {
  const parsed = new URL(url);
  const search = parsed.searchParams.get('action') === 'wbsearchentities';
  parsed.searchParams.sort();
  return mediaCache.read(parsed.toString(), signal => readOperation(async active => {
    let response: Response;
    try { response = await fetch(parsed.toString(), { signal: active }); }
    catch (error) { if (active.aborted) throw error; throw unavailable(); }
    if (!response.ok) throw new ReadFailure('La recherche Wikidata est indisponible. Réessayez.', response.status === 429 || response.status === 408 || response.status >= 500, retryAfterMilliseconds(response.headers?.get('Retry-After')));
    let data: unknown;
    try { data = await response.json(); } catch { throw malformed(); }
    return validateMediaWiki(data, parsed.searchParams, retryAfterMilliseconds(response.headers?.get('Retry-After')));
  }, { signal, timeoutMs: 15000 }), { ...options, ttlMs: search ? 60000 : 5 * 60000 });
}
/** Public knowledge only: no persisted storage, user token, account ID or Supabase response. */
export function clearWikidataCache() { bindingsCache.clear(); mediaCache.clear(); }
