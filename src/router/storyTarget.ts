import type { RouteLocationRaw } from 'vue-router';
import type { TimelineTarget, TimelineReturnFrame } from '@/lib/timelineNavigation';

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

/** A frise opened on one of its events: the timeline finds the period and opens the event's details. */
export function storyEventLocation(storyId: string, eventId: string): RouteLocationRaw {
  return { name: 'timeline', query: { story: readStoryTarget(storyId), event: eventId } };
}

export function timelineLocation(target: TimelineTarget): RouteLocationRaw {
  return { name: 'timeline', query: {
    story: target.storyId,
    ...(target.periodId ? { period: target.periodId } : {}),
    ...(target.contextId ? { context: target.contextId } : {}),
    ...(target.referencePeriodId ? { reference: target.referencePeriodId } : {}),
    ...(target.view ? { view: target.view } : {}),
    ...(target.entry ? { entry: target.entry } : {}),
  }, ...(target.returnPath?.length ? { state: { timelineReturnPath: JSON.parse(JSON.stringify(target.returnPath)) } } : {}) };
}

/** Reproducible position: one period in one detail view, under an optional reference frise. */
export function readTimelinePosition(query: Record<string, unknown>) {
  const contextId = readStoryTarget(query.context);
  const raw = query.period;
  const reference = query.reference;
  if (reference !== undefined && (typeof reference !== 'string' || !reference.trim() || reference.length > 200 || /[\u0000-\u001f\u007f]/.test(reference))) throw new Error('La période de référence demandée est invalide.');
  if (raw !== undefined && (typeof raw !== 'string' || !raw.trim() || raw.length > 200 || /[\u0000-\u001f\u007f]/.test(raw))) {
    throw new Error('La période demandée est invalide.');
  }
  const event = query.event;
  if (event !== undefined && (typeof event !== 'string' || !event.trim() || event.length > 200 || /[\u0000-\u001f\u007f]/.test(event))) throw new Error('L’événement demandé est invalide.');
  if (query.view !== undefined && (query.view !== 'overview' || raw !== undefined)) {
    throw new Error('La vue demandée est invalide.');
  }
  if (query.entry !== undefined && query.entry !== 'universe') throw new Error('Le point d’entrée demandé est invalide.');
  return { ...(contextId ? { contextId } : {}), ...(typeof raw === 'string' ? { periodId: raw } : {}), ...(typeof reference === 'string' ? { referencePeriodId: reference } : {}), ...(typeof event === 'string' ? { eventId: event } : {}),
    ...(query.view === 'overview' ? { view: 'overview' as const } : {}),
    ...(query.entry === 'universe' ? { entry: 'universe' as const } : {}) };
}

/** Browser history is untrusted input and may come from an older application build. */
export function readTimelineReturnPath(state: unknown): TimelineReturnFrame[] {
  const raw = state && typeof state === 'object' ? (state as Record<string,unknown>).timelineReturnPath : undefined;
  if (!Array.isArray(raw) || raw.length > 32) return [];
  try {
    return raw.map(frame => {
      if (!frame || typeof frame !== 'object' || Array.isArray(frame)) throw new Error('Invalid return position');
      const storyId=readStoryTarget(frame.storyId);if(!storyId)throw new Error('Missing source');
      const position=readTimelinePosition({period:frame.periodId,context:frame.contextId,reference:frame.referencePeriodId,view:frame.view});
      const anchor=frame.anchor;
      if(anchor && (!['period','event'].includes(anchor.type)||typeof anchor.id!=='string'||!anchor.id.trim()||anchor.id.length>200||/[\u0000-\u001f\u007f]/.test(anchor.id)))throw new Error('Invalid anchor');
      const anchorStoryId=readStoryTarget(frame.anchorStoryId);
      return {storyId,...position,...(anchor?{anchor:{type:anchor.type,id:anchor.id}}:{}),...(anchorStoryId?{anchorStoryId}:{})};
    });
  } catch { return []; }
}
