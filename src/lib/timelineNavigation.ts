import { localizedText } from '@/i18n';
import { comparableYearsBeforePresent, compareYearsOldestFirst } from '@temporal';
import type { ListEvent, ListPeriod, NavigationContext, StoryAnchor } from '@/types/database';
import { storyChildrenOf } from './homeStoryPeriodNav';
import { getStoryPeriodParentId } from './storyPeriodParent';

export interface TimelinePosition { storyId: string; periodId?: string; contextId?: string; referencePeriodId?: string; view?: 'overview'; eventId?: string }
/** Exact source position and clicked location. Stored in browser history, never as catalogue content. */
export interface TimelineReturnFrame extends TimelinePosition { anchor?: StoryAnchor; anchorStoryId?: string }
export interface TimelineTarget extends TimelinePosition { entry?: 'universe'; returnPath?: TimelineReturnFrame[] }

/**
 * Periods to enter so an event shows among its neighbours: the deepest chain that contains its
 * date, stopping before leaf periods. Empty for an undated event or one outside every period.
 */
export function eventPeriodPath(periods: ListPeriod[], event: ListEvent, now: number): ListPeriod[] {
  const years = comparableYearsBeforePresent(event.date, event.dateYearsBP, now);
  if (years === null) return [];
  const path: ListPeriod[] = [];
  const seen = new Set<string>();
  const contains = (period: ListPeriod) => {
    const start = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
    const end = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
    return start !== null && end !== null && years <= start && years >= end;
  };
  for (;;) {
    const next = storyChildrenOf(path[path.length - 1]?.id ?? null, periods)
      .find(period => !seen.has(period.id) && storyChildrenOf(period.id, periods).length > 0 && contains(period));
    if (!next) return path;
    seen.add(next.id);
    path.push(next);
  }
}

/** Full path in this frise, including leaves; invalid paths cannot become navigation targets. */
export function timelinePeriodPath<T extends { id: string; storyParentId?: string | null; parentId?: string | null }>(periods: T[], id: string): T[] | null {
  const byId = new Map(periods.map(p => [p.id, p]));
  const seen = new Set<string>();
  const path: T[] = [];
  let period = byId.get(id);
  if (!period) return null;
  while (period) {
    if (seen.has(period.id)) return null;
    seen.add(period.id); path.unshift(period);
    const parentId = getStoryPeriodParentId(period);
    if (parentId && !byId.has(parentId)) return null;
    period = parentId ? byId.get(parentId) : undefined;
  }
  return path;
}

export function timelineLevel(periods: ListPeriod[], depth: number, now = Date.now()) {
  let level = storyChildrenOf(null, periods).map(period => ({ period, stack: [] as ListPeriod[] }));
  for (let index = 0; index < depth; index++) level = level.flatMap(({ period, stack }) => storyChildrenOf(period.id, periods)
    .map(child => ({ period: child, stack: [...stack, period] })));
  return level.flatMap(entry => {
    const start = comparableYearsBeforePresent(entry.period.startDate, entry.period.startYearsBP, now);
    const end = comparableYearsBeforePresent(entry.period.endDate, entry.period.endYearsBP, now);
    return start === null ? [] : [{ ...entry, start, end }];
  }).sort((a,b) => compareYearsOldestFirst(a.start, b.start) || a.period.id.localeCompare(b.period.id));
}

/**
 * Voisins chronologiques d'un niveau trié par début : une période contenue ou simultanée
 * (même fin) n'est pas une suite. Un chevauchement partiel entre phases reste accepté.
 */
export function levelNeighbors<T extends { period: ListPeriod; end: number | null }>(ordered: T[], periodId: string) {
  const index = ordered.findIndex(entry => entry.period.id === periodId);
  if (index < 0) return { previous: null, next: null };
  const end = ordered[index].end;
  const endsBefore = (entry: T) => end === null || entry.end === null || compareYearsOldestFirst(entry.end, end) < 0;
  const endsAfter = (entry: T) => end === null || entry.end === null || compareYearsOldestFirst(entry.end, end) > 0;
  return {
    previous: ordered.slice(0, index).reverse().find(endsBefore) ?? null,
    next: ordered.slice(index + 1).find(endsAfter) ?? null,
  };
}

/** The context defines the peers; ordinary entry points never select a detail view. */
export function contextPeriodNeighbors(context: NavigationContext, periodId: string) {
  const path = timelinePeriodPath(context.periods, periodId);
  return levelNeighbors(path ? timelineLevel(context.periods, path.length - 1) : [], periodId);
}

export function periodPresentationTargets(context: NavigationContext, periodId: string): Array<TimelineTarget & { title: string }> {
  const views = context.presentations.filter(p => p.periodId === periodId);
  return views.length ? views.map(view => ({ storyId: view.storyId, periodId, referencePeriodId: periodId, contextId: context.id, title: localizedText(view.title) }))
    : [{ storyId: context.id, periodId, contextId: context.id, title: localizedText(context.title) }];
}
