import { mediaWiki, normalizeWikidataId, sparql, type WikidataEntity, type WikidataStatement, type WikidataReadOptions } from './wikidataTransport';
import { WIKIDATA_MEDIAWIKI_API_URL } from '@/lib/wikidataMediaWikiConstants';
import type { WikidataTimelineDraft, WikidataTimelineItem } from '@/types/wikidataGeneration';
import { compareYearsOldestFirst, parseTemporal, periodDateErrors } from '@temporal';
import { wouldCreateWikidataCycle } from '@/lib/wikidataHierarchy';

const MAX_RELATED_ITEMS = 80;

/** Keep the declared precision; an unknown end never becomes the present. */
function timeValue(statement: WikidataStatement): string {
  const value = statement.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object' || !('time' in value) || typeof value.time !== 'string') return '';
  // The app uses Gregorian dates. Other calendars and coarse dates need review.
  if ('calendarmodel' in value && value.calendarmodel !== 'http://www.wikidata.org/entity/Q1985727') return '';
  if (('before' in value && value.before !== 0) || ('after' in value && value.after !== 0)) return '';
  const match = /^([+-])(\d+)-(\d{2})-(\d{2})T/.exec(value.time);
  if (!match) return '';
  const [, sign, digits, month, day] = match;
  const precision = 'precision' in value && typeof value.precision === 'number' ? value.precision : month === '00' ? 9 : day === '00' ? 10 : 11;
  if (precision < 9) return '';
  const year = `${sign === '-' ? '-' : ''}${digits.padStart(4, '0')}`;
  const date = precision === 9 ? year : precision === 10 ? `${year}-${month}` : `${year}-${month}-${day}`;
  return parseTemporal(date).kind === 'unknown' ? '' : date;
}

function claimDate(entity: WikidataEntity, property: string): { date: string; ambiguous: boolean } {
  const claims = (entity.claims?.[property] ?? []).filter(statement => statement.rank !== 'deprecated' && statement.mainsnak?.snaktype === 'value');
  const preferred = claims.filter(statement => statement.rank === 'preferred');
  const active = preferred.length ? preferred : claims;
  const values = [...new Set(active.map(timeValue).filter(Boolean))];
  const ambiguous = active.length > 0 && (values.length !== 1 || active.some(statement => !timeValue(statement)));
  return { date: !ambiguous && values.length === 1 ? values[0] : '', ambiguous };
}

function isHuman(entity: WikidataEntity) {
  return entity.claims?.P31?.some(statement => {
    const value = statement.mainsnak?.datavalue?.value;
    return value && typeof value === 'object' && 'id' in value && value.id === 'Q5';
  });
}

export function wikidataTimelineItemError(item: WikidataTimelineItem): string | null {
  if (!item.title.trim() || item.title.length > 255) return 'Renseignez un titre de 255 caractères maximum.';
  if (item.description.length > 1000) return 'La description doit tenir en 1 000 caractères.';
  if (!item.startDate.trim() || parseTemporal(item.startDate).kind === 'unknown') return 'Renseignez une date valide.';
  if (item.type === 'period') {
    if (!item.endDate.trim() || parseTemporal(item.endDate).kind === 'unknown') return 'Renseignez la fin de la période, ou choisissez Événement.';
    const errors = periodDateErrors(item.startDate, item.endDate);
    return errors.start || errors.end || null;
  }
  return null;
}

function mapItem(qid: string, entity: WikidataEntity): WikidataTimelineItem | null {
  if (entity.missing !== undefined || isHuman(entity)) return null;
  const point = claimDate(entity, 'P585');
  const start = claimDate(entity, 'P580');
  const end = claimDate(entity, 'P582');
  const inception = claimDate(entity, 'P571');
  const dissolution = claimDate(entity, 'P576');
  const opening = claimDate(entity, 'P1619');
  const has = (property: string) => !!entity.claims?.[property]?.length;
  if (!['P585', 'P580', 'P582', 'P571', 'P1619'].some(has)) return null;
  const type = has('P580') || has('P582') || (has('P571') && has('P576')) ? 'period' : 'event';
  const date = type === 'period' ? (has('P580') ? start : inception) : has('P585') ? point : has('P1619') ? opening : inception;
  const finish = has('P582') ? end : dissolution;
  const ambiguous = date.ambiguous || (type === 'period' && finish.ambiguous);
  const item: WikidataTimelineItem = {
    qid, type, title: entity.labels?.fr?.value || entity.labels?.en?.value || qid,
    description: entity.descriptions?.fr?.value || entity.descriptions?.en?.value || '',
    startDate: date.date, endDate: type === 'period' ? finish.date : '', selected: false,
    warning: ambiguous ? 'Date ambiguë, trop imprécise ou calendrier non pris en charge : à vérifier sur Wikidata.' : undefined,
  };
  item.selected = !wikidataTimelineItemError(item);
  return item;
}

