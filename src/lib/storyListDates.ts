import { language } from '@/i18n';
import { formatStoryListTemporalBound } from '@/lib/formatTemporalBoundLabel';

/** Bornes historiques d'une frise de la liste : « 1760 – 1840 », borne inconnue → « ? ». */
export function formatStorySpan(story: { startDate?: string; endDate?: string }): string {
  const start = formatStoryListTemporalBound(story.startDate);
  const end = formatStoryListTemporalBound(story.endDate);
  if (!start && !end) return 'Dates non déterminées';
  return `${start ?? '?'} – ${end ?? '?'}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60],
];

/** Horodatage technique (création/modification), relatif à `now` : « Il y a 6 heures ». Absent → tiret. */
export function formatRecordAge(date: Date | undefined, now: number): string {
  if (!date) return '—';
  const seconds = Math.round((date.getTime() - now) / 1000);
  const [unit, size] = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? ['second', 1];
  const label = new Intl.RelativeTimeFormat(language.value, { numeric: 'auto' }).format(Math.round(seconds / size), unit);
  return label.charAt(0).toLocaleUpperCase(language.value) + label.slice(1);
}

/** Date de création d'un enregistrement : « 12 décembre 2022 ». Absente → tiret. */
export function formatRecordDate(date: Date | undefined): string {
  return date ? new Intl.DateTimeFormat(language.value, { dateStyle: 'long' }).format(date) : '—';
}
