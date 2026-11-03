import { randomUUID } from 'node:crypto';
import { inputObject, InputValidationError, parseEventWrite, parsePeriodWrite, parseQid, parseStoryWrite, parseStoryId } from './inputValidation.js';
import type { EventWrite, PeriodWrite, StoryWrite } from '../domain/writeInputs.js';
import { parseTemporal } from '../shared/temporal.js';
import { parseWriteCategories } from './entityCategories.js';

export type GeneratedItem = { type: 'event'; data: EventWrite & { id: string; wikidata_id: string } }
  | { type: 'period'; parentQid: string | null; data: PeriodWrite & { id: string; wikidata_id: string } };
export interface GeneratedStoryInput { qid: string; acknowledgedStoryIds: string[]; story: StoryWrite; items: GeneratedItem[] }

export function parseGeneratedStoryLookup(value: unknown) {
  const input = inputObject(value);
  return { qid: parseQid(input.qid, true)!, title: parseStoryWrite({ title: { fr: input.title } }).title.fr };
}

export function parseGeneratedStory(value: unknown): GeneratedStoryInput {
  const body = inputObject(value);
  const qid = parseQid(body.qid, true)!;
  const story = parseWriteCategories(parseStoryWrite({ title: { fr: body.title }, description: { fr: body.description === undefined ? `Source : https://www.wikidata.org/wiki/${qid}` : body.description }, isPublic: body.isPublic === undefined ? false : body.isPublic }));
  const acknowledged = body.acknowledgedStoryIds === undefined ? [] : body.acknowledgedStoryIds;
  if (!Array.isArray(acknowledged) || acknowledged.length > 20) throw new InputValidationError('acknowledgedStoryIds', 'La confirmation des frises existantes est invalide.');
  const acknowledgedStoryIds = [...new Set(acknowledged.map(id => parseStoryId(id, 'acknowledgedStoryIds')))];
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 81) throw new InputValidationError('items', 'Sélectionnez de 1 à 81 éléments.');
  const seen = new Set<string>();
  const items = body.items.map((raw): GeneratedItem => {
    const item = inputObject(raw, 'items');
    const wikidata_id = parseQid(item.qid, true)!;
    if (seen.has(wikidata_id)) throw new InputValidationError('items', 'Un élément Wikidata ne peut apparaître qu’une fois.');
    seen.add(wikidata_id);
    const parentQid = item.parentQid == null || item.parentQid === '' ? null : parseQid(item.parentQid, true)!;
    if (typeof item.startDate !== 'string' || parseTemporal(item.startDate).kind === 'unknown') throw new InputValidationError('startDate', 'Chaque élément doit avoir une date valide.');
    const core = { id: randomUUID(), wikidata_id, label: { fr: item.title }, description: { fr: item.description } };
    if (item.type === 'event') {
      if (parentQid) throw new InputValidationError('parentQid', 'Seule une période peut avoir un parent.');
      return { type: 'event', data: { ...parseWriteCategories(parseEventWrite({ ...core, date: item.startDate }, true)), wikidata_id } };
    }
    if (item.type !== 'period') throw new InputValidationError('type', 'Le type doit être period ou event.');
    if (typeof item.endDate !== 'string' || parseTemporal(item.endDate).kind === 'unknown') throw new InputValidationError('endDate', 'Chaque période doit avoir une date de fin explicite.');
    return { type: 'period', parentQid, data: { ...parseWriteCategories(parsePeriodWrite({ ...core, start_date: item.startDate, end_date: item.endDate }, true)), wikidata_id } };
  });
  const periods = new Map(items.filter(item => item.type === 'period').map(item => [item.data.wikidata_id, item]));
  for (const item of periods.values()) {
    if (item.parentQid && !periods.has(item.parentQid)) throw new InputValidationError('parentQid', 'Le parent doit être une période sélectionnée dans cette frise.');
    const ancestors = new Set([item.data.wikidata_id]);
    let parent = item.parentQid;
    while (parent) {
      if (ancestors.has(parent)) throw new InputValidationError('parentQid', 'Les rattachements ne doivent pas former de boucle.');
      ancestors.add(parent);
      parent = periods.get(parent)?.parentQid ?? null;
    }
  }
  return { qid, acknowledgedStoryIds, story, items };
}
