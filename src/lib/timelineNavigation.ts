import { comparableYearsBeforePresent, compareYearsOldestFirst } from '@temporal';
import type { ListPeriod, NavigationContext } from '@/types/database';
import { storyChildrenOf } from './homeStoryPeriodNav';
import { getStoryPeriodParentId } from './storyPeriodParent';

export interface TimelineTarget { storyId: string; periodId?: string; contextId?: string; view?: 'overview'; entry?: 'universe' }

/** Full path in this frise, including leaves; invalid paths cannot become navigation targets. */
export function timelinePeriodPath(periods: ListPeriod[], id: string): ListPeriod[] | null {
  const byId = new Map(periods.map(p => [p.id, p]));
  const seen = new Set<string>();
  const path: ListPeriod[] = [];
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
    return start === null ? [] : [{ ...entry, start }];
  }).sort((a,b) => compareYearsOldestFirst(a.start, b.start) || a.period.id.localeCompare(b.period.id));
}

/** The context defines the peers; ordinary entry points never select a detail view. */
export function contextPeriodNeighbors(context: NavigationContext, periodId: string) {
  const path = timelinePeriodPath(context.periods, periodId);
  const ordered = path ? timelineLevel(context.periods, path.length - 1) : [];
  const index = ordered.findIndex(entry => entry.period.id === periodId);
  return { previous: index > 0 ? ordered[index - 1] : null, next: index >= 0 ? ordered[index + 1] ?? null : null };
}

export function periodPresentationTargets(context: NavigationContext, periodId: string): Array<TimelineTarget & { title: string }> {
  const views = context.presentations.filter(p => p.periodId === periodId);
  return views.length ? views.map(view => ({ storyId: view.storyId, periodId, contextId: context.id, title: view.title.fr || view.title.en }))
    : [{ storyId: context.id, periodId, contextId: context.id, title: context.title.fr || context.title.en }];
}
