import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LandingTimeDemo from '@/components/LandingTimeDemo.vue';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); });

it('starts with the whole Universe and offers all six sourced landmarks', async () => {
  view = mount(LandingTimeDemo);
  expect(view.get('figcaption').text()).toContain('Du Big Bang à aujourd’hui');
  expect(view.findAll('.landmark-list button')).toHaveLength(6);
  expect(view.get('.marker-note').text()).toContain('sans agrandir la barre');
  expect(view.get('.landmark-detail a').attributes('href')).toBe('https://science.nasa.gov/universe/overview/');
  await view.findAll('.landmark-list button')[2].trigger('click');
  expect(view.get('.landmark-detail').text()).toContain('La date exacte de son apparition reste inconnue');
  expect(view.get('.landmark-detail a').attributes('href')).toContain('origin-of-life');
});

it('lets the visitor zoom from the Universe to inventions and return to the starting scale', async () => {
  view = mount(LandingTimeDemo);
  const next = () => view.get('.demo-insight button').trigger('click');
  await next();
  expect(view.get('figcaption').text()).toContain('De la formation de la Terre');
  await next();
  expect(view.get('figcaption').text()).toContain('les dinosaures');
  expect(view.get('[data-band="humans"]').attributes('style')).toContain('width: 0.12%');
  await next();
  expect(view.get('figcaption').text()).toContain('notre espèce');
  expect(view.get('[data-band="humans"]').attributes('style')).toContain('width: 100%');
  await next();
  expect(view.get('figcaption').text()).toContain('nos inventions');
  expect(view.get('[data-band="internet"]').exists()).toBe(true);
  expect(view.findAll('.landmark-list button')).toHaveLength(2);
  await next();
  expect(view.get('figcaption').text()).toContain('Du Big Bang à aujourd’hui');
});

it('shows a separate 1 px marker only when the actual duration is subpixel, including after resize', async () => {
  let resize!: (entries: { contentRect: { width: number } }[]) => void;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: typeof resize) { resize = callback; }
    observe() { resize([{ contentRect: { width: 1000 } }]); }
    disconnect() {}
  });
  view = mount(LandingTimeDemo);
  await nextTick();
  expect(view.get('.human-measure').text()).toContain('0,022 px');
  expect(view.findAll('.subpixel-marker')).toHaveLength(1);
  await view.get('.demo-insight button').trigger('click');
  await view.get('.demo-insight button').trigger('click');
  expect(view.find('.subpixel-marker').exists()).toBe(false);
  resize([{ contentRect: { width: 200 } }]);
  await nextTick();
  expect(view.findAll('.subpixel-marker')).toHaveLength(1);
  expect(view.get('[data-band="humans"]').attributes('style')).toContain('width: 0.12%');
});
