import { formatTemporalBoundLabel } from '@/lib/formatTemporalBoundLabel';
import type { StoryPeriodInput } from '@/types/periodTree';

/** Libellé « début → fin » pour une entrée période (champs camelCase ou snake_case). */
export function formatPeriodTreeItemDates(item: StoryPeriodInput): string {
  const start = item.startDate ?? item.start_date;
  const end = item.endDate ?? item.end_date;
  if (!start && !end) return '—';
  return `${start ? formatTemporalBoundLabel(start) : '—'} → ${end ? formatTemporalBoundLabel(end) : '—'}`;
}
