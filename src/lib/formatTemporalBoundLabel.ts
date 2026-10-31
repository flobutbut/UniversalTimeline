import { DateService } from '@/services/DateService';

function formatBoundParsed(s: string): string {
  return DateService.formatBound(DateService.parse(s));
}

/** Missing bound stays unknown; explicit NOW/TODAY is formatted as the present. */
export function formatTemporalBoundLabel(raw: string | undefined): string {
  if (!raw?.trim()) return '—';
  return formatBoundParsed(raw);
}

/** Intervalle complet partagé par les cartes de période et leurs infobulles. */
export function formatPeriodDateRange(period: { startDate?: string; endDate?: string }): string {
  const start = period.startDate ? formatTemporalBoundLabel(period.startDate) : null;
  const end = period.endDate ? formatTemporalBoundLabel(period.endDate) : null;
  if (start && end) return `de ${start} à ${end}`;
  if (start) return `à partir de ${start}`;
  if (end) return `jusqu'à ${end}`;
  return '';
}

/** Recherche locale : absence de date → chaîne vide ; sinon formatBound (NOW/TODAY suivent le parseur). */
export function formatSearchResultDateBound(raw?: string): string {
  if (!raw) return '';
  return formatBoundParsed(raw);
}

/** Liste stories : absence → null ; TODAY (insensible à la casse) / NOW → « aujourd'hui ». */
export function formatStoryListTemporalBound(raw: string | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const t = String(raw).trim();
  if (t.toUpperCase() === 'TODAY' || t === 'NOW') return "aujourd'hui";
  return formatBoundParsed(t);
}

/** Sous-titre d'intervalle pour un onglet story (liste). */
export function formatStoryListDateRangeSublabel(s: {
  startDate?: string;
  endDate?: string;
}): string {
  const a = formatStoryListTemporalBound(s.startDate);
  const b = formatStoryListTemporalBound(s.endDate);
  if (!a && !b) return '—';
  if (a && b) return `de ${a} à ${b}`;
  if (a) return `à partir de ${a}`;
  return `jusqu'à ${b}`;
}

/** Libellé date d'un événement dans le panneau story (absence → tiret cadratin). */
export function formatStoryEventDateLabel(event: { date?: string }): string {
  const d = event.date ?? '';
  if (!d) return '—';
  return formatTemporalBoundLabel(d);
}
