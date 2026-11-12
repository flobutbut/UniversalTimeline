import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import CatalogueView from '@/views/CatalogueView.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import PublicStoryCard from '@/components/catalogue/PublicStoryCard.vue';
import { StoryApiService, type PublicStoryCataloguePage } from '@/services/StoryApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useCatalogueBrowseStore } from '@/stores/useCatalogueBrowseStore';
import { installAccessGuard } from '@/router/access';
import { appRoutes } from '@/router/routes';
import type { StorySummary } from '@/types/database';

vi.mock('@/components/WikipediaImage.vue', () => ({ default: { props: ['titles', 'active'], template: '<div class="image-stub" />' } }));
const tag = { id: 'sciences', label: { fr: 'Sciences', en: 'Science' }, family: 'productions', parentId: null, position: 1 };
const stories: StorySummary[] = [
  { id: '2', title: { fr: 'Marie Curie', en: 'Marie Curie' }, description: { fr: 'Découvertes et radioactivité', en: '' }, author: 'Alice', ownerUserId: 'alice', categories: [], tags: [tag], isPublic: true, startDate: '1867', endDate: '1934' },
  { id: '1', title: { fr: 'Antiquité', en: 'Antiquity' }, author: 'Bob', ownerUserId: 'bob', categories: [], isPublic: true, startDate: '3000 BCE', endDate: '476' },
];
const page = (items = stories, nextCursor: string | null = null, total: number | null = items.length): PublicStoryCataloguePage => ({ items, nextCursor, total, publicTotal: 1000, tags: [tag] });
const api = StoryApiService.getInstance();
let view: ReturnType<typeof mount>;
let router: ReturnType<typeof createRouter>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  setActivePinia(createPinia());
  const auth = useAuthStore(); auth.enabled = true; auth.ready = true;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  vi.spyOn(api, 'getListStories').mockResolvedValue([]);
  vi.spyOn(api, 'getPublicCatalogue').mockResolvedValue(page());
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function start(path = '/catalogue') {
  const placeholder = { template: '<div>Destination</div>' };
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route
    ? { ...route, component: route.name === 'catalogue' ? CatalogueView : placeholder } : route) });
  installAccessGuard(router, useAuthStore());
  await router.push(path); await router.isReady();
  view = mount(RouterView, { global: { plugins: [router], stubs: { StoryTimeline: true } } });
  await flushPromises();
}
const titles = () => view.findAll('.public-story-card__open').map(link => link.text());
const button = (name: string) => view.findAll('button').find(item => item.text() === name)!;
async function search(value: string) {
  await view.get('input[type="search"]').setValue(value);
  await vi.advanceTimersByTimeAsync(300); await flushPromises();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { resolve, promise };
}

it('loads a public page without ever fetching the full workspace catalogue and opens Exploration', async () => {
  useDataStore().stories = [{ ...stories[0], id: '99', title: { fr: 'Projet privé', en: '' }, isPublic: false }];
  await start();
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
  expect(view.text()).not.toContain('Projet privé');
  expect(api.getListStories).not.toHaveBeenCalled();
  expect(view.get('.catalogue-page__count').text()).toBe('2 frises à explorer');
  expect(view.getComponent(CatalogueFilters).props('hideVisibility')).toBe(true);
  expect(view.get('.public-story-card__open').attributes('href')).toBe('/timeline?story=2&entry=universe');
  await view.get('.public-story-card__open').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('timeline');
});

it('keeps the workspace protected and has no card actions even for the owner', async () => {
  await start('/database?story=2');
  expect(router.currentRoute.value.name).toBe('login');
  useAuthStore().account = { id: 'alice', isAdmin: false };
  await router.push('/catalogue'); await flushPromises();
  const card = view.getComponent(PublicStoryCard);
  expect(card.find('button').exists()).toBe(false);
  expect(card.findAll('a')).toHaveLength(1);
  expect(card.text()).not.toContain('Explorer la frise');
  expect(card.text()).not.toContain('Éditer');
});

