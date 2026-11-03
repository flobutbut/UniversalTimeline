import { USERNAME_MAX, usernameError, isAvatarColor, isAvatarIcon } from '../shared/accountRules.js';
import { parseTemporal, periodDateErrors } from '../shared/temporal.js';
import { EVENT_IMPORTANCES, type EventImportance, type EventWrite, type PeriodWrite } from '../domain/writeInputs.js';
import { PeriodHierarchyError, StoryAssociationError } from '../domain/errors.js';
/** Untrusted HTTP input becomes a small, explicitly typed object before any database call. */
export class InputValidationError extends Error {
  readonly fields: Record<string, string>;
  constructor(field: string, message: string) { super(message); this.fields = { [field]: message }; }
}

export function inputObject(value: unknown, field = 'body'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputValidationError(field, `${field} doit être un objet JSON.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, max: number, required = false, trim = true): string | null {
  if (value === undefined || value === null) {
    if (!required) return null;
  } else if (typeof value === 'string' && !value.includes('\0') && value.length <= max) {
    if (!required || value.trim()) return trim ? value.trim() : value;
  }
  throw new InputValidationError(field, `${field} doit être un texte ${required ? 'non vide ' : ''}de ${max} caractères maximum.`);
}

export function parseEntityId(value: unknown, field = 'id'): string {
  const id = text(value, field, 200, true)!;
  if (/[\u0000-\u001f\u007f]/.test(id)) throw new InputValidationError(field, `${field} contient un caractère interdit.`);
  return id;
}

/** Story IDs are Postgres int4, unlike the historical text IDs of catalogue entities. */
export function parseStoryId(value: unknown, field = 'id'): string {
  const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof id !== 'string' || !/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) {
    throw new InputValidationError(field, `${field} doit être un identifiant de frise positif valide.`);
  }
  return id;
}

export function parseQid(value: unknown, required = false): string | null {
  const id = text(value, 'wikidata_id', 200, required);
  if (!id && !required) return null;
  if (!id || !/^Q[1-9]\d*$/i.test(id)) throw new InputValidationError('wikidata_id', 'Le Q-id Wikidata doit être de la forme Q12345.');
  return id.toUpperCase();
}

function bilingual(value: unknown, field: 'label' | 'title' | 'description') {
  const data = value == null && field === 'description' ? {} : inputObject(value, field);
  const required = field !== 'description';
  const max = required ? 255 : 1000;
  const fr = text(data.fr, `${field}.fr`, max, required, field !== 'description');
  const en = text(data.en, `${field}.en`, max, false, field !== 'description');
  return { fr, en: en || fr };
}

function label(value: unknown, field: 'label' | 'title') {
  const result = bilingual(value, field);
  // Required French text has been checked by bilingual().
  return { fr: result.fr!, en: result.en! };
}

function dateText(value: unknown, field: string, required = false) {
  const result = text(value, field, 255, required);
  if (result && /[\u0000-\u001f\u007f]/.test(result)) throw new InputValidationError(field, `${field} doit tenir sur une seule ligne.`);
  const parsed = parseTemporal(result);
  if (parsed.kind === 'unknown' && parsed.reason === 'invalid') throw new InputValidationError(field, 'La date est invalide.');
  return result;
}

type EntityWriteInput = Omit<EventWrite, 'date' | 'categories'> & { categories: unknown };
type PeriodWriteInput = Omit<PeriodWrite, 'categories'> & { categories: unknown };

export function parseEventWrite(value: unknown, create: true): EntityWriteInput & { id: string; date: string };
export function parseEventWrite(value: unknown, create: false): EntityWriteInput & { date: string };
export function parseEventWrite(value: unknown, create: boolean): EntityWriteInput & { date: string } {
  const body = inputObject(value);
  return {
    id: create ? parseEntityId(body.id) : undefined,
    wikidata_id: parseQid(body.wikidata_id),
    label: label(body.label, 'label'), description: bilingual(body.description, 'description'),
    date: dateText(body.date, 'date', true)!, categories: body.categories,
  };
}

export function parsePeriodWrite(value: unknown, create: true): PeriodWriteInput & { id: string };
export function parsePeriodWrite(value: unknown, create: false): PeriodWriteInput;
export function parsePeriodWrite(value: unknown, create: boolean): PeriodWriteInput {
  const body = inputObject(value);
  if (body.parent_id != null) throw new InputValidationError('parent_id', 'Organisez les périodes dans une frise, pas dans le catalogue.');
  const parsed = {
    id: create ? parseEntityId(body.id) : undefined,
    wikidata_id: parseQid(body.wikidata_id, true)!,
    label: label(body.label, 'label'), description: bilingual(body.description, 'description'),
    start_date: dateText(body.start_date, 'start_date', true)!,
    end_date: dateText(body.end_date, 'end_date') || (create ? 'NOW' : 'TODAY'),
    categories: body.categories,
  };
  const errors = periodDateErrors(parsed.start_date, parsed.end_date);
  if (errors.start) throw new InputValidationError('start_date', errors.start);
  if (errors.end) throw new InputValidationError('end_date', errors.end);
  return parsed;
}

export function parseStoryWrite(value: unknown) {
  const body = inputObject(value);
  const isPublic = body.isPublic;
  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new InputValidationError('isPublic', 'La visibilité doit être un booléen.');
  }
  return {
    title: label(body.title, 'title'), description: bilingual(body.description, 'description'),
    // Optional: a signed-in account always signs with its own name (services/storyService).
    author: body.author === undefined || body.author === null ? null : text(body.author, 'author', 255, true),
    isPublic, categories: body.categories,
  };
}

export function parseAnchor(value: unknown): { anchorType: 'period' | 'event'; anchorId: string } {
  const body = inputObject(value);
  if (body.anchorType !== 'period' && body.anchorType !== 'event') throw new InputValidationError('anchorType', 'Le type d’ancre doit être period ou event.');
  return { anchorType: body.anchorType, anchorId: parseEntityId(body.anchorId, 'anchorId') };
}

/** Optional place of a new frise: its parent and, within that parent, its anchor. */
export function parseStoryPlacement(value: unknown): { parentStoryId: string; anchor?: { anchorType: 'period' | 'event'; anchorId: string } } | null {
  const body = inputObject(value);
  if (body.parentStoryId === undefined || body.parentStoryId === null) {
    if (body.anchor !== undefined && body.anchor !== null) throw new InputValidationError('anchor', 'Choisissez d’abord la frise parente.');
    return null;
  }
  return { parentStoryId: parseStoryId(body.parentStoryId, 'parentStoryId'), ...(body.anchor === undefined || body.anchor === null ? {} : { anchor: parseAnchor(body.anchor) }) };
}

export function parseChildStories(value: unknown) {
  const body = inputObject(value);
  const multiple = Object.prototype.hasOwnProperty.call(body, 'childStoryIds');
  const raw = multiple ? body.childStoryIds : [body.childStoryId];
  if (!Array.isArray(raw) || !raw.length || raw.length > 500) throw new InputValidationError('childStoryIds', 'Sélectionnez de 1 à 500 frises.');
  return { multiple, ids: [...new Set(raw.map(id => parseStoryId(id, 'childStoryIds')))].sort(), anchor: body.anchor === undefined ? undefined : parseAnchor(body.anchor) };
}

/** Importance d'un événement dans une frise : majeur, normal ou détail. */
export function parseEventImportance(value: unknown): EventImportance {
  if (!EVENT_IMPORTANCES.includes(value as EventImportance)) throw new InputValidationError('importance', 'importance doit être major, normal ou minor.');
  return value as EventImportance;
}

export function parseAssociationOperation(value: unknown): 'add' | 'remove' {
  if (value !== 'add' && value !== 'remove') throw new InputValidationError('operation', 'operation doit être add ou remove.');
  return value;
}

export function parseSearchText(value: unknown, field: string, max = 500): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new InputValidationError(field, `${field} doit être un texte unique.`);
  return text(value, field, max) ?? '';
}

export function parseCsvIds(value: unknown, field: string): string[] {
  const raw = parseSearchText(value, field, 100500);
  const ids = raw ? raw.split(',').map(id => parseEntityId(id, field)) : [];
  if (ids.length > 500) throw new InputValidationError(field, `${field} ne peut pas dépasser 500 identifiants.`);
  return [...new Set(ids)];
}

/** Null explicitly detaches; omission must never silently detach a period. */
export function parseParentId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim()) {
    throw new PeriodHierarchyError(400, 'parent_id doit être un identifiant non vide ou null.');
  }
  return parseEntityId(value, 'parent_id');
}


/** Bound each transaction and use a deterministic order for locks and parameters. */
export function parseAssociationIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 500 || value.some(id => typeof id !== 'string' || !id.trim() || id.length > 200)) {
    throw new StoryAssociationError(400, 'ids doit contenir de 1 à 500 identifiants non vides.');
  }
  return [...new Set(value.map(id => parseEntityId(id, 'ids')))].sort();
}


export function parseSearchScope(value: unknown): '' | 'period' | 'periods' | 'event' | 'events' {
  const only = parseSearchText(value, 'only', 20).toLowerCase();
  if (only !== '' && only !== 'period' && only !== 'periods' && only !== 'event' && only !== 'events') {
    throw new InputValidationError('only', 'only doit être periods ou events.');
  }
  return only;
}

/** A frise created from a period: the period to start from and the new title. */
export function parseStoryFromPeriod(value: unknown) {
  const body = inputObject(value);
  return { periodId: parseEntityId(body.periodId, 'periodId'), title: text(body.title, 'title', 300, true)! };
}

export function parseUsername(value: unknown, field = 'username'): string {
  const name = text(value, field, USERNAME_MAX * 2, true)!;
  const problem = usernameError(name);
  if (problem) throw new InputValidationError(field, problem);
  return name.trim();
}

export function parseProfileWrite(value: unknown) {
  const body = inputObject(value);
  if (!isAvatarColor(body.avatarColor)) throw new InputValidationError('avatarColor', 'Couleur d’avatar inconnue.');
  if (!isAvatarIcon(body.avatarIcon)) throw new InputValidationError('avatarIcon', 'Icône d’avatar inconnue.');
  return { username: parseUsername(body.username), avatarColor: body.avatarColor, avatarIcon: body.avatarIcon };
}

export function parseTermsAcceptance(value: unknown): string {
  return text(inputObject(value).version, 'version', 32, true)!;
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function parseUserId(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new InputValidationError(field, 'Identifiant de compte invalide.');
  return value.toLowerCase();
}

/** Body `{ [field]: boolean }` for the admin switches (role, suspension). */
export function parseFlag(value: unknown, field: string): boolean {
  const flag = inputObject(value)[field];
  if (typeof flag !== 'boolean') throw new InputValidationError(field, `${field} doit valoir true ou false.`);
  return flag;
}
