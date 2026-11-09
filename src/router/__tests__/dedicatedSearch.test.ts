import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import App from '@/App.vue';
import SearchView from '@/views/SearchView.vue';
import { appRoutes } from '@/router/routes';
import { installAccessGuard } from '@/router/access';
import { useAuthStore } from '@/stores/useAuthStore';
import { SearchApiService } from '@/services/SearchApiService';

vi.mock('@/services/FeedbackApiService', () => ({ feedbackApi: { settings: vi.fn().mockResolvedValue({ enabled: false }) } }));
vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
let view: ReturnType<typeof mount>, router: Router;
const api = SearchApiService.getInstance();
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(api, 'searchStoryEvents').mockResolvedValue([]);
  vi.spyOn(api, 'searchStories').mockResolvedValue([{ id: '9', label: { fr: 'Seconde Guerre mondiale', en: '' }, description: { fr: '1939–1945', en: '' }, matchedOn: 'title' }]);
  vi.spyOn(api, 'searchWikidataEntityLabels').mockResolvedValue([{ id: 'Q6534', label: 'Révolution française' }]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function start(path: string) {
  const pinia = createPinia(), auth = useAuthStore(pinia);
  auth.enabled = true; auth.ready = true;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route && route.name !== 'search'
    ? { ...route, component: { template: '<div>Destination</div>' } } : route) });
  installAccessGuard(router, auth);
  await router.push(path); await router.isReady();
  view = mount(App, { attachTo: document.body, global: { plugins: [pinia, router] } });
  await flushPromises();
}

it('opens the public search page, focuses the single field and preserves the full return destination', async () => {
  const from = '/timeline?story=9&period=ww2&entry=universe';
  await start(`/search?from=${encodeURIComponent(from)}`);
  expect(router.currentRoute.value.name).toBe('search');
  expect(view.find('header input').exists()).toBe(false);
  expect(document.activeElement).toBe(view.get('.search-page input').element);
  const back = view.getComponent(SearchView).get('a');
  expect(back.attributes('href')).toBe(from);
  await back.trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe(from);
});

it.each(['https://example.com', '//example.com', '/search?from=/search'])('uses a local fallback for an invalid return path: %s', async from => {
  await start(`/search?from=${encodeURIComponent(from)}`);
  expect(view.getComponent(SearchView).get('a').attributes('href')).toBe('/timeline');
});

it.each(['story', 'wikidata'] as const)('keeps results visible after blur and opens the same %s destination as the header', async kind => {
  await start('/search');
  const input = view.get('.search-page input');
  await input.setValue('Révolution');
  await vi.advanceTimersByTimeAsync(600); await flushPromises();
  (input.element as HTMLInputElement).blur();
  await vi.advanceTimersByTimeAsync(150); await flushPromises();
  const options = view.findAll('[role="option"]');
  expect(options).toHaveLength(2);
  await options[kind === 'story' ? 0 : 1].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe(kind === 'story' ? '/timeline?story=9' : '/generate?wikidata=Q6534');
});

it('clears search results when the account changes', async () => {
  await start('/search');
  await view.get('.search-page input').setValue('Guerre');
  await vi.advanceTimersByTimeAsync(600); await flushPromises();
  expect(view.findAll('[role="option"]')).toHaveLength(2);
  useAuthStore().identityVersion++; await flushPromises();
  expect(view.find('[role="option"]').exists()).toBe(false);
  expect((view.get('.search-page input').element as HTMLInputElement).value).toBe('');
});
