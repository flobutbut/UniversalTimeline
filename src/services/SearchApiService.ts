import { mediaWiki, type WikidataReadOptions, type WikidataEntity, type WikidataStatement } from './wikidataTransport';
import { apiClient } from './ApiClient';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import { WIKIDATA_MEDIAWIKI_API_URL } from '@/lib/wikidataMediaWikiConstants';


/**
 * Racines « période » à exclure de la complétion événement : sous-ensemble **strict**
 * géologie / chronostratigraphie (voir `WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES` dans
 * `WikidataQueryService.ts` pour la liste complète des périodes catalogue).
 */
const WIKIDATA_PERIOD_ROOT_CLASSES_FOR_EVENT_FILTER = new Set([
  'Q4005761', // geochronological unit
  'Q4005689', // chronostratigraphic unit
]);

/** Racines sémantiques « occurrence / conflit / opération » (P279* depuis les P31). */
const WIKIDATA_EVENT_ROOT_CLASSES = new Set([
  'Q1190554', // occurrence
  'Q180684', // military conflict
  'Q645883', // military operation
  'Q198', // war (souvent atteint sans charger tout le graphe P279)
]);

const MAX_WIKIDATA_CLASS_GRAPH_NODES = 520;
// These semantic boundaries already determine the classification; loading their
// broader ancestors cannot refine it and can fan out across hundreds of classes.
const WIKIDATA_CLASSIFICATION_ROOTS = new Set([
  'Q5', ...WIKIDATA_PERIOD_ROOT_CLASSES_FOR_EVENT_FILTER, ...WIKIDATA_EVENT_ROOT_CLASSES,
]);

function extractItemIdsFromClaims(claims: Record<string, WikidataStatement[]> | undefined, prop: string): string[] {
  if (!claims?.[prop]) return [];
  const out: string[] = [];
  for (const stmt of claims[prop]) {
    const snak = stmt?.mainsnak;
    if (snak?.snaktype !== 'value' || !snak.datavalue?.value) continue;
    const v = snak.datavalue.value;
    if (v && typeof v === 'object' && 'entity-type' in v && v['entity-type'] === 'item' && 'id' in v && typeof v.id === 'string') out.push(String(v.id).toUpperCase());
  }
  return out;
}

function touchesWikidataRoot(
  classId: string,
  roots: ReadonlySet<string>,
  graph: Map<string, WikidataEntity>,
  memo: Map<string, boolean>,
): boolean {
  const id = classId.toUpperCase();
  if (roots.has(id)) return true;
  if (memo.has(id)) return memo.get(id)!;
  // P279 is a graph, not a tree. A visited set prevents cycles from recursing forever.
  const pending = [id];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (roots.has(current) || memo.get(current) === true) {
      memo.set(id, true);
      return true;
    }
    if (visited.has(current)) continue;
    visited.add(current);
    const entity = graph.get(current);
    if (!entity || entity.missing !== undefined) continue;
    pending.push(...extractItemIdsFromClaims(entity.claims, 'P279'));
  }
  memo.set(id, false);
  return false;
}

async function wbgetentitiesMap(ids: string[], signal?: AbortSignal): Promise<Map<string, WikidataEntity>> {
  const map = new Map<string, WikidataEntity>();
  const unique = [
    ...new Set(
      ids
        .map((id) => String(id ?? '').trim())
        .filter((id) => /^Q[1-9]\d*$/i.test(id)),
    ),
  ].map((id) => id.toUpperCase()).sort();
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: chunk.join('|'),
      props: 'claims',
      languages: 'fr',
      format: 'json',
      origin: '*',
    });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, { signal });
    if (!data.entities || typeof data.entities !== 'object') throw new Error('Réponse Wikidata invalide. Réessayez.');
    const entities = data.entities ?? {};
    // Indexer toutes les clés renvoyées (évite les trous si la casse diffère de la requête).
    for (const key of Object.keys(entities)) {
      if (!/^Q[1-9]\d*$/i.test(key)) continue;
      const upper = key.toUpperCase();
      let ent = entities[key];
      if (ent?.redirect) {
        const rid = String(ent.redirect).toUpperCase();
        ent = entities[rid] ?? entities[String(ent.redirect)] ?? ent;
      }
      if (ent && ent.missing === undefined) map.set(upper, ent);
    }
  }
  return map;
}

