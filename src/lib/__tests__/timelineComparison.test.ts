import { describe, expect, it } from 'vitest';
import type { ListEvent, Period, Story } from '@/types/database';
import { eventsInFrame, followLevel, sharedEventIds, storyOutsideFrame, type ScaleFrame } from '@/lib/timelineComparison';
import { periodCoordinates } from '@/services/TimelineScalingService';

const now = Date.UTC(2026, 10, 6);
const period = (id: string, startDate: string, endDate: string, storyParentId: string | null = null): Period =>
  ({ id, label: { fr: id, en: id }, startDate, endDate, storyParentId, categories: [], children: [], temporalLocation: '' });
const event = (id: string, date: string): ListEvent => ({ id, label: { fr: id, en: id }, date, categories: [] });
const story = (id: string, periods: Period[], events: ListEvent[] = []): Story =>
  ({ id, title: { fr: id, en: id }, categories: [], author: '', isPublic: true, periods, events });
const frame = (start: string, end: string): ScaleFrame => {
  const { start: startYearsBP, end: endYearsBP } = periodCoordinates({ startDate: start, endDate: end }, now);
  return { startYearsBP: startYearsBP!, endYearsBP: endYearsBP! };
};

const usa = story('usa', [
  period('colonial', '1607', '1765'),
  period('revolution', '1765', '1783'),
  period('war', '1775', '1783', 'revolution'),
  period('republic', '1783', '1861'),
], [event('jamestown', '1607-05-14'), event('declaration', '1776-07-04')]);

describe('frise ajoutée qui suit l’échelle de la frise principale', () => {
  it('descend tant qu’une seule période contient le cadre, puis montre son niveau', () => {
    const level = followLevel(usa, frame('1776', '1780'), [], now);
    expect(level.ancestors.map(p => p.id)).toEqual(['revolution']);
    expect(level.periods.map(p => p.id)).toEqual(['war']);
  });
  it('garde toutes les périodes qui croisent un cadre plus large', () => {
    const level = followLevel(usa, frame('1589', '1789'), [], now);
    expect(level.ancestors).toEqual([]);
    expect(level.periods.map(p => p.id)).toEqual(['colonial', 'revolution', 'republic']);
  });
  it('ne garde que ses propres événements situés dans le cadre', () => {
    expect(eventsInFrame(usa.events, frame('1700', '1789'), now).map(e => e.id)).toEqual(['declaration']);
  });
});

describe('événements communs', () => {
  it('relie seulement la même fiche présente dans les deux frises', () => {
    expect(sharedEventIds([event('declaration', '1776-07-04'), event('bastille', '1789-07-14')], usa.events)).toEqual(['declaration']);
  });
});


describe('frise hors de la période affichée', () => {
  it('distinguishes out-of-frame periods from empty and undated content', () => {
    const window = frame('1700', '1800');
    expect(storyOutsideFrame(story('outside', [period('future', '2100', '2200')]), window, [], now)).toBe(true);
    expect(storyOutsideFrame(story('empty', []), window, [], now)).toBe(false);
    expect(storyOutsideFrame(story('unknown', [period('unknown', 'unknown', 'unknown')], [event('undated', 'unknown')]), window, [], now)).toBe(false);
    expect(storyOutsideFrame(usa, window, [], now)).toBe(false);
  });

  it('takes dated events into account even without periods and includes the frame boundaries', () => {
    const window = frame('1700', '1800');
    expect(storyOutsideFrame(story('outside', [], [event('past', '1600')]), window, [], now)).toBe(true);
    for (const date of ['1700', '1776', '1800']) {
      expect(storyOutsideFrame(story('inside', [], [event('event', date)]), window, [], now)).toBe(false);
    }
  });
});
