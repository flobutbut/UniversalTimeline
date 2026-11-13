import { randomUUID } from 'node:crypto';
import { inputObject, InputValidationError, parseEventWrite, parsePeriodWrite, parseQid, parseStoryWrite, parseStoryId } from './inputValidation.js';
import type { EventWrite, PeriodWrite, StoryWrite } from '../domain/writeInputs.js';
import { parseTemporal } from '../shared/temporal.js';
import { parseWriteCategories } from './entityCategories.js';
import { parseGeneratedIdentity } from './wikidataSourceInput.js';
import type { WikidataSource } from '../shared/wikidataGeneration.js';

interface GeneratedIdentity { key: string; sourceKey: string; source?: WikidataSource }
export type GeneratedItem = GeneratedIdentity & ({ type: 'event'; data: EventWrite & { id: string } }
  | { type: 'period'; parentQid: string | null; data: Omit<PeriodWrite, 'wikidata_id'> & { id: string; wikidata_id: string | null } });
export interface GeneratedStoryInput { qid: string; acknowledgedStoryIds: string[]; story: StoryWrite; items: GeneratedItem[] }

export function parseGeneratedStoryLookup(value: unknown) {
  const input = inputObject(value);
  return { qid: parseQid(input.qid, true)!, title: parseStoryWrite({ title: { fr: input.title } }).title.fr };
}

function generatedText(record: Record<string, unknown>, field: 'title' | 'description', value: unknown) {
  if (record.texts === undefined) return { fr: value };
  const texts = inputObject(record.texts, 'texts');
  const lang = texts.language;
  if (lang !== 'en' && lang !== 'fr') throw new InputValidationError('texts.language', 'Langue invalide.');
  const originals = inputObject(texts[field === 'title' ? 'titles' : 'descriptions']);
  const other = lang === 'en' ? 'fr' : 'en';
  const missingTitle = field === 'title' && value === record.qid && !originals[lang] && originals[other];
  return { [lang]: missingTitle ? '' : value, [other]: originals[other] };
}

export function parseGeneratedStory(value: unknown): GeneratedStoryInput {
  const body = inputObject(value);
  const qid = parseQid(body.qid, true)!;
  const story = parseWriteCategories(parseStoryWrite({ title: generatedText(body, 'title', body.title), description: generatedText(body, 'description', body.description === undefined ? `Source : https://www.wikidata.org/wiki/${qid}` : body.description), isPublic: body.isPublic === undefined ? false : body.isPublic }));
  const acknowledged = body.acknowledgedStoryIds === undefined ? [] : body.acknowledgedStoryIds;
  if (!Array.isArray(acknowledged) || acknowledged.length > 20) throw new InputValidationError('acknowledgedStoryIds', 'La confirmation des frises existantes est invalide.');
  const acknowledgedStoryIds = [...new Set(acknowledged.map(id => parseStoryId(id, 'acknowledgedStoryIds')))];
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 81) throw new InputValidationError('items', 'Sélectionnez de 1 à 81 éléments.');
  const seen = new Set<string>();
  const items = body.items.map((raw): GeneratedItem => {
    const item = inputObject(raw, 'items');
    const qid = parseQid(item.qid, true)!;
    const identity = parseGeneratedIdentity(item, qid);
    if (seen.has(identity.sourceKey)) throw new InputValidationError('items', 'Un même fait ne peut apparaître qu’une fois.');
    seen.add(identity.sourceKey);
    const parentQid = item.parentQid == null || item.parentQid === '' ? null : typeof item.parentQid === 'string' && item.parentQid.length <= 200 ? item.parentQid : (() => { throw new InputValidationError('parentQid', 'Le parent est invalide.'); })();
    if (typeof item.startDate !== 'string' || parseTemporal(item.startDate).kind === 'unknown') throw new InputValidationError('startDate', 'Chaque élément doit avoir une date valide.');
    const core = { id: randomUUID(), wikidata_id: qid, label: generatedText(item, 'title', item.title), description: generatedText(item, 'description', item.description), wikipedia: item.wikipedia };
    const metadata = { key: identity.key, sourceKey: identity.sourceKey, source: identity.source };
    if (item.type === 'event') {
      if (parentQid) throw new InputValidationError('parentQid', 'Seule une période peut avoir un parent.');
      return { ...metadata, type: 'event', data: { ...parseWriteCategories(parseEventWrite({ ...core, date: item.startDate }, true)), wikidata_id: identity.wikidataId } };
    }
    if (item.type !== 'period') throw new InputValidationError('type', 'Le type doit être period ou event.');
    if (typeof item.endDate !== 'string' || parseTemporal(item.endDate).kind === 'unknown') throw new InputValidationError('endDate', 'Chaque période doit avoir une date de fin explicite.');
    return { ...metadata, type: 'period', parentQid, data: { ...parseWriteCategories(parsePeriodWrite({ ...core, start_date: item.startDate, end_date: item.endDate }, true)), wikidata_id: identity.wikidataId } };
  });
  const periods = new Map(items.filter(item => item.type === 'period').map(item => [item.key, item]));
  for (const item of periods.values()) {
    if (item.parentQid && !periods.has(item.parentQid)) throw new InputValidationError('parentQid', 'Le parent doit être une période sélectionnée dans cette frise.');
    const ancestors = new Set([item.key]);
    let parent = item.parentQid;
    while (parent) {
      if (ancestors.has(parent)) throw new InputValidationError('parentQid', 'Les rattachements ne doivent pas former de boucle.');
      ancestors.add(parent);
      parent = periods.get(parent)?.parentQid ?? null;
    }
  }
  return { qid, acknowledgedStoryIds, story, items };
}
