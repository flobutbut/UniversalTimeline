import type { Event, Period } from '@/types/database';
import { collectStoryPeriodSubtreeIds } from '@/lib/storyPeriodFinderColumns';
import { comparableYearsBeforePresent } from '@temporal';
import { formatPeriodDateRange } from '@/lib/formatTemporalBoundLabel';

export interface StoryFromPeriodPreview {
  periodId: string;
  label: string;
  rangeLabel: string;
  /** Période choisie comprise. */
  periodCount: number;
  eventCount: number;
  datesKnown: boolean;
}

/** Aperçu de la copie, mêmes règles que le serveur, qui reste seul à décider. */
export function previewStoryFromPeriod(periods: Period[], events: Event[], periodId: string): StoryFromPeriodPreview | null {
  const period = periods.find(item => item.id === periodId);
  if (!period) return null;
  // One reference instant, as on the server: a same-day event must not drift outside the bounds.
  const now = Date.now();
  const start = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
  const end = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
  const datesKnown = start !== null && end !== null && start >= end;
  const eventCount = datesKnown
    ? events.filter(event => { const bp = comparableYearsBeforePresent(event.date, event.dateYearsBP, now); return bp !== null && bp <= start && bp >= end; }).length
    : 0;
  return {
    periodId, label: period.label.fr || period.label.en || periodId, rangeLabel: formatPeriodDateRange(period),
    periodCount: collectStoryPeriodSubtreeIds(periods, periodId).length, eventCount, datesKnown,
  };
}
