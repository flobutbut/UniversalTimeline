import type { RouteLocationRaw } from 'vue-router';
import type { TimelineTarget } from '@/lib/timelineNavigation';

export function readStoryTarget(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new Error('La frise demandée est invalide.');
  }
  return value;
}

export function storyTimelineLocation(id: string): RouteLocationRaw {
  const story = readStoryTarget(id);
  return { name: 'timeline', query: { story } };
}

export function timelineLocation(target: TimelineTarget): RouteLocationRaw {
  return { name: 'timeline', query: {
    story: target.storyId,
    ...(target.periodId ? { period: target.periodId } : {}),
    ...(target.contextId ? { context: target.contextId } : {}),
    ...(target.view ? { view: target.view } : {}),
    ...(target.entry ? { entry: target.entry } : {}),
  } };
}

/** Reproducible position: one period in one detail view, under an optional reference frise. */
export function readTimelinePosition(query: Record<string, unknown>) {
  const contextId = readStoryTarget(query.context);
  const raw = query.period;
  if (raw !== undefined && (typeof raw !== 'string' || !raw.trim() || raw.length > 200 || /[\u0000-\u001f\u007f]/.test(raw))) {
    throw new Error('La période demandée est invalide.');
  }
  if (query.view !== undefined && (query.view !== 'overview' || raw !== undefined)) {
    throw new Error('La vue demandée est invalide.');
  }
  if (query.entry !== undefined && query.entry !== 'universe') throw new Error('Le point d’entrée demandé est invalide.');
  return { ...(contextId ? { contextId } : {}), ...(typeof raw === 'string' ? { periodId: raw } : {}),
    ...(query.view === 'overview' ? { view: 'overview' as const } : {}),
    ...(query.entry === 'universe' ? { entry: 'universe' as const } : {}) };
}
