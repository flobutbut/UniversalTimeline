import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { ListPeriod } from '@/types/database';

vi.mock('@/views/HomeView/AssociatedStoriesBadge.vue', () => ({ default: { name: 'AssociatedStoriesBadge', template: '<span />' } }));

const hadean: ListPeriod = { id: 'hadean', label: { fr: 'Hadéen avec un nom suffisamment long pour être tronqué', en: '' }, startDate: 'G4.57', endDate: 'G4.03', hasChildren: false, categories: [] };
const archean: ListPeriod = { ...hadean, id: 'archean', label: { fr: 'Archéen', en: '' }, startDate: 'G4.03', endDate: 'G2.50' };
const gridProps = {
  periods: [hadean, archean], events: [], loading: false,
  currentPeriod: { ...hadean, id: 'earth', startDate: 'G4.54', endDate: 'NOW' },
  parentPeriod: null, storySuggestions: [], currentStoryId: '1', periodTooltips: true,
};
let view: VueWrapper;
let resize: () => void;
let disconnect: ReturnType<typeof vi.fn>;
let hadeanBounds: DOMRect;
const tip = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const card = (id: string) => view.get(`[data-period-id="${id}"]`);
async function settled() { await nextTick(); await nextTick(); }
async function hover(id: string) { await card(id).trigger('mouseenter'); await settled(); }

beforeEach(() => {
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ childStories: [] } as never);
  vi.useFakeTimers(); disconnect = vi.fn();
  hadeanBounds = new DOMRect(0, 160, 120, 52);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'tooltip') return new DOMRect(0, 0, 280, 70);
    return this.dataset.periodId === 'archean' ? new DOMRect(500, 160, 120, 52) : hadeanBounds;
  });
  view = mount(PeriodGrid, { props: gridProps, attachTo: document.body });
});
afterEach(() => { view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('shows the entire name and interval, linked to the period through aria-describedby', async () => {
  await hover('hadean');
  expect(tip()?.textContent).toContain(hadean.label.fr);
  expect(tip()?.textContent).toContain('de 4.57 Ga à 4.03 Ga');
  expect(card('hadean').attributes('aria-describedby')).toBe(tip()?.id);
});

it('opens from keyboard focus and dismisses with Escape without selecting a period', async () => {
  await card('hadean').trigger('focusin'); await settled();
  expect(tip()).not.toBeNull();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await settled();
  expect(tip()).toBeNull(); expect(card('hadean').attributes('aria-describedby')).toBeUndefined();
  await card('hadean').trigger('mousemove'); await settled(); expect(tip()).toBeNull();
  expect(view.emitted('period-click')).toBeUndefined();
});

it('prioritizes hover over focus and restores the focused period after leaving', async () => {
  await card('hadean').trigger('focusin'); await settled();
  await hover('archean');
  expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
  expect(tip()?.textContent).toContain('Archéen');
  await card('archean').trigger('mouseleave'); await vi.advanceTimersByTimeAsync(150); await settled();
  expect(tip()?.textContent).toContain(hadean.label.fr);
});

it('follows keyboard focus while the pointer is stationary, then follows a new pointer movement', async () => {
  await hover('archean');
  await card('hadean').trigger('focusin'); await settled();
  expect(tip()?.textContent).toContain(hadean.label.fr);
  expect(card('hadean').attributes('aria-describedby')).toBe(tip()?.id);
  await card('archean').trigger('mousemove'); await settled();
  expect(tip()?.textContent).toContain('Archéen');
});

it('stays open while the pointer moves onto the tooltip itself', async () => {
  await hover('hadean'); await card('hadean').trigger('mouseleave');
  tip()?.dispatchEvent(new MouseEvent('mouseenter')); await vi.advanceTimersByTimeAsync(200);
  expect(tip()).not.toBeNull();
  tip()?.dispatchEvent(new MouseEvent('mouseleave')); await vi.advanceTimersByTimeAsync(150); await settled();
  expect(tip()).toBeNull();
});

it('dismisses before opening anchored story navigation', async () => {
  await hover('hadean'); await card('hadean').trigger('click'); await settled();
  expect(tip()).toBeNull(); expect(view.emitted('period-click')?.[0]).toEqual([hadean]);
});

it('clamps the tooltip inside a narrow viewport and follows an expanded card', async () => {
  vi.stubGlobal('innerWidth', 320);
  await hover('hadean');
  const left = parseFloat(tip()!.style.left);
  expect(left).toBeGreaterThanOrEqual(12); expect(left + 280).toBeLessThanOrEqual(308);
  vi.stubGlobal('innerWidth', 1024);
  hadeanBounds = new DOMRect(600, 160, 200, 52);
  resize(); await settled();
  expect(parseFloat(tip()!.style.left)).toBe(560);
  expect(parseFloat(tip()!.style.top)).toBe(228);
  hadeanBounds = new DOMRect(600, 730, 200, 52);
  resize(); await settled();
  expect(parseFloat(tip()!.style.top)).toBe(652);
});

it('allows scrolling its contents and dismisses when the page scrolls or resizes', async () => {
  await hover('hadean'); tip()?.dispatchEvent(new Event('scroll')); await settled();
  expect(tip()).not.toBeNull();
  window.dispatchEvent(new Event('scroll')); await settled(); expect(tip()).toBeNull();
  await hover('archean'); window.dispatchEvent(new Event('resize')); await settled(); expect(tip()).toBeNull();
});

it('does not leave an overlay or observer when the active period disappears', async () => {
  await hover('hadean'); await view.setProps({ periods: [archean] }); await settled();
  expect(tip()).toBeNull(); expect(disconnect).toHaveBeenCalled();
});

it('closes the teleported tooltip when the timeline is cached, with no late reopening', async () => {
  view.unmount();
  const Host = defineComponent({
    components: { PeriodGrid }, setup: () => ({ visible: ref(true), gridProps }),
    template: '<button @click="visible = !visible">Changer</button><KeepAlive><PeriodGrid v-if="visible" v-bind="gridProps" /></KeepAlive>',
  });
  view = mount(Host, { attachTo: document.body });
  await hover('hadean'); await card('hadean').trigger('mouseleave');
  await view.get('button').trigger('click'); await settled();
  expect(tip()).toBeNull(); await vi.advanceTimersByTimeAsync(300); await settled(); expect(tip()).toBeNull();
  await view.get('button').trigger('click'); await settled(); expect(tip()).toBeNull();
});

it('preserves touching boundaries when a small period expands on hover', async () => {
  await view.setProps({
    periods: [{ ...hadean, startDate: 'M100', endDate: 'M99' }, { ...archean, startDate: 'M99', endDate: 'NOW' }],
    currentPeriod: { ...gridProps.currentPeriod, startDate: 'M100', endDate: 'NOW' },
  });
  await hover('hadean');
  const first = card('hadean').element as HTMLElement; const second = card('archean').element as HTMLElement;
  expect(parseFloat(first.style.getPropertyValue('--period-width'))).toBeCloseTo(8, 8);
  expect(parseFloat(first.style.getPropertyValue('--period-left')) + parseFloat(first.style.getPropertyValue('--period-width')))
    .toBeCloseTo(parseFloat(second.style.getPropertyValue('--period-left')), 8);
});
