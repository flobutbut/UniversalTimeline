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
import { storyFixture } from '@/testFixtures/story';

const analytics = vi.hoisted(() => ({ track: vi.fn(), mode: 'consented' as 'exempt' | 'consented' }));
vi.mock('@/services/FeedbackApiService', () => ({ feedbackApi: { settings: vi.fn().mockResolvedValue({ enabled: false }) } }));
vi.mock('@/lib/analytics', async original => ({ ...(await original<typeof import('@/lib/analytics')>()), track: analytics.track, measurementMode: () => analytics.mode }));
vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

const period = (id: string, parentId: string | null, hasChildren: boolean): Period => ({ id, parentId, label: { fr: `Période ${id}`, en: '' }, startDate: 'M65', endDate: 'NOW', startYearsBP: 65000000, endYearsBP: 0, categories: [], hasParent: !!parentId, hasChildren, children: [], temporalLocation: '' });
const tree = (id: string) => [period(`root-${id}`, null, true), period(`mid-${id}`, `root-${id}`, true), period(`leaf-${id}`, `mid-${id}`, false)];
const event = (id: string): ListEvent => ({ id, date: '1944', dateYearsBP: 82, label: { fr: `Événement ${id}`, en: '' }, categories: [] });
const summary = (id: string) => ({ id, title: { fr: `Frise ${id}`, en: '' }, description: { fr: '', en: '' }, author: id === '8' ? 'alice' : 'Auteur', isPublic: id !== '8', categories: [] });
const stories = StoryApiService.getInstance();
const searches = SearchApiService.getInstance();
let pinia: Pinia;
let router: Router;
let view: ReturnType<typeof mount>;
beforeEach(() => {
  analytics.track.mockReset(); analytics.mode = 'consented';
  vi.spyOn(stories, 'getStory').mockImplementation(async id => storyFixture(id, tree(id), [event(`event-${id}`)]));
  vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([]);
  vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockResolvedValue([]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockImplementation(async id => [event(`event-${id}`)]);
  vi.spyOn(stories, 'getListStories').mockResolvedValue(['1', '7', '8'].map(summary));
  vi.spyOn(stories, 'getStoryPeriods').mockImplementation(async id => tree(id));
  vi.spyOn(stories, 'getSuggestions').mockResolvedValue([]);
  vi.spyOn(searches, 'searchStoryEvents').mockResolvedValue([]);
  vi.spyOn(searches, 'searchStories').mockResolvedValue([{ id: '7', label: { fr: 'Frise 7', en: '' }, description: { fr: '', en: '' }, matchedOn: 'content' }]);
  vi.spyOn(searches, 'searchWikidataEntityLabels').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); disposePinia(pinia); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });
async function start(path: string) {
  pinia = createPinia();
  const auth = useAuthStore(pinia); auth.enabled = true; auth.ready = true;
  auth.account = { id: 'alice', isAdmin: false };
  auth.profile = { username: 'alice' } as typeof auth.profile;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/catalogue', name: 'catalogue', meta: { public: true }, component: { template: '<div>Catalogue</div>' } },
    { path: '/timeline', name: 'timeline', component: HomeView, meta: { public: true } },
    { path: '/generate', name: 'wikidata-generation', component: { template: '<div />' }, meta: { public: true } },
    ...['database', 'graph', 'events', 'design-system'].map(name => ({ path: '/' + name, name, component: { template: '<div />' } })),
  ] });
  installAccessGuard(router, auth);
  await router.push(path); await router.isReady();
  view = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body });
  await flushPromises();
}
const calls = (event: string) => analytics.track.mock.calls.filter(call => call[0] === event).map(call => call[1]);

