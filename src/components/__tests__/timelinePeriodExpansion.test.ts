import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod, Story } from '@/types/database';
import { PERIOD_TOOLTIP_DELAY_MS } from '@/composables/useTimelinePeriodTooltip';

const first: ListPeriod = { id: 'first', label: { fr: 'Une période au nom long', en: '' }, startDate: 'M100', endDate: 'M99', categories: [] };
const second: ListPeriod = { ...first, id: 'second', label: { fr: 'Suite', en: '' }, startDate: 'M99', endDate: 'NOW' };
let view: VueWrapper;
let rowWidth: number;
let textWidth: number;
let cardHeight: number;
let cardWidth: number;
let badgeWidth: number;
let drillWidth: number;
let observers: Set<() => void>;
const card = (id = 'first') => view.get(`[data-period-id="${id}"]`);
const pct = (id: string, property: string) => parseFloat((card(id).element as HTMLElement).style.getPropertyValue(property));
async function settled() { await nextTick(); await nextTick(); }

beforeEach(() => {
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ periods: [first, second], events: [], childStories: [] } as unknown as Story);
  vi.useFakeTimers(); rowWidth = 1000; textWidth = 300; cardHeight = 52; cardWidth = 10; observers = new Set();
  badgeWidth = drillWidth = 0;
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: () => void) { observers.add(callback); }
    observe() {}
    disconnect() { observers.delete(this.callback); }
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.matches('.period-title, .period-card__title-action') ? textWidth : 180;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.matches('.period-card__actions') && this.querySelector('.associated-stories__badge')) return badgeWidth;
    return this.matches('.period-card__drill') ? drillWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (!this.matches('.card-content')) return 0;
    const actions = this.closest('.period-card')?.querySelector('.period-card__actions');
    return Math.max(0, cardWidth - (actions?.classList.contains('period-card__actions--hidden') ? 0 : badgeWidth) - drillWidth);
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('period-row') ? new DOMRect(0, 100, rowWidth, 56)
      : new DOMRect(0, 100, cardWidth, this.classList.contains('period-card--wrap') ? cardHeight : 52);
  });
  view = mount(PeriodGrid, { attachTo: document.body, props: {
    periods: [first, second], events: [{ id: 'boundary', label: { fr: 'Jonction', en: '' }, date: 'M99', categories: [] }],
    currentPeriod: { ...first, id: 'root', endDate: 'NOW' },
    parentPeriod: null, loading: false, currentStoryId: '1',
  } });
});

