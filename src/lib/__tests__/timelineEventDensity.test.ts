import { expect, it } from 'vitest';
import { defaultOpenEvents, withoutCoveredTooltips } from '@/lib/timelineEventDensity';
import type { EventCardAlign } from '@/lib/timelinePeriodGridHelpers';

const at = (...items: Array<[string, number, EventCardAlign?]>) => items.map(([id, leftPct, align = 'center']) => ({ id, leftPct, align }));

it('opens the tooltips that do not overlap, in chronological order', () => {
  // 1 000 px, bulles de 100 px : centrées sur 200 px, elles occupent 150–250 px.
  const items = at(['late', 50], ['a', 20], ['b', 25], ['c', 30]);
  expect([...defaultOpenEvents(items, 1000, undefined, 100)]).toEqual(['a', 'c', 'late']);
});

it('opens more tooltips on a wider timeline, and none before measuring', () => {
  const items = at(['a', 20], ['b', 25], ['c', 30]);
  expect(defaultOpenEvents(items, 1000, undefined, 100).size).toBe(2);
  expect(defaultOpenEvents(items, 3000, undefined, 100).size).toBe(3);
  expect(defaultOpenEvents(items, 0, undefined, 100).size).toBe(0);
});

it('places edge bubbles on the inside of the timeline', () => {
  // Bulle de début vers la droite (0–100 px), bulle de fin vers la gauche (900–1 000 px).
  expect(defaultOpenEvents(at(['first', 0.6, 'start'], ['next', 10]), 1000, undefined, 100).size).toBe(1);
  expect(defaultOpenEvents(at(['before', 85], ['last', 99.4, 'end']), 1000, undefined, 100).size).toBe(2);
});

it('hides only the pinned tooltips covered by the hovered or selected one', () => {
  // 1 000 px : bulle complète de 248 px centrée sur 400 px → 276–524 px.
  const items = at(['far', 5], ['near', 30], ['hovered', 40], ['other', 65]);
  const open = new Set(['far', 'near', 'other']);
  expect([...withoutCoveredTooltips(open, items, new Set(['hovered']), 1000)]).toEqual(['far', 'other']);
  expect([...withoutCoveredTooltips(open, items, new Set(), 1000)]).toEqual(['far', 'near', 'other']);
  expect([...withoutCoveredTooltips(open, items, new Set(['near']), 1000)]).toEqual(['far', 'near', 'other']);
});

it('places higher-priority tooltips first, then fills the remaining space chronologically', () => {
  const items = at(['a', 20], ['b', 25], ['c', 30], ['d', 35]);
  const first = (id: string) => (x: { id: string }, y: { id: string }) => Number(y.id === id) - Number(x.id === id);
  // Sans priorité : a et c. Avec b prioritaire : b, puis d (a et c le chevauchent).
  expect([...defaultOpenEvents(items, 1000, undefined, 100)]).toEqual(['a', 'c']);
  expect([...defaultOpenEvents(items, 1000, first('b'), 100)]).toEqual(['b', 'd']);
});
