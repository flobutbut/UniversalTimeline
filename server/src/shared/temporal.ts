/** Pure shared domain: no browser, Node, database or application dependencies.
 * BP follows the application's historical convention: years before the supplied
 * present (365.25 days/year), not the scientific epoch 1950. Future dates are negative.
 * Calendar years use ISO astronomical numbering, including year zero.
 */
export const MS_PER_YEAR = 365.25 * 86400000;
export type DatePrecision = 'Ga' | 'Ma' | 'ka' | 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
interface TemporalBase { raw: string; precision: DatePrecision; calendarDate?: Date }
export type NormalizedDate = TemporalBase & (
  | { kind: 'unknown'; yearsBeforePresent: null; isCurrent: false; reason: 'missing' | 'unrecognized' | 'invalid' }
  | { kind: 'age' | 'calendar' | 'current'; yearsBeforePresent: number; isCurrent: boolean }
);
const units = { G: 1e9, M: 1e6, K: 1e3, A: 1 } as const;
const months = [
  ['janvier','january'], ['février','fevrier','february'], ['mars','march'], ['avril','april'],
  ['mai','may'], ['juin','june'], ['juillet','july'], ['août','aout','august'],
  ['septembre','september'], ['octobre','october'], ['novembre','november'], ['décembre','decembre','december'],
];
function unknown(raw: string, reason: 'missing' | 'unrecognized' | 'invalid'): NormalizedDate {
  return { raw, kind: 'unknown', yearsBeforePresent: null, isCurrent: false, precision: 'year', reason };
}
function age(raw: string, value: number, precision: DatePrecision): NormalizedDate {
  return Number.isFinite(value) && value >= 0
    ? { raw, kind: 'age', yearsBeforePresent: value, precision, isCurrent: false }
    : unknown(raw, 'invalid');
}
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
// Proleptic Gregorian day count works beyond the range of ECMAScript Date.
function daysBeforeYear(year: number): number {
  const previous = year - 1;
  return 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400);
}
function calendar(raw: string, year: number, month: number, day: number, hour: number, minute: number, second: number, fraction: number, offset: number, precision: DatePrecision, now: number): NormalizedDate {
  const lengths = [31, leap(year) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
  if (!Number.isSafeInteger(year) || month < 1 || month > 12 || day < 1 || day > lengths[month - 1]
      || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(now)) return unknown(raw, 'invalid');
  const days = daysBeforeYear(year) - daysBeforeYear(1970) + lengths.slice(0, month - 1).reduce((sum, value) => sum + value, 0) + day - 1;
  const timestamp = days * 86400000 + ((hour * 60 + minute - offset) * 60 + second + fraction) * 1000;
  const withinDateRange = Math.abs(timestamp) <= 8640000000000000;
  // Wikidata's billion-year coordinates carry an approximate year, not an exact civil instant.
  const yearsBeforePresent = withinDateRange ? (now - timestamp) / MS_PER_YEAR : new Date(now).getUTCFullYear() - year;
  if (!Number.isFinite(yearsBeforePresent)) return unknown(raw, 'invalid');
  const date = new Date(timestamp);
  return {
    raw, kind: 'calendar', yearsBeforePresent, precision, isCurrent: false,
    ...(Number.isFinite(date.getTime()) ? { calendarDate: date } : {}),
  };
}
export function parseTemporal(input: string | null | undefined, now = Date.now()): NormalizedDate {
  const raw = input?.trim() ?? '';
  if (!raw) return unknown(raw, 'missing');
  if (/^(NOW|TODAY)$/i.test(raw)) return { raw, kind: 'current', yearsBeforePresent: 0, precision: 'year', isCurrent: true };
  const canonical = raw.match(/^([GMKA])(\d+(?:\.\d+)?)$/i);
  if (canonical) {
    const unit = canonical[1].toUpperCase() as keyof typeof units;
    return age(raw, Number(canonical[2]) * units[unit], unit === 'G' ? 'Ga' : unit === 'M' ? 'Ma' : unit === 'K' ? 'ka' : 'year');
  }
  const geological = raw.match(/^(\d+(?:[.,]\d+)?)\s*(Ga|Ma|ka|ans?|years?)\s*(?:ago|avant|BP)?$/i);
  if (geological) {
    const unit = geological[2].toLowerCase();
    const scale = unit === 'ga' ? 1e9 : unit === 'ma' ? 1e6 : unit === 'ka' ? 1e3 : 1;
    return age(raw, Number(geological[1].replace(',', '.')) * scale, scale === 1e9 ? 'Ga' : scale === 1e6 ? 'Ma' : scale === 1e3 ? 'ka' : 'year');
  }
  const encoded = raw.match(/^([GHM])([+-])(\d+)Y[0-8]$/);
  if (encoded) {
    const value = Number(encoded[3]);
    if (encoded[1] === 'G') return age(raw, value, value >= 1e9 ? 'Ga' : value >= 1e6 ? 'Ma' : value >= 1e3 ? 'ka' : 'year');
    return calendar(raw, encoded[2] === '-' ? -value : value, 1,1,0,0,0,0,0,'year',now);
  }
  const bce = raw.match(/^(\d+)\s*(?:BCE|BC|avant J\.?-?C\.?)$/i);
  if (bce) return Number(bce[1]) > 0 ? calendar(raw, 1 - Number(bce[1]), 1,1,0,0,0,0,0,'year',now) : unknown(raw, 'invalid');
  const signedYear = raw.match(/^-(\d+)$/);
  if (signedYear) return calendar(raw, -Number(signedYear[1]), 1,1,0,0,0,0,0,'year',now);
  // A Wikibase JSON time may have unspecified fields. Without its precision and
  // calendar metadata, preserve it as text instead of fabricating January 1.
  if (/^[+-]\d{4,}-(?:00-\d{2}|\d{2}-00)T00:00:00Z$/i.test(raw)) return unknown(raw, 'unrecognized');
  // UTC is explicit for timezone-less historical timestamps, irrespective of host locale.
  const iso = raw.match(/^([+-]?\d{4,})-(\d{2})(?:-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?)?$/i);
  if (iso) {
    const zone = iso[8]; let offset = 0;
    if (zone && zone.toUpperCase() !== 'Z') {
      const [h,m] = zone.slice(1).replace(':','').padEnd(4,'0').match(/\d{2}/g)!.map(Number);
      if (h > 23 || m > 59) return unknown(raw, 'invalid');
      offset = (h * 60 + m) * (zone[0] === '-' ? -1 : 1);
    }
    const precision = iso[6] !== undefined ? 'second' : iso[5] !== undefined ? 'minute' : iso[4] !== undefined ? 'hour' : iso[3] !== undefined ? 'day' : 'month';
    return calendar(raw, Number(iso[1]), Number(iso[2]), Number(iso[3] ?? 1), Number(iso[4] ?? 0), Number(iso[5] ?? 0), Number(iso[6] ?? 0), Number(`0.${iso[7] ?? '0'}`), offset, precision, now);
  }
  const year = raw.match(/^\+?(\d{4,})$/);
  if (year) return calendar(raw, Number(year[1]), 1,1,0,0,0,0,0,'year',now);
  const numericFrench = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (numericFrench) return calendar(raw, Number(numericFrench[3]), Number(numericFrench[2]), Number(numericFrench[1]),0,0,0,0,0,'day',now);
  const french = raw.match(/^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u);
  const english = raw.match(/^([\p{L}]+)\s+(\d{1,2}),?\s+(\d{4})$/u);
  if (french || english) {
    const name = (french?.[2] ?? english![1]).toLowerCase();
    const month = months.findIndex(names => names.includes(name)) + 1;
    if (month) return calendar(raw, Number(french?.[3] ?? english![3]), month, Number(french?.[1] ?? english![2]),0,0,0,0,0,'day',now);
  }
  if (/^[+-]?\d{4,}-\d/.test(raw)) return unknown(raw, 'invalid');
  return unknown(raw, 'unrecognized');
}
export function yearsBeforePresent(input: string | null | undefined, now = Date.now()): number | null {
  return parseTemporal(input, now).yearsBeforePresent;
}
/** Existing numerical bounds remain authoritative for imported records. Explicitly
 * unrecognized/impossible text is never interpreted as the present, even with a default 0.
 */
export function resolveYearsBeforePresent(raw: string | null | undefined, stored: unknown, now = Date.now()): number | null {
  const parsed = parseTemporal(raw, now);
  if (parsed.kind === 'current') return 0;
  if (raw?.trim() && parsed.kind === 'unknown') return null;
  if ((typeof stored === 'number' || typeof stored === 'string') && String(stored).trim() !== '') {
    const value = Number(stored);
    if (Number.isFinite(value)) return value;
  }
  return parsed.yearsBeforePresent;
}
/** For comparing two items at one reference instant: a recognized text is re-read at `now`
 * (stored coordinates were computed at different times); the stored number is used only when
 * the text is missing. Unrecognized text stays unknown, as in resolveYearsBeforePresent.
 */
export function comparableYearsBeforePresent(raw: string | null | undefined, stored: unknown, now: number): number | null {
  const parsed = parseTemporal(raw, now);
  if (parsed.kind !== 'unknown') return parsed.yearsBeforePresent;
  return raw?.trim() ? null : resolveYearsBeforePresent(raw, stored, now);
}
/** Unknown text is retained; a recognized but impossible date or reversed known range is rejected. */
export function periodDateErrors(start: string, end: string, now = Date.now()): { start?: string; end?: string } {
  const a = parseTemporal(start, now), b = parseTemporal(end, now);
  if (a.kind === 'unknown' && a.reason === 'invalid') return { start: 'La date de début est invalide.' };
  if (b.kind === 'unknown' && b.reason === 'invalid') return { end: 'La date de fin est invalide.' };
  if (a.yearsBeforePresent !== null && b.yearsBeforePresent !== null && a.yearsBeforePresent <= b.yearsBeforePresent) {
    return { end: 'La date de début doit être antérieure à la date de fin.' };
  }
  return {};
}
export interface TemporalCandidate {
  start_date: string | null; end_date: string | null;
  start_years_bp?: string | number | null; end_years_bp?: string | number | null;
}
/** Linear aggregation: parse once per bound, with a single reference instant for the whole result. */
export function temporalBounds(rows: readonly TemporalCandidate[], now = Date.now()): { start: string | null; end: string | null } {
  let start: string | null = null, end: string | null = null, oldest = -Infinity, newest = Infinity;
  for (const row of rows) {
    const a = resolveYearsBeforePresent(row.start_date, row.start_years_bp, now);
    const b = resolveYearsBeforePresent(row.end_date, row.end_years_bp, now);
    if (a !== null && a > oldest && row.start_date?.trim()) { oldest = a; start = row.start_date; }
    if (b !== null && b < newest && row.end_date?.trim()) { newest = b; end = row.end_date; }
  }
  return { start, end };
}
export function compareYearsOldestFirst(a: number | null, b: number | null): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return b - a;
}
