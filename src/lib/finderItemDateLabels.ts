import { DateService } from '@/services/DateService';

/** Borne pour sous-titre finder : vide → null ; NOW/TODAY → « aujourd'hui ». */
export function formatFinderItemBoundLabel(raw: string | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const t = String(raw).trim();
  if (t.toUpperCase() === 'TODAY' || t === 'NOW') return "aujourd'hui";
  return DateService.formatBound(DateService.parse(t));
}

/** Texte sous-titre « de … à … » / borne unique / tiret. */
export function formatFinderItemDateRangeSubtitle(start?: string, end?: string): string {
  const s = formatFinderItemBoundLabel(start);
  const e = formatFinderItemBoundLabel(end);
  if (!s && !e) return '—';
  if (s && e) return `de ${s} à ${e}`;
  if (s) return `à partir de ${s}`;
  return `jusqu'à ${e}`;
}