it('reserves the badge and drill control width, then reveals the badge at the expanded size', async () => {
  badgeWidth = 140; drillWidth = 28;
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue({
    id: '1', periods: [first, second], events: [],
    childStories: [{ id: '2', title: { fr: 'Autre frise', en: '' }, anchors: [{ type: 'period', id: 'first' }] }],
  } as unknown as Story);
  await view.setProps({ periods: [{ ...first, hasChildren: true }, second] });
  await vi.advanceTimersByTimeAsync(0); await flushPromises();
  for (const callback of observers) callback(); await settled();
  expect(card().get('.period-card__actions').classes()).toContain('period-card__actions--hidden');
  await card().trigger('mouseenter'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(47);
  const boundary = pct('first', '--period-left') + pct('first', '--period-width');
  expect(pct('second', '--period-left')).toBeCloseTo(boundary);
  expect(parseFloat((view.get('.event-card').element as HTMLElement).style.left)).toBeCloseTo(boundary);
  cardWidth = 470;
  for (const callback of observers) callback(); await settled();
  expect(card().get('.period-card__actions').classes()).not.toContain('period-card__actions--hidden');
  expect(card().get('.associated-stories__badge').text()).toBe('1 frise associée');
  await card().get('.associated-stories__badge').trigger('click'); await settled();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Autre frise');
  expect(view.emitted('period-click')).toBeUndefined();
});

it('extends the active period when its associations finish loading after focus', async () => {
  let resolve!: (story: Story) => void;
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValue(new Promise(yes => { resolve = yes; }));
  await vi.advanceTimersByTimeAsync(0);
  await card().trigger('focusin'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(30.2);
  badgeWidth = 140;
  resolve({ id: '1', periods: [first, second], events: [], childStories: [
    { id: '2', title: { fr: 'Autre frise', en: '' }, anchors: [{ type: 'period', id: 'first' }] },
  ] } as unknown as Story);
  await flushPromises(); await settled();
  for (const callback of observers) callback(); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(44.2);
});
afterEach(() => { view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('expands enough for the full text without rendering a tooltip or a dangling ARIA reference by default', async () => {
  await card().trigger('mouseenter'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(30.2);
  expect(card().classes()).toContain('period-card--expanded');
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  expect(card().attributes('aria-describedby')).toBeUndefined();
  expect(view.emitted('period-click')).toBeUndefined();
});

it.each([true, false])('reveals a leaf title clipped inside its child even without controls (dates: %s)', async withDates => {
  // Reproduction de la frise Climat : le h3 ne déborde pas, son span masque le nom.
  // Le nom est plus large que la date ; mesurer seulement le conteneur tronqué ne suffit pas.
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.matches('.period-card__title-action')) return 206;
    return this.matches('.period-info') ? 111 : 20;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(20);
  if (!withDates) await view.setProps({ periods: [
    { ...first, startDate: '', endDate: '', startYearsBP: 100e6, endYearsBP: 99e6 }, second,
  ] });
  expect(card().find('.period-card__drill').exists()).toBe(false);
  expect(card().find('.associated-stories__badge').exists()).toBe(false);
  await card().trigger('mouseenter'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(20.8);
  await card().trigger('mouseleave'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(1);
});

it('preserves shared boundaries and keeps an event at the same date aligned while expanding', async () => {
  await card().trigger('focusin'); await settled();
  const boundary = pct('first', '--period-left') + pct('first', '--period-width');
  expect(boundary).toBeCloseTo(pct('second', '--period-left'));
  expect(parseFloat((view.get('.event-card').element as HTMLElement).style.left)).toBeCloseTo(boundary);
});

it('keeps a shorter parent aligned with the child and event at its start during expansion', async () => {
  await view.setProps({ currentPeriod: { ...first, id: 'root', startDate: 'M99', endDate: 'NOW' } });
  const parent = view.get('.period-card--parent').element as HTMLElement;
  expect(parseFloat(parent.style.marginLeft)).toBeCloseTo(1);
  expect(parseFloat(parent.style.width)).toBeCloseTo(99);
  await card().trigger('focusin'); await settled();
  const boundary = pct('first', '--period-left') + pct('first', '--period-width');
  expect(parseFloat(parent.style.marginLeft)).toBeCloseTo(boundary);
  expect(parseFloat(parent.style.width) + boundary).toBeCloseTo(100);
  expect(parseFloat((view.get('.event-card').element as HTMLElement).style.left)).toBeCloseTo(boundary);
});

it('leaves an already readable period at its natural width', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  await card('second').trigger('focusin'); await settled();
  expect(pct('second', '--period-width')).toBeCloseTo(99);
  expect(pct('first', '--period-width')).toBeCloseTo(1);
});

it('follows the last keyboard or pointer interaction and restores the scale after leaving both', async () => {
  await card().trigger('mouseenter'); await card('second').trigger('focusin'); await settled();
  expect(card('second').classes()).toContain('period-card--expanded');
  expect(card().classes()).not.toContain('period-card--expanded');
  await card().trigger('mousemove'); await settled();
  expect(card().classes()).toContain('period-card--expanded');
  await card('second').trigger('focusout'); await card().trigger('mouseleave');
  await vi.advanceTimersByTimeAsync(150); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(1);
});

it('recomputes the required percentage when the available width changes', async () => {
  await card().trigger('focusin'); await settled(); rowWidth = 500;
  for (const callback of observers) callback(); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(60.4);
});

it('uses the whole row for text wider than the viewport and reserves height for wrapped lines', async () => {
  textWidth = 1200; cardHeight = 94; cardWidth = 1000;
  await card().trigger('focusin'); await settled();
  for (const callback of observers) callback(); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(100);
  expect(card().classes()).toContain('period-card--wrap');
  expect(view.get('.period-row').attributes('style')).toContain('height: 98px');
});

it('keeps a single line and the same row height throughout horizontal expansion', async () => {
  await card().trigger('mouseenter'); await settled();
  for (const width of [10, 50, 150, 302]) {
    cardWidth = width;
    for (const callback of observers) callback(); await settled();
    expect(card().classes()).not.toContain('period-card--wrap');
    expect(view.get('.period-row').attributes('style')).toContain('height: 56px');
  }
});

it('waits for the full available width before wrapping an exceptionally long name', async () => {
  textWidth = 1200; cardHeight = 94;
  await card().trigger('focusin'); await settled();
  for (const width of [10, 500, 990]) {
    cardWidth = width;
    for (const callback of observers) callback(); await settled();
    expect(card().classes()).not.toContain('period-card--wrap');
    expect(view.get('.period-row').attributes('style')).toContain('height: 56px');
  }
  cardWidth = 1000;
  for (const callback of observers) callback(); await settled();
  for (const callback of observers) callback(); await settled();
  expect(card().classes()).toContain('period-card--wrap');
  expect(view.get('.period-row').attributes('style')).toContain('height: 98px');
  await card().trigger('keydown', { key: 'Escape' }); await settled();
  expect(card().classes()).not.toContain('period-card--wrap');
  expect(view.get('.period-row').attributes('style')).toContain('height: 56px');
});

it('resets expansion on Escape, back navigation and removal of the active period', async () => {
  await card().trigger('focusin'); await card().trigger('keydown', { key: 'Escape' }); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(1);
  await card().trigger('mouseenter'); await view.get('.period-card--parent').trigger('click'); await settled();
  expect(pct('first', '--period-width')).toBeCloseTo(1);
  expect(view.emitted('go-back')).toHaveLength(1);
  await card().trigger('mouseenter'); await view.setProps({ periods: [second] }); await settled();
  expect(card('second').classes()).not.toContain('period-card--expanded');
});

it('still supports explicitly enabling the preserved tooltip', async () => {
  await view.setProps({ periodTooltips: true }); await card().trigger('mouseenter'); await vi.advanceTimersByTimeAsync(PERIOD_TOOLTIP_DELAY_MS); await settled();
  expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(first.label.fr);
  await view.setProps({ periodTooltips: false }); await settled();
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  expect(card().classes()).toContain('period-card--expanded');
});
