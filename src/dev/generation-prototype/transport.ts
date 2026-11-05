import { mediaWiki, sparql, normalizeWikidataId, type WikidataReadOptions } from '@/services/wikidataTransport';
import { generateLegacyWikidataTimeline as generateWikidataTimeline } from '@/services/WikidataGenerationService';
import { WIKIDATA_MEDIAWIKI_API_URL } from '@/lib/wikidataMediaWikiConstants';
import { ids, type Entity, type LabSnapshot, type Profile } from './model';

const fixtures = import.meta.glob<{ default: LabSnapshot }>('./fixtures/*.json');
export async function loadExample(qid: string): Promise<LabSnapshot> {
  const loader = fixtures[`./fixtures/${qid}.json`];
  if (!loader) throw new Error('Cet exemple ne possède pas de copie locale. Lancez une lecture Wikidata.');
  return structuredClone((await loader()).default);
}
async function loadEntities(list: string[], options: WikidataReadOptions): Promise<Record<string, Entity>> {
  const entities: Record<string, Entity> = {};
  const unique = [...new Set(list)];
  for (let i = 0; i < unique.length; i += 50) {
    const params = new URLSearchParams({ action: 'wbgetentities', ids: unique.slice(i, i + 50).join('|'), props: 'labels|descriptions|claims', languages: 'fr|en', languagefallback: '1', origin: '*', format: 'json' });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, options);
    Object.assign(entities, data.entities);
  }
  return entities;
}
export async function readLive(raw: string, profile: Profile, signal: AbortSignal, progress: (message: string) => void): Promise<LabSnapshot> {
  const qid = normalizeWikidataId(raw);
  const options = { signal, force: true };
  progress('Lecture de la fiche du sujet…');
  const entities = await loadEntities([qid], options);
  const subject = entities[qid];
  if (!subject || subject.missing !== undefined) throw new Error('Ce sujet Wikidata est introuvable.');
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
      if (signal.aborted) throw cause;
      notices.push('Collecte inverse indisponible : seuls les liens présents sur la fiche du sujet sont examinés.');
    }
  }
  const links = new Set(rankedIds);
  const properties = profile === 'person' ? ['P800', 'P166', 'P26', 'P69', 'P551', 'P39', 'P793'] : ['P527', 'P793'];
  for (const property of properties) ids(subject, property).forEach(id => links.add(id));
  if (links.size > 160) notices.push('La lecture est limitée à 160 fiches liées ; la couverture reste partielle.');
  progress('Lecture des dates, précisions et déclarations…');
  Object.assign(entities, await loadEntities([...links].filter(id => id !== qid).slice(0, 160), options));
  progress('Comparaison avec le moteur actuel…');
  let baseline: LabSnapshot['baseline'] = null, baselineError: string | undefined;
  try { baseline = await generateWikidataTimeline(qid, options); }
  catch (cause) { if (signal.aborted) throw cause; baselineError = cause instanceof Error ? cause.message : 'Comparaison indisponible.'; }
  return { qid, profile, capturedAt: new Date().toISOString(), entities, baseline, baselineError, eligible, rankedIds, truncated, notices };
}