/** Charge les classes P31 des items puis leurs ancêtres P279 jusqu'à saturation (borne). */
async function loadP279AncestorGraphForClassSeeds(seedClassIds: string[], signal?: AbortSignal, stopWhenResolved = false): Promise<Map<string, WikidataEntity>> {
  const graph = new Map<string, WikidataEntity>();
  const seeds = [
    ...new Set(
      seedClassIds
        .map((x) => String(x).toUpperCase())
        .filter((id) => /^Q[1-9]\d*$/i.test(id)),
    ),
  ];
  const toLoad = new Set(seeds.filter(id => !WIKIDATA_CLASSIFICATION_ROOTS.has(id)));
  while (toLoad.size > 0 && graph.size < MAX_WIKIDATA_CLASS_GRAPH_NODES) {
    const batch = [...toLoad].slice(0, Math.min(50, MAX_WIKIDATA_CLASS_GRAPH_NODES - graph.size));
    for (const id of batch) toLoad.delete(id);
    const fetched = await wbgetentitiesMap(batch, signal);
    for (const id of batch) {
      if (fetched.has(id)) graph.set(id, fetched.get(id)!);
      else graph.set(id, { missing: '' });
    }
    for (const id of batch) {
      const ent = graph.get(id);
      if (ent?.missing !== undefined) continue;
      for (const p of extractItemIdsFromClaims(ent?.claims, 'P279')) {
        if (/^Q[1-9]\d*$/i.test(p) && !graph.has(p) && !WIKIDATA_CLASSIFICATION_ROOTS.has(p)) toLoad.add(p);
      }
    }
    if (stopWhenResolved) {
      const unresolved = seeds.filter(id => !touchesWikidataRoot(id, WIKIDATA_CLASSIFICATION_ROOTS, graph, new Map()));
      const needed = new Set<string>(); const pending = [...unresolved]; const seen = new Set<string>();
      while (pending.length) {
        const id = pending.pop()!;
        if (seen.has(id) || WIKIDATA_CLASSIFICATION_ROOTS.has(id)) continue;
        seen.add(id);
        if (!graph.has(id)) needed.add(id);
        else pending.push(...extractItemIdsFromClaims(graph.get(id)?.claims, 'P279'));
      }
      for (const id of toLoad) if (!needed.has(id)) toLoad.delete(id);
    }
  }
  if (toLoad.size) throw new Error('La classification Wikidata est trop complexe. Précisez la recherche.');
  return graph;
}

/** First Wikibase time of a claim, reduced to its known precision ("+1944-00-00…" → "1944"). */
function wikidataClaimTime(entity: WikidataEntity | undefined, prop: string): string | undefined {
  const value = entity?.claims?.[prop]?.find(row => row.mainsnak?.snaktype === 'value')?.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object' || !('time' in value) || typeof value.time !== 'string') return undefined;
  const match = /^([+-])(\d+)-(\d{2})-(\d{2})T/.exec(value.time);
  if (!match) return value.time;
  const [, sign, year, month, day] = match;
  const signedYear = `${sign === '-' ? '-' : ''}${year.padStart(4, '0')}`;
  if (month === '00') return signedYear;
  if (day === '00') return `${signedYear}-${month}`;
  return value.time;
}

/** Start/end shown in search lists: period bounds, point in time, or inception/dissolution. */
function wikidataTimeBounds(entity: WikidataEntity | undefined): { startDate?: string; endDate?: string } {
  return {
    startDate: wikidataClaimTime(entity, 'P580') || wikidataClaimTime(entity, 'P585') || wikidataClaimTime(entity, 'P571'),
    endDate: wikidataClaimTime(entity, 'P582') || wikidataClaimTime(entity, 'P576'),
  };
}

function wikidataItemHasMainTimeClaim(itemEntity: WikidataEntity | undefined): boolean {
  const c = itemEntity?.claims ?? {};
  const hasVal = (prop: string) =>
    Array.isArray(c[prop]) &&
    c[prop].some(st => st?.mainsnak?.snaktype === 'value' && st?.mainsnak?.datavalue);
  return Boolean(hasVal('P585') || hasVal('P580') || hasVal('P582'));
}

