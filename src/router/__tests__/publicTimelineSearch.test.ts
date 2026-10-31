import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import App from '@/App.vue';
import HomeView from '@/views/HomeView.vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { SearchApiService } from '@/services/SearchApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { installAccessGuard } from '@/router/access';
import type { ListEvent, Period } from '@/types/database';

vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const period = (id: string, parentId: string | null = null): Period => ({ id, parentId, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', startYearsBP: 65000000, endYearsBP: 0, categories: [], hasParent: !!parentId, hasChildren: !parentId, children: [], temporalLocation: '' });
const event = (id: string): ListEvent => ({ id, date: '1944', dateYearsBP: 82, label: { fr: id, en: '' }, categories: [] });
const summary = (id: string) => ({ id, title: { fr: `Frise ${id}`, en: '' }, description: { fr: `Résumé ${id}`, en: '' }, author: 'Auteur', isPublic: true, categories: [] });
const periods = PeriodApiService.getInstance();
const events = EventApiService.getInstance();
const stories = StoryApiService.getInstance();
const searches = SearchApiService.getInstance();
let pinia: Pinia;
let router: Router;
let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.spyOn(stories, 'getStory').mockResolvedValue({ childStories: [] } as never);
  vi.spyOn(periods, 'getListPeriods').mockResolvedValue([period('unrelated-catalogue')]);
  vi.spyOn(events, 'getListEvents').mockResolvedValue([event('unrelated-event')]);
  vi.spyOn(events, 'getStoryListEvents').mockImplementation(async id => [event(`event-${id}`)]);
  vi.spyOn(stories, 'getListStories').mockResolvedValue(['1', '2', '7', '8'].map(summary));
  vi.spyOn(stories, 'getStoryPeriods').mockImplementation(async id => [period(`root-${id}`), period(`leaf-${id}`, `root-${id}`)]);
  vi.spyOn(stories, 'getSuggestions').mockResolvedValue([]);
  vi.spyOn(searches, 'searchStories').mockResolvedValue([{ id: '7', label: { fr: 'Frise 7', en: '' }, description: { fr: 'Résumé', en: '' }, matchedOn: 'content' }]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); disposePinia(pinia); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });
async function start(path: string, signedIn = false) {
  pinia = createPinia();
  const auth = useAuthStore(pinia); auth.enabled = true; auth.ready = true;
  if (signedIn) auth.account = { id: 'alice', isAdmin: false };
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/timeline', name: 'timeline', component: HomeView, meta: { public: true } },
    ...['database', 'graph', 'events', 'design-system'].map(name => ({ path: '/' + name, name, component: { template: '<div />' } })),
    { path: '/login', name: 'login', component: { template: '<div>Login</div>' }, meta: { public: true } },
  ] });
  installAccessGuard(router, auth);
  await router.push(path); await router.isReady();
  view = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body });
  await flushPromises();
}

it.each([false, true])('opens the complete selected story from a real header search (signed in: %s)', async signedIn => {
  vi.useFakeTimers(); await start('/timeline', signedIn);
  const input = view.get('header input'); await input.trigger('focus'); await input.setValue('Marshall');
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
  expect(view.get('[role="option"]').text()).toContain('Frise 7');
  await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7');
  const grid = view.getComponent(PeriodGrid);
  expect(grid.props('currentStoryId')).toBe('7');
  expect(grid.props('periods').map((p: Period) => p.id)).toEqual(['leaf-7']);
  expect(grid.props('events').map((e: ListEvent) => e.id)).toEqual(['event-7']);
  expect(periods.getListPeriods).not.toHaveBeenCalled(); expect(events.getListEvents).not.toHaveBeenCalled();
  expect(view.find('[role="dialog"]').exists()).toBe(false);
});
it('supports a direct story link and navigation to a child story and the timeline breadcrumb', async () => {
  vi.mocked(stories.getSuggestions).mockResolvedValue([{ id: '2', title: { fr: 'Frise 2', en: '' }, parentStoryId: '7' }]);
  await start('/timeline?story=7');
  await view.get('.period-card--timeline').trigger('click'); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('2');
  expect(view.get('[aria-label="Fil d’Ariane de la timeline"]').text()).toContain('Frise 7');
  await view.get('[aria-label="Fil d’Ariane de la timeline"]').findAll('button')[0].trigger('click'); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('1');
});
it('restores the story associated with browser history', async () => {
  await start('/timeline?story=7');
  await router.push('/timeline?story=8'); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('8');
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('7');
});
it('keeps an empty story empty instead of displaying unrelated catalogue content', async () => {
  vi.mocked(stories.getStoryPeriods).mockResolvedValue([]);
  vi.mocked(events.getStoryListEvents).mockResolvedValue([]);
  await start('/timeline?story=8');
  expect(view.getComponent(PeriodGrid).props('periods')).toEqual([]);
  expect(view.getComponent(PeriodGrid).props('events')).toEqual([]);
  expect(periods.getListPeriods).not.toHaveBeenCalled();
});
it('refuses an unavailable story before loading its associations', async () => {
  await start('/timeline?story=99');
  expect(view.get('[role="alert"]').text()).toContain('introuvable ou n’est pas accessible');
  expect(stories.getStoryPeriods).not.toHaveBeenCalled(); expect(events.getStoryListEvents).not.toHaveBeenCalled();
});
it.each(['/timeline?story=one', '/timeline?story=1&story=2', '/timeline?story=2147483648'])('refuses an invalid story target: %s', async path => {
  await start(path);
  expect(view.get('[role="alert"]').text()).toContain('invalide');
  expect(stories.getStoryPeriods).not.toHaveBeenCalled();
});
it('keeps association failures retryable', async () => {
  vi.mocked(stories.getStoryPeriods).mockRejectedValueOnce(new Error('Lecture indisponible'));
  await start('/timeline?story=7');
  expect(view.get('[role="alert"]').text()).toContain('Lecture indisponible');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.getComponent(PeriodGrid).props('periods').map((p: Period) => p.id)).toEqual(['leaf-7']);
});
it('discards stale story contents after a newer story is requested', async () => {
  let resolve!: (periods: Period[]) => void;
  vi.mocked(stories.getStoryPeriods).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  await start('/timeline?story=7');
  await router.push('/timeline?story=8'); await flushPromises();
  resolve([period('late')]); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('8');
  expect(view.getComponent(PeriodGrid).props('periods').map((p: Period) => p.id)).toEqual(['leaf-8']);
});
it('clears a private search result when the account changes', async () => {
  vi.useFakeTimers(); await start('/timeline', true);
  const input = view.get('header input'); await input.trigger('focus'); await input.setValue('Marshall');
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
  expect(view.find('[role="option"]').exists()).toBe(true);
  useAuthStore(pinia).account = null; useAuthStore(pinia).identityVersion++; await flushPromises();
  expect(view.find('[role="option"]').exists()).toBe(false);
  expect(view.get('header input').element.value).toBe('');
});
