import { DateService } from '@/services/DateService';

function positiveYearsBpFromUnknown(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return n > 0 ? n : undefined;
}

/** Borne temporelle en années BP pour une période « story » (API snake_case ou camelCase). */
export function getStoryPeriodBoundaryYearsBP(p: Record<string, unknown>, field: 'start' | 'end'): number {
  if (field === 'start') {
    const v = positiveYearsBpFromUnknown(p.start_years_bp ?? p.startYearsBP);
    if (v != null) return v;
    return DateService.toYearsBP(String(p.start_date ?? p.startDate ?? ''));
  }
  const v = positiveYearsBpFromUnknown(p.end_years_bp ?? p.endYearsBP);
  if (v != null) return v;
  const raw = String(p.end_date ?? p.endDate ?? '');
  if (!raw || raw === 'NOW' || raw === 'TODAY') return 0;
  return DateService.toYearsBP(raw);
}