function wikidataSearchHitIsLikelyEvent(
  itemEntity: WikidataEntity | undefined,
  classGraph: Map<string, WikidataEntity>,
): boolean {
  if (!itemEntity || itemEntity.missing !== undefined) return false;

  const p31s = extractItemIdsFromClaims(itemEntity.claims, 'P31');
  const memoH = new Map<string, boolean>();
  const memoE = new Map<string, boolean>();
  const memoP = new Map<string, boolean>();
  const humanRoot = new Set(['Q5']);

  if (p31s.includes('Q5')) return false;
  if (p31s.some((c) => touchesWikidataRoot(c, humanRoot, classGraph, memoH))) return false;

  if (p31s.some((c) => WIKIDATA_EVENT_ROOT_CLASSES.has(c))) return true;

  const touchesGeoPeriod = (memo: Map<string, boolean>) =>
    p31s.length > 0 &&
    p31s.some((c) =>
      touchesWikidataRoot(c, WIKIDATA_PERIOD_ROOT_CLASSES_FOR_EVENT_FILTER, classGraph, memo),
    );

  const isEventLike =
    p31s.length > 0 &&
    p31s.some((c) => touchesWikidataRoot(c, WIKIDATA_EVENT_ROOT_CLASSES, classGraph, memoE));

  if (isEventLike) {
    return !touchesGeoPeriod(memoP);
  }

  if (wikidataItemHasMainTimeClaim(itemEntity)) {
    if (p31s.length === 0) return true;
    return !touchesGeoPeriod(new Map());
  }

  return false;
}

export interface LocalSearchResult {
  id: string;
  wikidataId?: string;
  type: 'period' | 'event';
  label: { fr: string; en: string };
  dateLabel: string;
  description?: string;
  fromWikidata: false;
  /** Présent pour les périodes (recherche SQL sur toute la table `periods`). */
  parentId?: string | null;
  /** Présent pour les événements (recherche SQL). */
  date?: string;
  startDate?: string;
  endDate?: string;
  startYearsBP?: number | null;
  endYearsBP?: number | null;
  hasChildren?: boolean;
}

export interface WikidataSearchResult {
  id: string; // Q-id Wikidata
  type: 'period' | 'event';
  label: string;
  dateLabel: string;
  fromWikidata: true;
}

export type SearchHit = LocalSearchResult | WikidataSearchResult;

export interface StorySearchResult {
  id: string;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  matchedOn: 'title' | 'description' | 'content';
  match?: { type: 'period' | 'event'; label: { fr: string; en: string } } | null;
}

/** Résultat `wbsearchentities` sans filtre sur les claims (complétion formulaires). */
export interface WikidataEntityLabelHit {
  searchOrigin?: 'semantic';
  startDate?: string; endDate?: string;
  id: string;
  label: string;
  description?: string;
}

export type GlobalSearchResult = StorySearchResult | (WikidataEntityLabelHit & { fromWikidata: true });

interface ApiSearchResponse {
  periods: Array<{
    id: string;
    wikidataId?: string;
    label: { fr: string; en: string };
    startDate?: string;
    endDate?: string;
    parentId?: string | null;
    startYearsBP?: number | null;
    endYearsBP?: number | null;
    hasChildren?: boolean;
  }>;
  events: Array<{
    id: string; wikidataId?: string; label: { fr: string; en: string };
    date?: string; description?: string;
  }>;
}

export class SearchApiService {
  private static instance: SearchApiService;
  private constructor() {}
  static getInstance() {
    if (!SearchApiService.instance) SearchApiService.instance = new SearchApiService();
    return SearchApiService.instance;
  }

  async searchStories(q: string, options?: { signal?: AbortSignal }): Promise<StorySearchResult[]> {
    return apiClient.get<StorySearchResult[]>(`/search/stories?${new URLSearchParams({ q })}`, options);
  }

  async searchLocalByWikidataIds(ids: string[], type: 'period' | 'event', signal?: AbortSignal): Promise<LocalSearchResult[]> {
    if (!ids.length) return [];
    const data = await apiClient.get<ApiSearchResponse>(`/search/by-wikidata?${new URLSearchParams({ ids: ids.join(','), only: `${type}s` })}`, { signal });
    return this.mapLocalResults(data);
  }

