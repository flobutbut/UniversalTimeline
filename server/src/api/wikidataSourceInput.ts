import { inputObject, InputValidationError, parseQid } from './inputValidation.js';
import { generatedSourceKey, type WikidataSource, type WikidataSourceTime } from '../shared/wikidataGeneration.js';

export function parseWikidataSource(value: unknown, qid: string): WikidataSource | undefined {
  if (value === undefined) return undefined;
  const source = inputObject(value, 'source');
  const sourceQid = parseQid(source.qid, true)!;
  if (sourceQid !== qid || typeof source.property !== 'string' || !/^P[1-9]\d{0,8}$/.test(source.property)) throw new InputValidationError('source', 'La provenance Wikidata est invalide.');
  const statementId = source.statementId;
  if (statementId !== undefined && (typeof statementId !== 'string' || !new RegExp(`^${qid}\\$[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$`, 'i').test(statementId))) throw new InputValidationError('source', 'L’identifiant de déclaration Wikidata est invalide.');
  if (!Number.isInteger(source.references) || Number(source.references) < 0 || Number(source.references) > 10000) throw new InputValidationError('source', 'Le nombre de références est invalide.');
  const dates = (raw: unknown): WikidataSourceTime[] | undefined => {
    if (raw === undefined) return undefined;
    if (!Array.isArray(raw) || raw.length > 20) throw new InputValidationError('source', 'Les dates de provenance sont invalides.');
    return raw.map(value => {
      const date = inputObject(value, 'source');
      if (typeof date.time !== 'string' || !/^[+-]\d{4,16}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date.time)) throw new InputValidationError('source', 'Une date Wikidata source est invalide.');
      for (const field of ['precision', 'before', 'after']) if (date[field] !== undefined && (!Number.isInteger(date[field]) || Number(date[field]) < 0 || Number(date[field]) > (field === 'precision' ? 14 : 1000000000))) throw new InputValidationError('source', 'La précision de provenance est invalide.');
      if (date.calendarmodel !== undefined && (typeof date.calendarmodel !== 'string' || !/^https?:\/\/www.wikidata.org\/entity\/Q[1-9]\d*$/.test(date.calendarmodel))) throw new InputValidationError('source', 'Le calendrier source est invalide.');
      return { time: date.time, ...(date.precision !== undefined ? { precision: Number(date.precision) } : {}), ...(date.before !== undefined ? { before: Number(date.before) } : {}), ...(date.after !== undefined ? { after: Number(date.after) } : {}), ...(date.calendarmodel ? { calendarmodel: String(date.calendarmodel) } : {}) };
    });
  };
  return { qid, property: source.property, statementId: statementId as string | undefined, references: Number(source.references), start: dates(source.start), end: dates(source.end) };
}
export function parseGeneratedIdentity(item: Record<string, unknown>, qid: string) {
  const origin = item.origin ?? 'entity';
  if (origin !== 'entity' && origin !== 'fact') throw new InputValidationError('origin', 'L’origine doit être entity ou fact.');
  const source = parseWikidataSource(item.source, qid);
  if (origin === 'fact' && !source?.statementId) throw new InputValidationError('source', 'Un fait doit référencer une déclaration Wikidata.');
  const sourceKey = generatedSourceKey(qid, origin, source);
  if (item.id !== undefined && item.id !== sourceKey) throw new InputValidationError('id', 'L’identité du fait ne correspond pas à sa provenance.');
  return { key: item.id === undefined && origin === 'entity' ? qid : sourceKey, sourceKey, source, origin, wikidataId: origin === 'entity' ? qid : null };
}