it('debounces search and sends every filter to the server, retaining global theme choices', async () => {
  vi.mocked(api.getPublicCatalogue).mockResolvedValueOnce(page([stories[1]]));
  await start();
  expect(view.getComponent(CatalogueFilters).props('tagOptions')).toEqual([{ value: 'sciences', label: 'Sciences', group: 'Productions' }]);
  vi.mocked(api.getPublicCatalogue).mockResolvedValue(page([stories[0]]));
  await view.get('input[type="search"]').setValue('Cur');
  await view.get('input[type="search"]').setValue('Curie');
  expect(api.getPublicCatalogue).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(300); await flushPromises();
  expect(titles()).toEqual(['Marie Curie']);
  const filters = view.getComponent(CatalogueFilters);
  filters.vm.$emit('update:tags', ['sciences']); await flushPromises();
  filters.vm.$emit('update:timeRange', { oldBP: 5000, recentBP: 2000 }); await flushPromises();
  expect(api.getPublicCatalogue).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Curie', tagIds: ['sciences'], timeRange: { oldBP: 5000, recentBP: 2000 } }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('loads the next cursor once even if the bottom is reached repeatedly', async () => {
  const next = deferred<PublicStoryCataloguePage>();
  vi.mocked(api.getPublicCatalogue).mockResolvedValueOnce(page([stories[0]], '2', 1000)).mockReturnValueOnce(next.promise);
  await start();
  expect(view.get('.catalogue-page__count').text()).toBe('1 frise affichée sur 1000');
  const area = view.get('.catalogue-page');
  Object.defineProperty(area.element, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(area.element, 'scrollHeight', { configurable: true, value: 1800 });
  area.element.scrollTop = 900;
  await area.trigger('scroll'); await area.trigger('scroll'); await flushPromises();
  expect(api.getPublicCatalogue).toHaveBeenCalledTimes(2);
  expect(api.getPublicCatalogue).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ cursor: '2' }));
  expect(titles()).toEqual(['Marie Curie']);
  next.resolve(page([stories[1]], null, 2)); await flushPromises();
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
  expect(view.text()).toContain('Vous avez parcouru toutes les frises.');
});

it('preserves loaded cards on a next-page failure and retries the same cursor explicitly', async () => {
  vi.mocked(api.getPublicCatalogue).mockResolvedValueOnce(page([stories[0]], '2', 2)).mockRejectedValueOnce(new Error('Suite indisponible')).mockResolvedValueOnce(page([stories[1]]));
  await start();
  await button('Charger plus de frises').trigger('click'); await flushPromises();
  expect(titles()).toEqual(['Marie Curie']);
  expect(view.text()).toContain('Suite indisponible');
  await view.get('.catalogue-page').trigger('scroll');
  expect(api.getPublicCatalogue).toHaveBeenCalledTimes(2);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
  expect(api.getPublicCatalogue).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ cursor: '2' }));
});

it('discards a stale next page when the filters change and aborts its request', async () => {
  const old = deferred<PublicStoryCataloguePage>();
  vi.mocked(api.getPublicCatalogue).mockResolvedValueOnce(page([stories[0]], '2', 2)).mockReturnValueOnce(old.promise).mockResolvedValueOnce(page([stories[1]]));
  await start();
  await button('Charger plus de frises').trigger('click'); await flushPromises();
  const signal = vi.mocked(api.getPublicCatalogue).mock.calls[1][1]!.signal!;
  await search('Antiquité');
  expect(signal.aborted).toBe(true);
  old.resolve(page([stories[0]])); await flushPromises();
  expect(titles()).toEqual(['Antiquité']);
});

it('restores all loaded pages, search, themes and scroll on return from Exploration', async () => {
  const browse = useCatalogueBrowseStore(); browse.search = 'Curie'; browse.tagIds = ['sciences'];
  vi.mocked(api.getPublicCatalogue).mockResolvedValueOnce(page([stories[0]], '2', 2)).mockResolvedValueOnce(page([stories[1]]));
  await start();
  await button('Charger plus de frises').trigger('click'); await flushPromises();
  const area = view.get('.catalogue-page'); area.element.scrollTop = 420; await area.trigger('scroll');
  await view.get('.public-story-card__open').trigger('click'); await flushPromises();
  await router.push('/catalogue'); await flushPromises();
  expect((view.get('input[type="search"]').element as HTMLInputElement).value).toBe('Curie');
  expect(browse.tagIds).toEqual(['sciences']);
  expect(view.get('.catalogue-page').element.scrollTop).toBe(420);
  expect(titles()).toEqual(['Marie Curie', 'Antiquité']);
  expect(api.getPublicCatalogue).toHaveBeenCalledTimes(2);
});

it('shows a retryable first-page failure and distinguishes an empty catalogue from an empty search', async () => {
  vi.mocked(api.getPublicCatalogue).mockRejectedValueOnce(new Error('API indisponible')).mockResolvedValueOnce({ ...page([]), publicTotal: 0 });
  await start();
  expect(view.text()).toContain('API indisponible');
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Les frises arrivent bientôt');
  vi.mocked(api.getPublicCatalogue).mockResolvedValue(page([]));
  await search('Introuvable');
  expect(view.text()).toContain('Aucune frise ne correspond');
  vi.mocked(api.getPublicCatalogue).mockResolvedValue(page());
  await button('Effacer les filtres').trigger('click'); await flushPromises();
  expect(titles()).toHaveLength(2);
});

it('does not publish an abandoned response after the catalogue is unmounted', async () => {
  const old = deferred<PublicStoryCataloguePage>();
  vi.mocked(api.getPublicCatalogue).mockReturnValueOnce(old.promise);
  await start();
  await router.push('/timeline'); await flushPromises();
  old.resolve(page()); await flushPromises();
  expect(useDataStore().publicCatalogue).toBeNull();
  expect(view.findComponent(PublicStoryCard).exists()).toBe(false);
});
