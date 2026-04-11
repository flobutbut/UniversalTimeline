import { DateService } from '@/services/DateService';

/** Borne formatée pour la timeline story (parse + formatBound, sans alias NOW/TODAY). */
export function formatStoryTimelineBoundLabel(raw: string): string {
  return DateService.formatBound(DateService.parse(raw));
}

/** Texte détail période pour tooltip (intervalle ou borne unique). */
export function formatStoryTimelinePeriodDetail(p: { startDate?: string; endDate?: string }): string {
  const s = p.startDate ? formatStoryTimelineBoundLabel(p.startDate) : null;
  const e = p.endDate ? formatStoryTimelineBoundLabel(p.endDate) : null;
  if (s && e) return `${s} → ${e}`;
  if (s) return `à partir de ${s}`;
  if (e) return `jusqu'à ${e}`;
  return '';
}
