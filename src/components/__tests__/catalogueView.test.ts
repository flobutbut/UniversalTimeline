import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import CatalogueView from '@/views/CatalogueView.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import PublicStoryCard from '@/components/catalogue/PublicStoryCard.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCatalogueBrowseStore } from '@/stores/useCatalogueBrowseStore';
import { installAccessGuard } from '@/router/access';
import { appRoutes } from '@/router/routes';
import type { StorySummary } from '@/types/database';

vi.mock('@/components/WikipediaImage.vue', () => ({ default: { props: ['titles', 'active'], template: '<div class="image-stub" />' } }));
const tag = { id: 'sciences', label: { fr: 'Sciences', en: 'Science' }, family: 'productions', parentId: null, position: 1 };
const stories: StorySummary[] = [
  { id: '1', title: { fr: 'Marie Curie', en: 'Marie Curie' }, description: { fr: 'Découvertes et radioactivité', en: '' }, author: 'Alice', ownerUserId: 'alice', categories: [], tags: [tag], isPublic: true, startDate: '1867', endDate: '1934' },
  { id: '2', title: { fr: 'Antiquité', en: 'Antiquity' }, author: 'Bob', ownerUserId: 'bob', categories: [], isPublic: true, startDate: '3000 BCE', endDate: '476' },
  { id: '3', title: { fr: 'Projet privé', en: '' }, author: 'Alice', ownerUserId: 'alice', categories: [], isPublic: false },
];
const api = StoryApiService.getInstance();
let view: ReturnType<typeof mount>;
let router: ReturnType<typeof createRouter>;
beforeEach(() => {
  setActivePinia(createPinia());
  const auth = useAuthStore(); auth.enabled = true; auth.ready = true;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  vi.spyOn(api, 'getListStories').mockResolvedValue(stories);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); });
async function start(path = '/catalogue') {
  const page = { template: '<div>Destination</div>' };
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route
    ? { ...route, component: route.name === 'catalogue' ? CatalogueView : page } : route) });
  installAccessGuard(router, useAuthStore());
  await router.push(path); await router.isReady();
  view = mount(RouterView, { global: { plugins: [router], stubs: { StoryTimeline: true } } });
  await flushPromises();
}
const titles = () => view.findAll('.public-story-card__open').map(link => link.text());

it('opens a real public route, shows only public frises and opens Exploration using native links', async () => {
  await start();
  expect(router.currentRoute.value.name).toBe('catalogue');
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
  expect(view.text()).toContain('Découvertes et radioactivité');
  expect(view.get('.catalogue-page__count').text()).toBe('2 frises à explorer');
  expect(view.find('.public-story-card__edit').exists()).toBe(false);
  expect(view.text()).not.toContain('Créer une frise');
  expect(view.getComponent(CatalogueFilters).props('hideVisibility')).toBe(true);
  expect(view.get('.public-story-card__open').attributes('href')).toBe('/timeline?story=1&entry=universe');
  await view.get('.public-story-card__open').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('timeline');
  expect(router.currentRoute.value.query).toEqual({ story: '1', entry: 'universe' });
});

it('keeps the workspace protected and offers editing only for frises the verified account may edit', async () => {
  await start('/database?story=1');
  expect(router.currentRoute.value.name).toBe('login');
  useAuthStore().account = { id: 'alice', isAdmin: false };
  await router.push('/catalogue'); await flushPromises();
  const edit = view.findAll('.public-story-card__edit');
  expect(edit).toHaveLength(1);
  expect(edit[0].attributes('href')).toBe('/database?story=1');
  await edit[0].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('database');
});

it('searches descriptions without accent sensitivity and combines themes with date filters', async () => {
  await start();
  await view.get('input[type="search"]').setValue('decouvertes');
  expect(titles()).toEqual(['Marie Curie']);
  await view.get('input[type="search"]').setValue('');
  const filters = view.getComponent(CatalogueFilters);
  expect(filters.props('tagOptions')).toEqual([{ value: 'sciences', label: 'Sciences', group: 'Productions' }]);
  filters.vm.$emit('update:tags', ['sciences']); await flushPromises();
  expect(titles()).toEqual(['Marie Curie']);
  filters.vm.$emit('update:timeRange', { oldBP: 5000, recentBP: 2000 }); await flushPromises();
  expect(titles()).toEqual([]);
  expect(view.text()).toContain('Aucune frise ne correspond');
  await view.findAll('button').find(button => button.text() === 'Effacer les filtres')!.trigger('click');
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
});

it('restores search, themes and scroll when returning from Exploration', async () => {
  await start();
  await view.get('input[type="search"]').setValue('Curie');
  view.getComponent(CatalogueFilters).vm.$emit('update:tags', ['sciences']); await flushPromises();
  const area = view.get('.catalogue-page');
  area.element.scrollTop = 420;
  await area.trigger('scroll');
  await view.get('.public-story-card__open').trigger('click'); await flushPromises();
  await router.push('/catalogue'); await flushPromises();
  expect((view.get('input[type="search"]').element as HTMLInputElement).value).toBe('Curie');
  expect(useCatalogueBrowseStore().tagIds).toEqual(['sciences']);
  expect(view.get('.catalogue-page').element.scrollTop).toBe(420);
  expect(titles()).toEqual(['Marie Curie']);
});

it('shows a retryable failure instead of an empty catalogue and recovers', async () => {
  vi.mocked(api.getListStories).mockRejectedValueOnce(new Error('API indisponible'));
  await start();
  expect(view.text()).toContain('API indisponible');
  expect(view.text()).not.toContain('Les frises arrivent bientôt');
  await view.findAll('button').find(button => button.text().includes('Réessayer'))!.trigger('click'); await flushPromises();
  expect(titles()).toHaveLength(2);
});

it('uses a distinct empty state when no public frise exists', async () => {
  vi.mocked(api.getListStories).mockResolvedValue([stories[2]]);
  await start();
  expect(view.text()).toContain('Les frises arrivent bientôt');
  expect(view.text()).not.toContain('Projet privé');
});

it('does not apply an abandoned catalogue response after leaving the page', async () => {
  let resolve!: (value: StorySummary[]) => void;
  vi.mocked(api.getListStories).mockImplementationOnce(() => new Promise(yes => { resolve = yes; }));
  await start();
  expect(view.text()).toContain('Chargement des frises');
  await router.push('/timeline'); await flushPromises();
  resolve(stories); await flushPromises();
  expect(router.currentRoute.value.name).toBe('timeline');
  expect(view.findComponent(PublicStoryCard).exists()).toBe(false);
});
