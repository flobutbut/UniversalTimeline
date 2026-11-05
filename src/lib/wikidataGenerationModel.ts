import type { WikidataEntity, WikidataStatement } from '@/services/wikidataTransport';
import type { WikidataTimelineDraft } from '@/types/wikidataGeneration';
import { wikibaseTimeToTemporal, type WikibaseTime } from '@/lib/wikidataTime';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import { MS_PER_YEAR, parseTemporal } from '@temporal';

export type Profile = 'person' | 'history' | 'space' | 'art' | 'geology';
export type Status = 'retained' | 'review' | 'excluded';
export interface Statement extends WikidataStatement {
  id?: string;
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
  references?: unknown[];
}
export interface Entity extends WikidataEntity { claims?: Record<string, Statement[]> }
export interface WikidataGenerationCollection {
  qid: string;
  profile: Profile;
  capturedAt: string;
  entities: Record<string, Entity>;
  baseline: WikidataTimelineDraft | null;
  baselineError?: string;
  eligible: string[];
  rankedIds: string[];
  truncated: boolean;
  baselineTruncated?: boolean;
  notices?: string[];
}
export interface WikidataGenerationDate {
  label: string;
  raw: string;
  order: number | null;
  approximate: boolean;
  precision: number;
  values: WikibaseTime[];
  issue?: string;
}
export interface WikidataCandidate {
  id: string;
  qid: string;
  title: string;
  description: string;
  type: 'period' | 'event';
  category: string;
  start: WikidataGenerationDate | null;
  end: WikidataGenerationDate | null;
  source: { qid: string; property: string; statementId?: string; references: number };
  origin: 'entity' | 'fact';
  targetQid?: string;
  relevance: number;
  status: Status;
  reasons: string[];
}
export interface WikidataGenerationSettings { approximate: boolean; withinBounds: boolean; limit: number; biography: boolean; works: boolean }
export const defaultSettings: WikidataGenerationSettings = { approximate: true, withinBounds: true, limit: 40, biography: true, works: true };
export const profiles: Array<{ value: Profile; label: string; description: string }> = [
  { value: 'person', label: 'Personne / artiste', description: 'Événements de vie, relations datées et œuvres majeures.' },
  { value: 'history', label: 'Histoire / conflit', description: 'Événements et périodes ; priorité selon les liens vers les projets Wikimedia.' },
  { value: 'space', label: 'Programme / mission', description: 'Missions, lancements, retours et étapes datées.' },
  { value: 'art', label: 'Mouvement artistique', description: 'Sous-mouvements et jalons déclarés dans Wikidata.' },
  { value: 'geology', label: 'Géologie', description: 'Subdivisions et transitions ; signalement des unités obsolètes.' },
];
export const propertyLabels: Record<string, string> = {
  P569: 'Naissance', P570: 'Décès', P571: 'Création', P576: 'Dissolution', P580: 'Début', P582: 'Fin', P585: 'Date',
  P619: 'Lancement', P620: 'Retour', P1619: 'Ouverture', P793: 'Étape', P800: 'Œuvre majeure',
  P166: 'Distinction', P26: 'Mariage', P69: 'Formation', P551: 'Résidence', P39: 'Fonction', P527: 'Comprend', P361: 'Fait partie de',
};
export function label(entity: Entity | undefined, fallback: string) { return entity?.labels?.fr?.value || entity?.labels?.en?.value || fallback; }
export function description(entity?: Entity) { return entity?.descriptions?.fr?.value || entity?.descriptions?.en?.value || ''; }
export function statements(entity: Entity | undefined, property: string): Statement[] {
  const all = (entity?.claims?.[property] ?? []).filter(s => s.rank !== 'deprecated' && s.mainsnak?.snaktype === 'value');
  const preferred = all.filter(s => s.rank === 'preferred');
  return preferred.length ? preferred : all;
}
export function itemId(statement: WikidataStatement): string | null {
  const v = statement.mainsnak?.datavalue?.value;
  return v && typeof v === 'object' && 'id' in v && typeof v.id === 'string' && /^Q[1-9]\d*$/.test(v.id) ? v.id : null;
}
export function ids(entity: Entity | undefined, property: string) { return statements(entity, property).flatMap(s => itemId(s) ?? []); }
function asTime(value: unknown): value is WikibaseTime { return !!value && typeof value === 'object' && 'time' in value && typeof value.time === 'string'; }

