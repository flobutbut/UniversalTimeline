import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import ScrollLandingView from '@/views/ScrollLandingView.vue';
import { StoryApiService } from '@/services/StoryApiService';

vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/composables/useScrollJourney', async () => {
  const { ref } = await import('vue');
  const { journeyFrame, journeyChapters } = await import('@/lib/scrollJourney');
  return { useScrollJourney() {
    const frame = ref(journeyFrame(0));
    return { root: ref(), runway: ref(), stage: ref(), frame, reducedMotion: ref(false), schedule: () => {}, goTo: (index: number) => { frame.value = journeyFrame(index / (journeyChapters.length - 1)); } };
  } };
});
let view: ReturnType<typeof mount>;
let router: Router;
let pinia: Pinia;
const story = (id: string, isPublic = true) => ({ id, title: { fr: 'Frise publique', en: '' }, author: 'Auteur', categories: [], isPublic });
async function start() {
  pinia = createPinia();
  const page = { template: '<div />' };
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', name: 'landing', component: page }, { path: '/voyage', name: 'landing-scroll', component: page },
    { path: '/timeline', name: 'timeline', component: page }, { path: '/login', name: 'login', component: page },
    { path: '/database', name: 'database', component: page }, { path: '/legal/:page', name: 'legal', component: page },
  ] });
  await router.push('/voyage'); await router.isReady();
  view = mount(ScrollLandingView, { global: { plugins: [pinia, router] } });
  await flushPromises();
}
afterEach(() => { view?.unmount(); router?.options.history.destroy(); if (pinia) disposePinia(pinia); vi.restoreAllMocks(); });

it('links the initial chapter to an existing public story and preserves access to the first concept', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([story('3')]);
  await start();
  expect(view.get('.chapter-action a').attributes('href')).toBe('/timeline?story=3');
  expect(view.get('.journey-header nav a').attributes('href')).toBe('/');
  await view.get('.stage-controls button:last-child').trigger('click');
  expect(view.get('.journey-stage').attributes('data-chapter')).toBe('galaxy');
  expect(view.get('.chapter-action a').attributes('href')).toBe('/timeline?story=3');
});
it('falls back to the explorer when a story is private, absent or the catalogue is unavailable', async () => {
  const read = vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([story('3', false)]);
  await start();
  expect(view.get('.chapter-action a').attributes('href')).toBe('/timeline');
  view.unmount();
  read.mockRejectedValue(new Error('API indisponible'));
  await start();
  expect(view.get('.chapter-action a').text()).toBe('Explorer les frises');
  expect(view.get('.journey-stage').exists()).toBe(true);
});
it('ends with a familiar one-second scale and offers a complete direct reading', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  await start();
  await view.findAll('.chapter-navigation button')[12].trigger('click');
  expect(view.get('.journey-stage').attributes('data-chapter')).toBe('second');
  expect(view.get('.chapter-action a').attributes('href')).toBe('/login?mode=signup&redirect=/database');
  expect(view.get('.measure-unit').text()).toBe('seconde');
  expect(view.findAll('.journey-transcript li')).toHaveLength(13);
  await view.findAll('.journey-header nav a')[1].trigger('click');
  expect(view.get('#lecture').attributes('open')).toBeDefined();
});
