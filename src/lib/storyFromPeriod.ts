import { localizedText } from '@/i18n';
import type { Event, Period, Story } from '@/types/database';
import { collectStoryPeriodSubtreeIds } from '@/lib/storyPeriodFinderColumns';
import { comparableYearsBeforePresent } from '@temporal';
import { formatPeriodDateRange } from '@/lib/formatTemporalBoundLabel';

export interface StoryFromPeriodPreview {
  periodId: string;
  label: string;
  rangeLabel: string;
  /** Période choisie comprise. */
  periodCount: number;
  /** Sous-périodes qui quittent la frise actuelle. */
  movedPeriodCount: number;
  /** Frises reliées à ces sous-périodes (ancres, points d’entrée, parcours), qui suivent le déplacement. */
  linkedStoryCount: number;
  eventCount: number;
  datesKnown: boolean;
}
type StoryLinks = Pick<Story, 'id' | 'childStories' | 'navigationContexts'>;

/** Frises liées aux périodes déplacées, comme le serveur les transfère. */
export function linkedStoryIds(story: StoryLinks, movedIds: readonly string[]): string[] {
  const moved = new Set(movedIds);
  const linked = new Set<string>();
  for (const child of story.childStories ?? []) if (child.anchors.some(anchor => anchor.type === 'period' && moved.has(anchor.id))) linked.add(child.id);
  for (const context of story.navigationContexts ?? []) for (const view of context.presentations) {
    if (!moved.has(view.periodId)) continue;
    if (context.id === story.id && view.storyId !== story.id) linked.add(view.storyId);
    if (view.storyId === story.id && context.id !== story.id) linked.add(context.id);
  }
  return [...linked].sort();
}

/** Aperçu de la création, mêmes règles que le serveur, qui reste seul à décider. */
export function previewStoryFromPeriod(periods: Period[], events: Event[], periodId: string, story?: StoryLinks): StoryFromPeriodPreview | null {
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
  const subtree = collectStoryPeriodSubtreeIds(periods, periodId);
  const moved = subtree.filter(id => id !== periodId);
  return {
    periodId, label: localizedText(period.label) || periodId, rangeLabel: formatPeriodDateRange(period),
    periodCount: subtree.length, movedPeriodCount: moved.length, linkedStoryCount: story ? linkedStoryIds(story, moved).length : 0, eventCount, datesKnown,
  };
}