async function loadEntities(ids: string[], options: WikidataReadOptions): Promise<Map<string, WikidataEntity>> {
  const entities = new Map<string, WikidataEntity>();
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'labels|descriptions|claims', languages: 'fr|en', languagefallback: '1', format: 'json', origin: '*' });
    const data = await mediaWiki(`${WIKIDATA_MEDIAWIKI_API_URL}?${params}`, options);
    for (const [qid, entity] of Object.entries(data.entities ?? {})) entities.set(qid, entity);
  }
  return entities;
}

function relationIds(entity: WikidataEntity, property: string): string[] {
  const claims = (entity.claims?.[property] ?? []).filter(statement => statement.rank !== 'deprecated' && statement.mainsnak?.snaktype === 'value');
  const preferred = claims.filter(statement => statement.rank === 'preferred');
  return [...new Set((preferred.length ? preferred : claims).flatMap(statement => {
    const value = statement.mainsnak?.datavalue?.value;
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && /^Q[1-9]\d*$/.test(value.id) ? [value.id] : [];
  }))];
}

/** Preserve declared relationships only; dates never invent a historical parent. */
function proposeParents(items: WikidataTimelineItem[], entities: Map<string, WikidataEntity>) {
  const periods = items.filter(item => item.type === 'period');
  for (const item of periods) {
    item.parentCandidates = periods.filter(parent => parent.qid !== item.qid && (
      relationIds(entities.get(item.qid)!, 'P361').includes(parent.qid)
      || relationIds(entities.get(parent.qid)!, 'P527').includes(item.qid)
    )).map(parent => parent.qid);
    item.parentQid = null;
  }
  for (const item of periods) {
    const candidate = item.parentCandidates?.length === 1 ? item.parentCandidates[0] : null;
    if (candidate && !wouldCreateWikidataCycle(item.qid, candidate, periods)) item.parentQid = candidate;
  }
}

/** Direct relations only: bounded discovery, followed by full claims (precision + rank). */
export async function generateWikidataTimeline(rawQid: string, options: WikidataReadOptions = {}): Promise<WikidataTimelineDraft> {
  const qid = normalizeWikidataId(rawQid);
  const subject = (await loadEntities([qid], options)).get(qid);
  if (!subject || subject.missing !== undefined) throw new Error('Ce sujet Wikidata est introuvable.');
  const rows = await sparql(`
    SELECT DISTINCT ?item WHERE {
      { ?item wdt:P361 wd:${qid}. }
      UNION { wd:${qid} wdt:P527 ?item. }
      UNION { wd:${qid} wdt:P793 ?item. }
      FILTER (isIRI(?item))
      FILTER EXISTS { VALUES ?dateProperty { wdt:P585 wdt:P580 wdt:P582 wdt:P571 wdt:P1619 } ?item ?dateProperty ?date. }
    }
    ORDER BY ?item
    LIMIT ${MAX_RELATED_ITEMS + 1}
  `, options);
  const related = [...new Set(rows.map(row => row.item?.value.split('/').pop() ?? '').filter(id => /^Q[1-9]\d*$/.test(id) && id !== qid))];
  const entities = await loadEntities(related.slice(0, MAX_RELATED_ITEMS), options);
  entities.set(qid, subject);
  const items = [...entities].flatMap(([id, entity]) => { const item = mapItem(id, entity); return item ? [item] : []; });
  items.sort((a, b) => compareYearsOldestFirst(parseTemporal(a.startDate).yearsBeforePresent, parseTemporal(b.startDate).yearsBeforePresent) || a.qid.localeCompare(b.qid));
  proposeParents(items, entities);
  const warnings = ['Les éléments proposés proviennent des relations directes du sujet dans Wikidata. Cette sélection peut être incomplète ou contenir des éléments à écarter.'];
  if (rows.length > MAX_RELATED_ITEMS) warnings.push(`La recherche est limitée aux ${MAX_RELATED_ITEMS} premiers éléments liés. La frise ne sera pas exhaustive.`);
  if (isHuman(subject)) warnings.push('Les biographies ne sont pas encore transformées en événements de vie. Seuls les événements liés sont proposés.');
  return { qid, title: subject.labels?.fr?.value || subject.labels?.en?.value || qid, description: subject.descriptions?.fr?.value || subject.descriptions?.en?.value || '', items, warnings };
}
