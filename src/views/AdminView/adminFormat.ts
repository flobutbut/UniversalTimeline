const dateFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat('fr');

/** Absent or unreadable dates show a dash, never "Invalid Date" or the epoch. */
export function formatAdminDate(value: string | null | undefined, withTime = false): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? (withTime ? dateTimeFormat : dateFormat).format(date) : '—';
}

export const formatCount = (value: number) => numberFormat.format(value);

/** Share as a whole percentage; an empty total has no meaningful share. */
export function formatShare(part: number, total: number): string {
  return total > 0 ? `${Math.round(part / total * 100)} %` : '—';
}