  private mapLocalResults(data: ApiSearchResponse): LocalSearchResult[] {
    const results: LocalSearchResult[] = [];
    for (const p of data.periods) {
      const start = formatSearchResultDateBound(p.startDate); const end = formatSearchResultDateBound(p.endDate);
      results.push({ ...p, wikidataId: p.wikidataId, type: 'period', fromWikidata: false, dateLabel: start && end ? `${start} → ${end}` : start || end });
    }
    for (const e of data.events) results.push({ ...e, type: 'event', fromWikidata: false, dateLabel: formatSearchResultDateBound(e.date) });
    return results;
  }

  async searchLocal(
    q: string,
    opts?: { categoryId?: string; onlyPeriods?: boolean; onlyEvents?: boolean; signal?: AbortSignal },
  ): Promise<LocalSearchResult[]> {
    const params = new URLSearchParams({ q });
    if (opts?.categoryId) params.set('category', opts.categoryId);
    if (opts?.onlyPeriods) params.set('only', 'periods');
    else if (opts?.onlyEvents) params.set('only', 'events');
    const data = await apiClient.get<ApiSearchResponse>(`/search?${params.toString()}`, opts?.signal ? { signal: opts.signal } : undefined);
    return this.mapLocalResults(data);
  }

  /**
   * Recherche d'entités par libellé (Wikidata), pour préremplir un formulaire sans exiger P580/P582.
   *
   * @param opts.restrictToEventConcepts — modale événement : ne conserve que les entités dont au moins
   *   un `P31` remonte via `P279*` (ou directement) à occurrence, conflit / opération militaire ou guerre
   *   (`Q198`), en excluant les humains (`Q5`) et les items typés surtout géochrono / chronostratigraphie.
   */
  async searchWikidataEntityLabels(
    q: string,
    opts?: { restrictToEventConcepts?: boolean; signal?: AbortSignal },
  ): Promise<WikidataEntityLabelHit[]> {
    const t = q.trim();
    if (t.length < 2) return [];
    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: t,
      language: 'fr',
      uselang: 'fr',
      format: 'json',
      origin: '*',
      limit: opts?.restrictToEventConcepts ? '32' : '18',
      type: 'item',
    });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, opts);
    if (!Array.isArray(data.search)) throw new Error('Réponse Wikidata invalide. Réessayez.');
    const hits: WikidataEntityLabelHit[] = (data.search ?? []).map(
      (s: { id: string; label?: string; description?: string }) => ({
        id: s.id,
        label: s.label || s.id,
        description: s.description,
      }),
    );
    if (!hits.length) return hits;
    const withDates = (list: WikidataEntityLabelHit[], items: Map<string, WikidataEntity>) =>
      list.map(hit => ({ ...hit, ...wikidataTimeBounds(items.get(hit.id.toUpperCase())) }));

    if (!opts?.restrictToEventConcepts) {
      const shown = hits.slice(0, 18);
      // Dates are a display aid: a failed lookup keeps the hits, without dates.
      try { return withDates(shown, await wbgetentitiesMap(shown.map(hit => hit.id), opts?.signal)); }
      catch (cause) { if (opts?.signal?.aborted) throw cause; return shown; }
    }

    const itemMap = await wbgetentitiesMap(hits.map(hit => hit.id), opts?.signal);
    const allP31 = hits.flatMap(hit => extractItemIdsFromClaims(itemMap.get(hit.id.toUpperCase())?.claims, 'P31'));
    const classGraph = await loadP279AncestorGraphForClassSeeds(allP31, opts?.signal);
    return withDates(hits.filter(hit => wikidataSearchHitIsLikelyEvent(itemMap.get(hit.id.toUpperCase()), classGraph)).slice(0, 18), itemMap);
  }

  /** Broader retrieval remains separate so keyword/local results never wait for it. */
  async searchWikidataByMeaning(q: string, options: { type: 'period' | 'event'; signal?: AbortSignal }): Promise<WikidataEntityLabelHit[]> {
    let candidates: Array<{id: string; score: number}>;
    try { candidates = await apiClient.get(`/search/semantic?${new URLSearchParams({ q })}`, { signal: options.signal, timeout: 20000 }); }
    catch (cause) { if (options.signal?.aborted) throw cause; throw new Error('La recherche par sens est momentanément indisponible. Réessayez.'); }
    if (!Array.isArray(candidates) || candidates.some(row => !row || !/^Q[1-9]\d*$/.test(row.id) || !Number.isFinite(row.score))) throw new Error('Réponse de recherche par sens invalide.');
    const ids = [...new Set(candidates.filter(row => row.score >= 0.45).map(row => row.id))].slice(0, 20);
    if (!ids.length) return [];
    const load = async (list: string[]) => {
      if (!list.length) return new Map<string, WikidataEntity>();
      const url = new URL(WIKIDATA_MEDIAWIKI_API_URL);
      url.search = new URLSearchParams({ action: 'wbgetentities', ids: list.join('|'), props: 'labels|descriptions|claims', languages: 'fr|en', languagefallback: '1', format: 'json', origin: '*' }).toString();
      const data = await mediaWiki(url.toString(), { signal: options.signal });
      return new Map(Object.entries(data.entities ?? {}));
    };
    const entities = await load(ids);
    const humans = ids.filter(id => extractItemIdsFromClaims(entities.get(id)?.claims, 'P31').includes('Q5'));
    // Astronauts/participants are useful bridges to their flights and significant events.
    const related = options.type === 'event' ? [...new Set(humans.slice(0, 3).flatMap(id => ['P450','P1344','P793'].flatMap(property => extractItemIdsFromClaims(entities.get(id)?.claims, property))))].filter(id => !entities.has(id)).slice(0, 8) : [];
    const more = await load(related); for (const [id, entity] of more) entities.set(id, entity);
    const all = [...ids, ...related].filter(id => entities.get(id)?.missing === undefined && !!entities.get(id));
    let keep = all;
    if (options.type === 'event') {
      const dated = all.filter(id => {
        const item = entities.get(id)!; const classes = extractItemIdsFromClaims(item.claims, 'P31');
        return !classes.includes('Q5') && (wikidataItemHasMainTimeClaim(item) || classes.some(type => WIKIDATA_EVENT_ROOT_CLASSES.has(type)));
      });
      const seeds = dated.flatMap(id => extractItemIdsFromClaims(entities.get(id)?.claims, 'P31'));
      const graph = await loadP279AncestorGraphForClassSeeds(seeds, options.signal, true);
      keep = dated.filter(id => wikidataSearchHitIsLikelyEvent(entities.get(id), graph));
    }
    return keep.flatMap(id => {
      const entity = entities.get(id)!; const label = entity.labels?.fr?.value || entity.labels?.en?.value;
      return label ? [{ id, label, description: entity.descriptions?.fr?.value || entity.descriptions?.en?.value, searchOrigin: 'semantic' as const, ...wikidataTimeBounds(entity) }] : [];
    });
  }

  async searchWikidata(q: string, opts?: WikidataReadOptions): Promise<WikidataSearchResult[]> {
    q = q.trim();
    if (q.length < 2) return [];
    const params = new URLSearchParams({
      action: 'wbsearchentities', search: q, language: 'fr',
      uselang: 'fr', format: 'json', origin: '*', limit: '20', type: 'item',
    });

    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, opts);
    if (!Array.isArray(data.search)) throw new Error('Réponse Wikidata invalide. Réessayez.');
    if (!data.search?.length) return [];

    // Fetch details to determine type + dates
    const ids = data.search.map(s => s.id).join('|');
    const detailParams = new URLSearchParams({
      action: 'wbgetentities', ids, props: 'claims', languages: 'fr',
      format: 'json', origin: '*',
    });
    const detailData = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${detailParams}`, opts);
    if (!detailData.entities || typeof detailData.entities !== 'object') throw new Error('Réponse Wikidata invalide. Réessayez.');

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
      const time = (property: string) => {
        const value = claims[property]?.[0]?.mainsnak?.datavalue?.value;
        return value && typeof value === 'object' && 'time' in value && typeof value.time === 'string' ? value.time : '';
      };
      const rawDate = time('P580') || time('P585');
      const rawEnd = time('P582');
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
