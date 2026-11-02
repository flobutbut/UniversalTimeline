import { expect, it } from 'vitest';
import { compareEventPriority, eventPrioritySignals, type EventPrioritySignals } from '@/lib/timelineEventPriority';

const link = (id: string, parentStoryId: string | null = null) => ({ id, title: { fr: id, en: '' }, parentStoryId });

it('reads child anchors, period boundaries and other frises from the loaded structure', () => {
  const signals = eventPrioritySignals(40.3, [0, 40, 100], [link('child', '7'), link('a'), link('b')], '7', true);
  expect(signals).toEqual({ importance: 'normal', anchorsChildStory: true, marksBoundary: true, relatedStoryCount: 2, hasDescription: true });
  expect(eventPrioritySignals(41, [0, 40, 100], [], '7', false, 'minor')).toEqual({
    importance: 'minor', anchorsChildStory: false, marksBoundary: false, relatedStoryCount: 0, hasDescription: false,
  });
  // Une frise enfant d'une autre frise reste une simple frise associée.
  expect(eventPrioritySignals(50, [], [link('other-child', '8')], '7', false).anchorsChildStory).toBe(false);
});

it('ranks child frises, then boundaries, then shared events, then described ones', () => {
  const base: EventPrioritySignals = { importance: 'normal', anchorsChildStory: false, marksBoundary: false, relatedStoryCount: 0, hasDescription: false };
  const ranked = [
    { id: 'described', ...base, hasDescription: true },
    { id: 'shared', ...base, relatedStoryCount: 3 },
    { id: 'boundary', ...base, marksBoundary: true },
    { id: 'child', ...base, anchorsChildStory: true },
    { id: 'plain', ...base },
  ].sort(compareEventPriority).map(item => item.id);
  expect(ranked).toEqual(['child', 'boundary', 'shared', 'described', 'plain']);
});

it('lets the author choice win over every computed signal', () => {
  const base: EventPrioritySignals = { importance: 'normal', anchorsChildStory: false, marksBoundary: false, relatedStoryCount: 0, hasDescription: false };
  const ranked = [
    { id: 'minor-child', ...base, importance: 'minor' as const, anchorsChildStory: true, marksBoundary: true },
    { id: 'normal-boundary', ...base, marksBoundary: true },
    { id: 'major-plain', ...base, importance: 'major' as const },
  ].sort(compareEventPriority).map(item => item.id);
  expect(ranked).toEqual(['major-plain', 'normal-boundary', 'minor-child']);
});
