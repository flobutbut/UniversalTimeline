import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
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
