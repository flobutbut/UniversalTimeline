import { parseTemporal } from '@temporal';

const paddedYear = (year: number) => `${year < 0 ? '-' : ''}${String(Math.abs(year)).padStart(4, '0')}`;
function decimal(raw: string) {
  const [whole, fraction = ''] = raw.replace(',', '.').split('.');
  const tail = fraction.replace(/0+$/, '');
  return `${whole.replace(/^0+(?=\d)/, '')}${tail ? `.${tail}` : ''}`;
}

/** Canonical editing text; never invent missing precision or reinterpret unknown input. */
export function normalizeDateInput(input: string): string {
  const parsed = parseTemporal(input);
  if (parsed.kind === 'unknown') return input;
  if (parsed.kind === 'current') return 'NOW';
  if (parsed.kind === 'age') {
    const canonical = /^([GMKA])(\d+(?:\.\d+)?)$/i.exec(parsed.raw);
    if (canonical) return `${canonical[1].toUpperCase()}${decimal(canonical[2])}`;
    const geological = /^(\d+(?:[.,]\d+)?)\s*(Ga|Ma|ka|ans?|years?)\s*(?:ago|avant|BP)?$/i.exec(parsed.raw);
    if (geological) {
      const prefix = ({ ga: 'G', ma: 'M', ka: 'K' } as Record<string, string>)[geological[2].toLowerCase()] || 'A';
      return `${prefix}${decimal(geological[1])}`;
    }
    // Legacy encodings may carry additional precision: retain their original notation.
    return parsed.raw;
  }

  if (['hour', 'minute', 'second'].includes(parsed.precision)) {
    // Keep the original offset and all fractional digits, including sub-milliseconds.
    const timestamp = /^([+-]?\d{4,})-(\d{2})-(\d{2})[T ](.+)$/i.exec(parsed.raw);
    if (!timestamp) return parsed.raw;
    const time = timestamp[4];
    const zone = /(Z|[+-]\d{2}(?::?\d{2})?)$/i.exec(time)?.[1];
    const clock = zone ? time.slice(0, -zone.length) : time;
    const digits = zone && zone.toUpperCase() !== 'Z' ? zone.slice(1).replace(':', '').padEnd(4, '0') : null;
    const offset = digits ? `${zone![0]}${digits.slice(0, 2)}:${digits.slice(2)}` : 'Z';
    return `${paddedYear(Number(timestamp[1]))}-${timestamp[2]}-${timestamp[3]}T${clock}${offset}`;
  }

  const date = parsed.calendarDate;
  if (!date) return parsed.raw; // Very ancient years outside the Date range stay untouched.
  const year = paddedYear(date.getUTCFullYear());
  if (parsed.precision === 'year') return year;
  const month = `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return parsed.precision === 'month' ? month : `${month}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
