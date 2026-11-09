import { comparableYearsBeforePresent } from '@temporal';
import { periodCoordinates } from '@/services/TimelineScalingService';
import { storyChildrenOf } from '@/lib/homeStoryPeriodNav';
import { linkedStoryPreviewPeriods, type LinkedStoryPeriod } from '@/lib/linkedStoryPeriods';
import type { ListEvent, ListPeriod, Story, StorySummary } from '@/types/database';

/**
 * Comparaison de deux frises sur une même échelle : la frise qui mène fixe le cadre affiché,
 * l’autre le suit. Module pur ; les coordonnées sont relues à l’instant `now` fourni.
 */
export interface ScaleFrame { startYearsBP: number; endYearsBP: number }

/** Périodes natives et frises « affichées comme période » d’un niveau, comme la timeline les montre. */
export function storyLevel(story: Story, parentId: string | null, summaries: StorySummary[]) {
  const linked = linkedStoryPreviewPeriods(story, summaries).filter(period => period.storyParentId === parentId);
  return { periods: storyChildrenOf(parentId, story.periods), linked };
}

function bounds(period: ListPeriod, now: number) {
  const { start, end } = periodCoordinates(period, now);
  return start === null || end === null ? null : { start, end };
}
const crosses = (period: ListPeriod, frame: ScaleFrame, now: number) => {
  const dates = bounds(period, now);
  return !!dates && dates.start > frame.endYearsBP && dates.end < frame.startYearsBP;
};
const contains = (period: ListPeriod, frame: ScaleFrame, now: number) => {
  const dates = bounds(period, now);
  return !!dates && dates.start >= frame.startYearsBP && dates.end <= frame.endYearsBP;
};

export interface FollowedLevel { ancestors: ListPeriod[]; periods: ListPeriod[]; linked: LinkedStoryPeriod[] }

/**
 * La frise qui suit n’a pas de position propre : elle descend tant qu’une seule période native du
 * niveau contient tout le cadre, puis montre les périodes de ce niveau qui le croisent.
 */
export function followLevel(story: Story, frame: ScaleFrame, summaries: StorySummary[], now: number): FollowedLevel {
  const ancestors: ListPeriod[] = [];
  let parentId: string | null = null;
  for (let depth = 0; depth < 32; depth++) {
    const level = storyLevel(story, parentId, summaries);
    const periods = level.periods.filter(period => crosses(period, frame, now));
    const linked = level.linked.filter(period => crosses(period, frame, now));
    const container = periods.length === 1 && !linked.length && contains(periods[0], frame, now) ? periods[0] : null;
    const deeper = container ? storyLevel(story, container.id, summaries) : null;
    if (!container || !deeper || ![...deeper.periods, ...deeper.linked].some(period => crosses(period, frame, now))) return { ancestors, periods, linked };
    ancestors.push(container);
    parentId = container.id;
  }
  return { ancestors, periods: [], linked: [] };
}

/** Seuls les événements de la frise situés dans le cadre : au-delà, la grille les tasserait sur ses bords. */
export const eventsInFrame = (events: ListEvent[], frame: ScaleFrame, now: number) => events.filter(event => {
  const bp = comparableYearsBeforePresent(event.date, event.dateYearsBP, now);
  return bp !== null && bp <= frame.startYearsBP && bp >= frame.endYearsBP;
});

/** Une frise datée hors cadre n’est pas vide ; ne pas confondre avec des dates inconnues. */
export function storyOutsideFrame(story: Story, frame: ScaleFrame, summaries: StorySummary[], now: number): boolean {
  const periods = [...story.periods, ...linkedStoryPreviewPeriods(story, summaries)];
  const datedPeriods = periods.filter(period => bounds(period, now) !== null);
  const datedEvents = story.events.filter(event => comparableYearsBeforePresent(event.date, event.dateYearsBP, now) !== null);
  return (datedPeriods.length > 0 || datedEvents.length > 0)
    && !datedPeriods.some(period => crosses(period, frame, now))
    && eventsInFrame(datedEvents, frame, now).length === 0;
}

/** Événements présents dans les deux frises : même fiche du catalogue, donc même date sur l’échelle partagée. */
export function sharedEventIds(a: ListEvent[], b: ListEvent[]): string[] {
  const other = new Set(b.map(event => event.id));
  return a.filter(event => other.has(event.id)).map(event => event.id);
}
