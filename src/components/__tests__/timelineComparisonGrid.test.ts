import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import EventCard from '@/views/HomeView/EventCard.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListEvent, ListPeriod } from '@/types/database';

// Options de PeriodGrid propres à la comparaison de deux frises ; sans elles, la timeline est inchangée.
const period = (id: string, startDate: string, endDate: string, hasChildren = false): ListPeriod =>
  ({ id, label: { fr: id, en: '' }, startDate, endDate, hasChildren, categories: [] });
const event = (id: string, date: string): ListEvent => ({ id, label: { fr: id, en: '' }, date, categories: [] });
const css = (wrapper: VueWrapper, id: string, name: string) =>
  parseFloat((wrapper.get(`[data-period-id="${id}"]`).element as HTMLElement).style.getPropertyValue(name));
let view: VueWrapper;
beforeEach(() => { vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ childStories: [] } as never); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

const base = { events: [], loading: false, currentPeriod: null, parentPeriod: null, currentStoryId: '1' };

it('keeps an imposed scale instead of widening it to a period that overflows', () => {
  const frame = { startYearsBP: 2026 - 1600, endYearsBP: 2026 - 1800 };
  view = mount(PeriodGrid, { props: { ...base, periods: [period('colonial', '1607', '1765'), period('republic', '1783', '1861')], storyBounds: frame, scaleFrame: frame } });
  // 1607 is close to the left edge of 1600-1800; the overflowing period is clipped at the right edge.
  expect(css(view, 'colonial', '--period-left')).toBeLessThan(5);
  expect(css(view, 'republic', '--period-left') + css(view, 'republic', '--period-width')).toBeCloseTo(100, 0);
  expect(view.vm.getScaleFrame()).toEqual(expect.objectContaining({ startYearsBP: expect.closeTo(426, 0), endYearsBP: expect.closeTo(226, 0) }));
});

it('frames itself from its periods when no scale is imposed', () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('colonial', '1607', '1765'), period('republic', '1783', '1861')] } });
  expect(css(view, 'colonial', '--period-left')).toBe(0);
  expect(css(view, 'republic', '--period-left') + css(view, 'republic', '--period-width')).toBeCloseTo(100, 5);
});

it('hides the end bound only when asked', async () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('child', '1610', '1700')], currentPeriod: period('parent', '1589', '1789', true) } });
  expect(view.text()).toContain('Fin : 1789');
  await view.setProps({ hideEndBound: true });
  expect(view.text()).not.toContain('Fin :');
  expect(view.find('.period-card--parent').exists()).toBe(true);
});

it('applies the zoom of a period hovered in the other frise to its own positions', async () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('a', '1600', '1700'), period('b', '1700', '1800')] } });
  const before = css(view, 'b', '--period-left');
  await view.setProps({ externalFocus: { start: 0, end: 10, minimum: 40 } });
  expect(css(view, 'b', '--period-left')).toBeGreaterThan(before);
  expect(view.vm.getFocus()).toBeNull();
});

it('marks its cards and events for the comparison, and keeps the normal density by default', async () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('a', '1600', '1700')], events: [event('treaty', '1650-01-01')] } });
  expect(view.find('.period-grid--compact').exists()).toBe(false);
  expect(view.find('[data-event-id="treaty"] .event-dot').exists()).toBe(true);
  await view.setProps({ compact: true });
  expect(view.find('.period-grid--compact').exists()).toBe(true);
  expect(view.get('[data-period-id="a"]').classes()).toContain('period-card--compact');
});

it('keeps interactive periods and events on the same scale in the minimized view', async () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('a', '1600', '1700')], events: [event('treaty', '1650-01-01')] } });
  const frame = view.vm.getScaleFrame();
  const left = css(view, 'a', '--period-left');
  await view.setProps({ minimized: true });
  expect(view.classes()).toContain('period-grid--minimized');
  expect(view.vm.getScaleFrame()).toEqual(frame);
  expect(css(view, 'a', '--period-left')).toBe(left);
  expect(view.find('.event-card.is-default-open').exists()).toBe(false);
  expect(view.getComponent(EventCard).props('minimized')).toBe(true);
  await view.get('[data-event-id="treaty"] .event-dot').trigger('click');
  expect(view.emitted('event-click')?.[0]?.[0]).toMatchObject({ id: 'treaty' });
  await view.get('[data-period-id="a"]').trigger('click');
  expect(view.emitted('period-click')?.[0]?.[0]).toMatchObject({ id: 'a' });
});


it('keeps the standalone grid layout unless the exploration requests natural height', async () => {
  view = mount(PeriodGrid, { props: { ...base, periods: [period('a', '1600', '1700')] } });
  expect(view.classes()).not.toContain('period-grid--natural-height');
  await view.setProps({ naturalHeight: true });
  expect(view.classes()).toContain('period-grid--natural-height');
  await view.setProps({ naturalHeight: false });
  expect(view.classes()).not.toContain('period-grid--natural-height');
});

it('uses the existing continuation markers for clipped rows and clears them at real bounds', async () => {
  const frame = { startYearsBP: 100000000, endYearsBP: 30000000 };
  view = mount(PeriodGrid, { props: { ...base, compact: true, naturalHeight: true, scaleFrame: frame,
    periods: [period('before', 'M120', 'M50'), period('after', 'M70', 'M20'), period('both', 'M120', 'M20'), period('within', 'M90', 'M40'), period('exact', 'M100', 'M30')] } });
  expect(view.get('[data-period-id="before"]').classes()).toContain('period-card--continues-before');
  expect(view.get('[data-period-id="before"]').classes()).not.toContain('period-card--continues-after');
  expect(view.get('[data-period-id="after"]').classes()).toContain('period-card--continues-after');
  expect(view.get('[data-period-id="after"]').classes()).not.toContain('period-card--continues-before');
  expect(view.get('[data-period-id="both"]').classes()).toEqual(expect.arrayContaining(['period-card--continues-before', 'period-card--continues-after']));
  for (const id of ['within', 'exact']) {
    expect(view.get(`[data-period-id="${id}"]`).classes()).not.toContain('period-card--continues-before');
    expect(view.get(`[data-period-id="${id}"]`).classes()).not.toContain('period-card--continues-after');
  }
  await view.setProps({ minimized: true });
  expect(view.get('[data-period-id="both"]').classes()).toEqual(expect.arrayContaining(['period-card--continues-before', 'period-card--continues-after']));
});
