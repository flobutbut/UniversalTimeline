import { expect, it } from 'vitest';
import type { ListPeriod } from '@/types/database';
import { levelNeighbors, timelineLevel } from '@/lib/timelineNavigation';

const p = (id: string, startDate: string, endDate?: string): ListPeriod => ({
  id, label: { fr: id, en: '' }, startDate, endDate, categories: [], storyParentId: null,
});
const neighbors = (periods: ListPeriod[], id: string) => {
  const { previous, next } = levelNeighbors(timelineLevel(periods, 0), id);
  return [previous?.period.id ?? null, next?.period.id ?? null];
};

it('does not offer a simultaneous or contained period as the next or previous one', () => {
  const galaxies = [p('milky-way', 'G13.5', 'TODAY'), p('andromeda', 'G10', 'TODAY')];
  expect(neighbors(galaxies, 'milky-way')).toEqual([null, null]);
  expect(neighbors(galaxies, 'andromeda')).toEqual([null, null]);
  const nested = [p('long', 'M100', 'M10'), p('inside', 'M80', 'M50'), p('after', 'M60', 'M5')];
  expect(neighbors(nested, 'long')).toEqual([null, 'after']);
  expect(neighbors(nested, 'after')).toEqual(['inside', null]);
});

it('keeps successive phases that overlap slightly, and unknown ends in date order', () => {
  const phases = [p('medieval', '0476', '1492'), p('renaissance', '1400', '1650'), p('modern', '1492', '1789'), p('open', '1789')];
  expect(neighbors(phases, 'medieval')).toEqual([null, 'renaissance']);
  expect(neighbors(phases, 'renaissance')).toEqual(['medieval', 'modern']);
  expect(neighbors(phases, 'modern')).toEqual(['renaissance', 'open']);
  expect(neighbors(phases, 'open')).toEqual(['modern', null]);
});
