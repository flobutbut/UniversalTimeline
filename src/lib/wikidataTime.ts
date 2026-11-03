import { parseTemporal } from '@temporal';

const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727';
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';

/**
 * The Wikibase JSON API writes 1 BC as year -1 (no year 0) and keeps Julian days as written.
 * SPARQL (XSD) uses astronomical years (1 BC = 0) and converts Julian days to Gregorian.
 */
export type WikibaseYearNumbering = 'historical' | 'astronomical';
export interface WikibaseTime { time: string; precision?: number; calendarmodel?: string; before?: number; after?: number }

const pad = (year: number) => `${year < 0 ? '-' : ''}${String(Math.abs(year)).padStart(4, '0')}`;
const trim = (value: number) => String(Number(value.toFixed(6)));

function age(years: number): string {
  if (years >= 1e9) return `G${trim(years / 1e9)}`;
  if (years >= 1e6) return `M${trim(years / 1e6)}`;
  return years >= 1e3 ? `K${trim(years / 1e3)}` : '';
}

/** Proleptic Gregorian → Julian calendar day, both with astronomical years. */
function gregorianToJulian(year: number, month: number, day: number): [number, number, number] {
  const a = Math.floor((14 - month) / 12), y = year + 4800 - a, m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const c = jdn + 32082, d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), n = Math.floor((5 * e + 2) / 153);
  return [d - 4800 + Math.floor(n / 10), n + 3 - 12 * Math.floor(n / 10), e - Math.floor((153 * n + 2) / 5) + 1];
}

/**
 * Canonical app date for a Wikibase time, or '' when it needs a human review.
 * Years become `N BCE` / `AAAA`, days BC use astronomical ISO, deep time uses K/M/G; no time of day is added.
 * Julian days keep their written form (historians' convention, also used by the stored dates).
 */
export function wikibaseTimeToTemporal(value: WikibaseTime, numbering: WikibaseYearNumbering): string {
  const match = /^([+-]?)(\d+)-(\d{2})-(\d{2})T/.exec(value.time);
  if (!match) return '';
  if ((value.before ?? 0) !== 0 || (value.after ?? 0) !== 0) return '';
  if (value.calendarmodel && value.calendarmodel !== GREGORIAN && value.calendarmodel !== JULIAN) return '';
  const [, sign, digits, month, day] = match;
  const precision = value.precision ?? (month === '00' ? 9 : day === '00' ? 10 : 11);
  const magnitude = Number(digits);
  const beforeChrist = sign === '-' && magnitude > 0;
  // At this scale the year numbering and the distance to the present year are negligible.
  if (precision <= 5 || (beforeChrist && magnitude >= 1e5)) return beforeChrist ? age(magnitude) : '';
  // Decades, centuries and millennia have no reliable bound year.
  if (precision < 9) return '';
  if (numbering === 'historical' && magnitude === 0) return '';
  let year = beforeChrist ? (numbering === 'historical' ? 1 - magnitude : -magnitude) : magnitude;
  let date: string;
  if (precision === 9) date = year <= 0 ? `${1 - year} BCE` : pad(year);
  else if (precision === 10) date = `${pad(year)}-${month}`;
  else {
    let [m, d] = [Number(month), Number(day)];
    if (numbering === 'astronomical' && value.calendarmodel === JULIAN) [year, m, d] = gregorianToJulian(year, m, d);
    date = `${pad(year)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return parseTemporal(date).kind === 'unknown' ? '' : date;
}
