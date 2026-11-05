import { mediaWiki, sparql, normalizeWikidataId, type WikidataReadOptions } from '@/services/wikidataTransport';
import { WIKIDATA_MEDIAWIKI_API_URL } from '@/lib/wikidataMediaWikiConstants';
import { ids, type Entity, type WikidataGenerationCollection, type Profile } from '@/lib/wikidataGenerationModel';

export async function loadGenerationEntities(list: string[], options: WikidataReadOptions): Promise<Record<string, Entity>> {
  const entities: Record<string, Entity> = {};
  const unique = [...new Set(list)];
  for (let i = 0; i < unique.length; i += 50) {
    const params = new URLSearchParams({ action: 'wbgetentities', ids: unique.slice(i, i + 50).join('|'), props: 'labels|descriptions|claims', languages: 'fr|en', languagefallback: '1', origin: '*', format: 'json' });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, options);
    Object.assign(entities, data.entities);
  }
  return entities;
}
export async function collectWikidataGeneration(raw: string, options: WikidataReadOptions & { profile?: Profile; progress?: (message: string) => void } = {}): Promise<WikidataGenerationCollection> {
  const progress = options.progress ?? (() => {});
  const signal = options.signal;
  const qid = normalizeWikidataId(raw);
  progress('Lecture de la fiche du sujet…');
  const entities = await loadGenerationEntities([qid], options);
  const subject = entities[qid];
  if (!subject || subject.missing !== undefined) throw new Error('Ce sujet Wikidata est introuvable.');
  const profile = options.profile ?? await detectGenerationProfile(qid, subject, options);
  const notices: string[] = [];
  const rankedIds: string[] = [], eligible: string[] = [];
  let truncated = false;
  if (profile !== 'person') {
    progress('Recherche des éléments liés…');
    const history = profile === 'history';
    const query = `SELECT DISTINCT ?item ?links WHERE {
      { ?item wdt:P361 wd:${qid}. } UNION { wd:${qid} wdt:P527 ?item. } UNION { wd:${qid} wdt:P793 ?item. }
      ${history ? 'FILTER EXISTS { VALUES ?root { wd:Q1190554 wd:Q180684 wd:Q645883 wd:Q11514315 } ?item wdt:P31/wdt:P279* ?root. }' : ''}
      FILTER (isIRI(?item))
      OPTIONAL { ?item wikibase:sitelinks ?links. }
    } ORDER BY DESC(?links) ?item LIMIT 121`;
    try {
      const rows = await sparql(query, options);
      truncated = rows.length > 120;
      for (const row of rows.slice(0, 120)) {
        const id = row.item?.value.split('/').pop();
        if (id && /^Q[1-9]\d*$/.test(id)) { rankedIds.push(id); if (history) eligible.push(id); }
      }
    } catch (cause) {
      if (signal?.aborted) throw cause;
      notices.push('Collecte inverse indisponible : seuls les liens présents sur la fiche du sujet sont examinés.');
    }
  }
  const links = new Set(rankedIds);
  const properties = profile === 'person' ? ['P800', 'P166', 'P26', 'P69', 'P551', 'P39', 'P793'] : ['P527', 'P793'];
  for (const property of properties) ids(subject, property).forEach(id => links.add(id));
  if (links.size > 160) notices.push('La lecture est limitée à 160 fiches liées ; la couverture reste partielle.');
  progress('Lecture des dates, précisions et déclarations…');
  Object.assign(entities, await loadGenerationEntities([...links].filter(id => id !== qid).slice(0, 160), options));
  return { qid, profile, capturedAt: new Date().toISOString(), entities, baseline: null, eligible, rankedIds, truncated, notices };
}

/** Explicit class roots first, then bounded ancestry lookup for unfamiliar subjects. */
export async function detectGenerationProfile(qid: string, subject: Entity, options: WikidataReadOptions): Promise<Profile> {
  const classes = ids(subject, 'P31');
  if (classes.includes('Q5')) return 'person';
  if (['P619','P620'].some(p => subject.claims?.[p]?.length) || classes.some(c => ['Q13226541','Q752783'].includes(c))) return 'space';
  const start = subject.claims?.P580?.[0]?.mainsnak?.datavalue?.value;
  const ancientYear = start && typeof start === 'object' && 'time' in start ? /^-(\d+)-/.exec(String(start.time)) : null;
  if (ancientYear && Number(ancientYear[1]) >= 100000) return 'geology';
  if (classes.includes('Q11514315')) return 'history';
  if (classes.includes('Q968159')) return 'art';
  try {
    const rows = await sparql(`SELECT DISTINCT ?profile WHERE {
      VALUES (?root ?profile) { (wd:Q4005761 "geology") (wd:Q4005689 "geology") (wd:Q752783 "space") (wd:Q13226541 "space") (wd:Q968159 "art") }
      wd:${qid} wdt:P31/wdt:P279* ?root.
    } LIMIT 6`, options);
    for (const profile of ['geology','space','art'] as const) if (rows.some(row => row.profile?.value === profile)) return profile;
  } catch (cause) { if (options.signal?.aborted) throw cause; }
  return 'history';
}
