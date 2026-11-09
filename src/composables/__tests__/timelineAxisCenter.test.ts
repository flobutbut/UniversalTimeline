import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { useTimelineAxisCenter } from '@/composables/useTimelineAxisCenter';

let view: VueWrapper;
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
const resizes: ResizeObserverCallback[] = [];
beforeEach(() => {
  frames.clear(); resizes.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { resizes.push(callback); } observe() {} disconnect() {} });
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function settle() {
  await flushPromises();
  for (let i = 0; frames.size && i < 8; i++) {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0));
    await flushPromises();
  }
}
async function start(rows = 80) {
  const periodHeight = ref(rows), viewportHeight = ref(600), enabled = ref(true), ready = ref(true);
  view = mount(defineComponent({
    setup() {
      const viewport = ref<HTMLElement | null>(null), grid = ref<HTMLElement | null>(null), axis = ref<HTMLElement | null>(null);
      const style = useTimelineAxisCenter({ viewport: () => enabled.value ? viewport.value : null, grid, axis, ready: () => ready.value, resetOn: [periodHeight] });
      return { viewport, grid, axis, style };
    },
    template: '<div ref="viewport"><div ref="grid" :style="[style, {padding: \'12px\'}]"><div ref="axis" style="height:2px;margin:2px 0"></div></div></div>',
  }), { attachTo: document.body });
  const viewport = view.element as HTMLElement;
  const grid = viewport.firstElementChild as HTMLElement;
  const axis = grid.firstElementChild as HTMLElement;
  Object.defineProperty(viewport, 'clientHeight', { get: () => viewportHeight.value, configurable: true });
  vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 100, 1000, viewportHeight.value));
  vi.spyOn(grid, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 160 - viewport.scrollTop, 1000, 800));
  vi.spyOn(axis, 'getBoundingClientRect').mockImplementation(() => {
    const before = Math.max(periodHeight.value, parseFloat(grid.style.getPropertyValue('--timeline-before-axis')) || 0);
    return new DOMRect(0, 160 - viewport.scrollTop + 12 + before + 2, 1000, 2);
  });
  await settle();
  return { viewport, grid, axis, periodHeight, viewportHeight, enabled, ready };
}

it('centers the actual line in the visible exploration area, including the offset of its header', async () => {
  const { viewport, axis } = await start();
  const line = axis.getBoundingClientRect();
  expect(line.top + line.height / 2).toBe(400);
  expect(viewport.scrollTop).toBe(0);
});

it('keeps tall periods intact and scrolls the viewport until the line itself is centered', async () => {
  const { viewport, axis, periodHeight } = await start(650);
  expect(periodHeight.value).toBe(650);
  expect(axis.getBoundingClientRect().top + 1).toBe(400);
  expect(viewport.scrollTop).toBeGreaterThan(0);
  // Un défilement manuel pour lire les périodes n’est pas annulé par le cadrage.
  viewport.scrollTop -= 80;
  viewport.dispatchEvent(new Event('scroll')); await settle();
  expect(axis.getBoundingClientRect().top + 1).toBe(480);
  periodHeight.value = 850; await settle();
  expect(axis.getBoundingClientRect().top + 1).toBe(400);
});

it('recenters after resize and stops repositioning in comparison mode', async () => {
  const { viewport, axis, viewportHeight, enabled, periodHeight, grid } = await start(650);
  viewportHeight.value = 400;
  resizes.forEach(callback => callback([], {} as ResizeObserver)); await settle();
  expect(axis.getBoundingClientRect().top + 1).toBe(300);
  enabled.value = false; await settle();
  const scroll = viewport.scrollTop;
  periodHeight.value = 1000; await settle();
  expect(viewport.scrollTop).toBe(scroll);
  expect(grid.style.getPropertyValue('--timeline-before-axis')).toBe('');
});

it('waits for loaded content and cancels a pending frame on disposal', async () => {
  const { viewport, periodHeight, ready } = await start();
  ready.value = false; periodHeight.value = 900; await settle();
  expect(viewport.scrollTop).toBe(0);
  ready.value = true; await settle();
  expect(viewport.scrollTop).toBeGreaterThan(0);
  periodHeight.value = 1000; await flushPromises();
  view.unmount();
  expect(frames.size).toBe(0);
});
