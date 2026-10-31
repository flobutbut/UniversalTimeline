import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useScrollJourney } from '@/composables/useScrollJourney';
import { journeyChapters } from '@/lib/scrollJourney';

let view: ReturnType<typeof mount>;
let controller: ReturnType<typeof useScrollJourney>;
let scheduled: FrameRequestCallback | undefined;
function setup(reduce = false) {
  const remove = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: remove }));
  vi.stubGlobal('ResizeObserver', undefined);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { scheduled = callback; return 1; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  view = mount(defineComponent({ setup() { controller = useScrollJourney(); return () => h('div'); } }));
  const root = document.createElement('div');
  const runway = document.createElement('div');
  const stage = document.createElement('div');
  Object.defineProperty(runway, 'clientHeight', { value: 2060, configurable: true });
  Object.defineProperty(stage, 'clientHeight', { value: 500 });
  root.scrollTo = vi.fn();
  controller.root.value = root;
  controller.runway.value = runway;
  controller.stage.value = stage;
  return { root, runway, remove };
}
function flushFrame() { const callback = scheduled; scheduled = undefined; callback?.(0); }
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); scheduled = undefined; });

it('maps native scroll distance to the journey and keeps its position across resizing', () => {
  const { root, runway } = setup();
  root.scrollTop = 720;
  flushFrame();
  expect(controller.frame.value.index).toBe(6);
  Object.defineProperty(runway, 'clientHeight', { value: 3620, configurable: true });
  window.dispatchEvent(new Event('resize'));
  flushFrame();
  expect(root.scrollTop).toBe(1440);
  expect(controller.frame.value.index).toBe(6);
});
it('offers direct chapter navigation and avoids animated scrolling in reduced-motion mode', () => {
  const { root } = setup(true);
  flushFrame();
  controller.goTo(journeyChapters.length - 1);
  expect(root.scrollTo).toHaveBeenCalledWith({ top: 1440, behavior: 'auto' });
  expect(controller.reducedMotion.value).toBe(true);
});
it('does not force the visitor back into the animation when resizing below the journey', () => {
  const { root, runway } = setup();
  root.scrollTop = 1700;
  flushFrame();
  Object.defineProperty(runway, 'clientHeight', { value: 3620, configurable: true });
  window.dispatchEvent(new Event('resize'));
  expect(root.scrollTop).toBe(1700);
});
it('cancels pending work and removes its media listener when leaving the page', () => {
  const { remove } = setup();
  view.unmount();
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
});