export function labDate(values: unknown[]): WikidataGenerationDate | null {
  const times = values.filter(asTime);
  if (!times.length) return null;
  const unique = [...new Map(times.map(t => [JSON.stringify([t.time, t.precision, t.calendarmodel, t.before, t.after]), t])).values()];
  if (unique.length > 1) return { label: 'Plusieurs dates possibles', raw: '', order: null, approximate: true, precision: 0, values: unique, issue: 'Les dates de même rang divergent. Consultez les déclarations.' };
  const time = unique[0];
  const precision = time.precision ?? 11;
  const raw = wikibaseTimeToTemporal(time, 'historical');
  if (raw) return { label: formatSearchResultDateBound(raw), raw, order: -(parseTemporal(raw, 0).yearsBeforePresent ?? 0), approximate: precision <= 5, precision, values: unique };
  const match = /^([+-])(\d+)-/.exec(time.time);
  const calendarSupported = !time.calendarmodel || /Q19857(27|86)$/.test(time.calendarmodel);
  if (match && precision >= 6 && precision <= 9 && calendarSupported) {
    const year = Number(match[2]);
    const display = match[1] === '-' ? `${year} av. J.-C.` : String(year);
    const temporal = match[1] === '-' ? `${year} BCE` : String(year).padStart(4, '0');
    return { label: `vers ${display}`, raw: time.time, order: -(parseTemporal(temporal, 0).yearsBeforePresent ?? 0), approximate: true, precision, values: unique, issue: `Précision ${precision === 7 ? 'au siècle' : precision === 8 ? 'à la décennie' : precision === 6 ? 'au millénaire' : 'à l’année, avec incertitude'}. Placement indicatif.` };
  }
  return { label: 'Date à vérifier', raw: time.time, order: null, approximate: true, precision, values: unique, issue: 'Date incertaine ou calendrier non pris en charge.' };
}
function mainDate(entity: Entity | undefined, property: string) { return labDate(statements(entity, property).map(s => s.mainsnak?.datavalue?.value)); }
function qualifierDate(statement: Statement, property: string) { return labDate((statement.qualifiers?.[property] ?? []).map(s => s.datavalue?.value)); }
function source(qid: string, property: string, statement?: Statement): WikidataCandidate['source'] {
  return { qid, property, statementId: statement?.id, references: statement?.references?.length ?? 0 };
}
function key(statement: Statement, index: number) { return statement.id ?? `${index}:${JSON.stringify(statement.mainsnak?.datavalue?.value)}`; }