it('reports each displayed position once, with how it was reached and how deep it is', async () => {
  await start('/timeline?story=7');
  expect(calls('timeline_position_viewed')).toEqual([expect.objectContaining({
    story_visibility: 'public', story_id: '7', story_title: 'Frise 7', own_story: false, signed_in: true, via: 'link', depth: 1,
    view: 'period', period_id: 'root-7', period_title: 'Période root-7',
    child_count: 1, event_count: 1, has_previous: false, has_next: false, story_max_depth: 3,
  })]);
  view.getComponent(PeriodGrid).vm.$emit('period-click', tree('7')[1]); await flushPromises();
  expect(calls('timeline_position_viewed').at(-1)).toEqual(expect.objectContaining({ via: 'period', depth: 2, period_id: 'mid-7' }));
  view.getComponent(PeriodGrid).vm.$emit('go-back'); await flushPromises();
  expect(calls('timeline_position_viewed').at(-1)).toEqual(expect.objectContaining({ via: 'back', depth: 1 }));
  router.back(); await flushPromises();
  expect(calls('timeline_position_viewed').at(-1)).toEqual(expect.objectContaining({ via: 'history', depth: 2 }));
  expect(calls('timeline_position_viewed')).toHaveLength(4);

  // Leaving for another page and coming back to the same position is not a new position.
  await router.push('/database'); await flushPromises(); await router.back(); await flushPromises();
  expect(calls('timeline_position_viewed')).toHaveLength(4);

  view.getComponent(PeriodGrid).vm.$emit('event-click', event('event-7')); await flushPromises();
  expect(calls('timeline_event_opened')).toEqual([expect.objectContaining({ story_id: '7', event_id: 'event-7', event_title: 'Événement event-7', depth: 2 })]);

  // Entering a period without sub-period: a leaf, at the bottom of the frise.
  view.getComponent(PeriodGrid).vm.$emit('period-click', tree('7')[2]); await flushPromises();
  expect(calls('timeline_position_viewed').at(-1)).toEqual(expect.objectContaining({
    via: 'period', depth: 3, period_id: 'leaf-7', child_count: 0, story_max_depth: 3, has_previous: false, has_next: false,
  }));
});

it('counts a private frise without identifying it, nor its periods and events', async () => {
  await start('/timeline?story=8');
  const [position] = calls('timeline_position_viewed');
  expect(position).toEqual(expect.objectContaining({ story_visibility: 'private', own_story: true, depth: 1, view: 'period' }));
  view.getComponent(PeriodGrid).vm.$emit('event-click', event('event-8')); await flushPromises();
  const sent = JSON.stringify(analytics.track.mock.calls);
  expect(sent).not.toMatch(/Frise 8|root-8|event-8|"8"/);
});

it('reports a search that opens a frise, then the position it led to', async () => {
  vi.useFakeTimers(); await start('/timeline?story=1');
  const input = view.get('header input'); await input.trigger('focus'); await input.setValue('Marsh'); await input.setValue('Marshall');
  await vi.advanceTimersByTimeAsync(600); await flushPromises();
  await input.trigger('keydown', { key: 'ArrowDown' }); await input.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(calls('search_completed')).toEqual([{ surface: 'header', outcome: 'story', query_length: 8, reformulations: 0,
    story_results: 1, event_results: 0, wikidata_results: 0, position: 1, matched_on: 'content' }]);
  expect(calls('timeline_position_viewed').at(-1)).toEqual(expect.objectContaining({ via: 'search', story_id: '7' }));
});

it('keeps the guarded term of a consented search without frise, and redacts what may be personal', async () => {
  vi.useFakeTimers(); await start('/timeline?story=1');
  vi.mocked(searches.searchStories).mockResolvedValue([]);
  const input = view.get('header input');
  for (const text of ['  Traité  de VERSAILLES 1919 ', 'jean.dupont@exemple.fr', '06 12 34 56 78']) {
    await input.trigger('focus'); await input.setValue(text);
    await vi.advanceTimersByTimeAsync(600); await flushPromises();
    await input.trigger('keydown', { key: 'Escape' }); await flushPromises();
  }
  expect(calls('search_completed')).toEqual([
    expect.objectContaining({ outcome: 'abandon', story_results: 0, query: 'traité de versailles 1919' }),
    expect.objectContaining({ outcome: 'abandon', story_results: 0, query_redacted: true }),
    expect.objectContaining({ outcome: 'abandon', story_results: 0, query_redacted: true }),
  ]);
  expect(JSON.stringify(analytics.track.mock.calls)).not.toMatch(/dupont|56 78/);
});

it('never sends the typed term of an anonymous visit', async () => {
  vi.useFakeTimers(); await start('/timeline?story=1');
  analytics.mode = 'exempt';
  vi.mocked(searches.searchStories).mockResolvedValue([]);
  const input = view.get('header input');
  await input.trigger('focus'); await input.setValue('Traité de Versailles');
  await vi.advanceTimersByTimeAsync(600); await flushPromises();
  await input.trigger('keydown', { key: 'Escape' }); await flushPromises();
  const [search] = calls('search_completed');
  expect(search).toEqual(expect.objectContaining({ outcome: 'abandon', story_results: 0, query_length: 20 }));
  expect(search).not.toHaveProperty('query'); expect(search).not.toHaveProperty('query_redacted');
});