export function extractCandidates(snapshot: WikidataGenerationCollection, profile: Profile): WikidataCandidate[] {
  const subject = snapshot.entities[snapshot.qid];
  const subjectLabel = label(subject, snapshot.qid);
  const out: WikidataCandidate[] = [];
  const addFact = (property: string, statement: Statement, index: number, title: string, start: WikidataGenerationDate | null, end: WikidataGenerationDate | null = null) => {
    out.push({ id: `fact:${snapshot.qid}:${property}:${key(statement, index)}`, qid: snapshot.qid, title, description: '', type: end || ['P26', 'P69', 'P551', 'P39'].includes(property) || (property === 'P793' && statement.qualifiers?.P580?.length) ? 'period' : 'event', category: property === 'P166' ? 'Distinctions' : property === 'P793' || property === 'P619' || property === 'P620' ? 'Étapes' : 'Biographie', start, end, source: source(snapshot.qid, property, statement), origin: 'fact', targetQid: itemId(statement) ?? undefined, relevance: property === 'P569' || property === 'P570' ? 110 : 100, status: 'retained', reasons: [`${propertyLabels[property] ?? property} déclaré sur la fiche du sujet.`] });
  };
  if (profile === 'person') {
    for (const property of ['P569', 'P570']) {
      const ss = statements(subject, property);
      if (ss.length) addFact(property, ss[0], 0, `${propertyLabels[property]} de ${subjectLabel}`, mainDate(subject, property));
    }
    for (const property of ['P166', 'P26', 'P69', 'P551', 'P39']) statements(subject, property).forEach((s, index) => {
      const target = itemId(s);
      const start = qualifierDate(s, 'P585') ?? qualifierDate(s, 'P580');
      const end = qualifierDate(s, 'P582');
      // Undated biographical relations remain visible for diagnosis, never auto-selected.
      addFact(property, s, index, `${propertyLabels[property]} · ${label(snapshot.entities[target ?? ''], target ?? subjectLabel)}`, start, end);
    });
  }
  if (profile === 'space') for (const property of ['P619', 'P620']) {
    const ss = statements(subject, property);
    if (ss.length) addFact(property, ss[0], 0, `${propertyLabels[property]} · ${subjectLabel}`, mainDate(subject, property));
  }
  statements(subject, 'P793').forEach((s, index) => {
    const start = qualifierDate(s, 'P585') ?? qualifierDate(s, 'P580');
    const end = qualifierDate(s, 'P582');
    if (!start && !end) return;
    const target = itemId(s);
    addFact('P793', s, index, `${label(snapshot.entities[target ?? ''], target ?? 'Étape')} · ${subjectLabel}`, start, end);
  });

  const workIds = new Set(ids(subject, 'P800'));
  const relatedIds = new Set([...snapshot.rankedIds, ...snapshot.eligible, ...ids(subject, 'P527'), ...ids(subject, 'P793'), ...workIds,
    ...(snapshot.baseline?.items.map(i => i.qid) ?? []), snapshot.qid]);
  for (const qid of relatedIds) {
    const entity = snapshot.entities[qid];
    if (!entity || entity.missing !== undefined) continue;
    if (ids(entity, 'P31').includes('Q5')) continue;
    const launch = profile === 'space' ? mainDate(entity, 'P619') : null;
    const landing = profile === 'space' ? mainDate(entity, 'P620') : null;
    const begin = mainDate(entity, 'P580') ?? launch;
    const finish = mainDate(entity, 'P582') ?? landing ?? mainDate(entity, 'P576');
    const inception = mainDate(entity, 'P571');
    const point = mainDate(entity, 'P585') ?? mainDate(entity, 'P1619');
    const isWork = workIds.has(qid);
    const isPeriod = !!begin || !!finish || (!!inception && (profile === 'art' || profile === 'geology'));
    const start = begin ?? point ?? inception;
    const property = begin ? launch && !mainDate(entity, 'P580') ? 'P619' : 'P580' : point ? mainDate(entity, 'P585') ? 'P585' : 'P1619' : 'P571';
    // A period needs at least one temporal declaration; untyped undated objects stay out of the list.
    if (!start && !finish && !isWork && qid !== snapshot.qid) continue;
    const isRoot = qid === snapshot.qid;
    out.push({ id: `entity:${qid}`, qid, title: label(entity, qid), description: description(entity), type: isPeriod ? 'period' : 'event', category: isWork ? 'Œuvres' : isRoot ? 'Sujet' : isPeriod ? 'Périodes' : 'Événements', start, end: isPeriod ? finish : null, source: source(qid, property, statements(entity, property)[0]), origin: 'entity', relevance: isRoot ? 120 : isWork ? 95 : snapshot.rankedIds.includes(qid) ? 90 - snapshot.rankedIds.indexOf(qid) / 10 : ids(subject, 'P527').includes(qid) ? 85 : 65, status: 'retained', reasons: [isWork ? 'Œuvre majeure explicitement reliée au sujet (P800).' : isRoot ? 'Période ou événement principal.' : snapshot.eligible.includes(qid) ? 'Classe historique compatible ; priorité selon les liens Wikimedia.' : ids(subject, 'P527').includes(qid) ? 'Élément explicitement contenu dans le sujet (P527).' : 'Relation directe déclarée dans Wikidata.'] });
  }
  return out;
}

/** Calendar years/months cover their whole declared precision, not just January 1. */
function dateRange(date: WikidataGenerationDate | null | undefined): { first: number; last: number } | null {
  if (!date || date.order == null || date.approximate) return null;
  const parsed = parseTemporal(date.raw, 0);
  if (parsed.kind === 'calendar' && parsed.calendarDate) {
    const next = new Date(parsed.calendarDate);
    if (parsed.precision === 'year') next.setUTCFullYear(next.getUTCFullYear() + 1);
    else if (parsed.precision === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 1);
    return { first: date.order, last: (next.getTime() - 1) / MS_PER_YEAR };
  }
  return { first: date.order, last: date.order };
}

export function evaluate(snapshot: WikidataGenerationCollection, profile: Profile, settings: WikidataGenerationSettings): WikidataCandidate[] {
  const candidates = extractCandidates(snapshot, profile);
  const root = candidates.find(i => i.qid === snapshot.qid && i.origin === 'entity');
  const rootStart = dateRange(root?.start), rootEnd = dateRange(root?.end);
  for (const item of candidates) {
    const exclude = (reason: string) => { item.status = 'excluded'; item.reasons.push(reason); };
    const review = (reason: string) => { if (item.status !== 'excluded') item.status = 'review'; item.reasons.push(reason); };
    if (!settings.biography && ['Biographie', 'Distinctions'].includes(item.category)) exclude('Événements de vie désactivés.');
    if (!settings.works && item.category === 'Œuvres') exclude('Œuvres désactivées.');
    if (/obsol[eè]te|obsolete|désuet/i.test(item.description)) exclude('La source décrit cette subdivision comme obsolète.');
    if (profile === 'person' && item.origin === 'entity' && item.category !== 'Œuvres') exclude('Hors du périmètre biographie / œuvres majeures.');
    if (profile === 'history' && item.origin === 'entity' && item.qid !== snapshot.qid && !snapshot.eligible.includes(item.qid)) exclude('Classe historique non confirmée par la collecte ciblée.');
    if (profile === 'space' && item.origin === 'entity' && item.qid !== snapshot.qid) {
      const entity = snapshot.entities[item.qid];
      const mission = !!mainDate(entity, 'P619') || !!mainDate(entity, 'P620');
      const datedOccurrence = !!mainDate(entity, 'P585') || !!mainDate(entity, 'P580');
      if (!mission && !datedOccurrence) exclude('Objet ou fonction : aucune date de mission ou d’événement.');
    }
    if (!item.start || item.start.order === null) review(item.start?.issue ?? 'Date de début absente.');
    if (item.type === 'period' && (!item.end || item.end.order === null)) review(item.end?.issue ?? 'Fin inconnue : intervalle ouvert à vérifier.');
    if (item.start?.approximate || item.end?.approximate) {
      if (!settings.approximate) review('Dates approximatives désactivées.');
      else item.reasons.push('Date approximative conservée avec sa précision.');
    }
    if (item.start?.order != null && item.end?.order != null && item.start.order > item.end.order) review('Le début est postérieur à la fin.');
    if (item.origin === 'entity' && item.title === item.qid) review('Libellé français ou anglais manquant.');
    if (item.qid !== snapshot.qid && settings.withinBounds && rootStart && rootEnd) {
      const start = dateRange(item.start), end = dateRange(item.end ?? item.start);
      if (start && end && (end.last < rootStart.first || start.first > rootEnd.last)) exclude('En dehors des bornes temporelles du sujet.');
      else if (start && end && (start.last < rootStart.first || end.first > rootEnd.last)) review('L’intervalle dépasse les bornes du sujet.');
    }
  }
  // Deduplicate only after qualification: an unavailable or rejected counterpart
  // must never erase a useful fact from a partial collection.
  for (const item of candidates.filter(i => i.origin === 'fact' && i.status === 'retained')) {
    if (item.source.property === 'P793' && item.targetQid) {
      const native = candidates.find(other => other.status === 'retained' && other.origin === 'entity' && other.qid === item.targetQid && other.start?.order === item.start?.order && other.end?.order === item.end?.order);
      if (native) { item.status = 'excluded'; item.reasons.push(`Doublon : ce fait est déjà proposé depuis sa fiche ${native.qid}.`); }
    }
    if (item.source.property === 'P619' || item.source.property === 'P620') {
      const equivalent = item.source.property === 'P619' ? 'Q797476' : 'Q1642255';
      if (candidates.some(other => other.status === 'retained' && other.source.property === 'P793' && other.targetQid === equivalent && other.start?.order === item.start?.order)) {
        item.status = 'excluded'; item.reasons.push('Doublon : cette étape possède aussi une déclaration détaillée.');
      }
    }
  }
  const ranked = candidates.filter(i => i.status === 'retained').sort((a, b) => b.relevance - a.relevance || a.id.localeCompare(b.id));
  for (const item of ranked.slice(settings.limit)) { item.status = 'excluded'; item.reasons.push(`Limite d’affichage de ${settings.limit} propositions atteinte, après classement.`); }
  return candidates.sort((a, b) => (a.start?.order ?? Infinity) - (b.start?.order ?? Infinity) || b.relevance - a.relevance || a.id.localeCompare(b.id));
}
export function sourceUrl(item: WikidataCandidate) { return `https://www.wikidata.org/wiki/${item.source.qid}${item.source.statementId ? `#${encodeURIComponent(item.source.statementId)}` : ''}`; }
