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
import { apiClient } from '@/services/ApiClient';

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
  vi.spyOn(stories, 'getStory').mockImplementation(async id => storyFixture(id, [period(`root-${id}`), period(`leaf-${id}`, `root-${id}`)], [event(`event-${id}`)]));
  vi.spyOn(periods, 'getListPeriods').mockResolvedValue([period('unrelated-catalogue')]);
  vi.spyOn(events, 'getListEvents').mockResolvedValue([event('unrelated-event')]);
  vi.spyOn(events, 'getStoryListEvents').mockImplementation(async id => [event(`event-${id}`)]);
  vi.spyOn(stories, 'getListStories').mockResolvedValue(['1', '2', '7', '8'].map(summary));
  vi.spyOn(stories, 'getStoryPeriods').mockImplementation(async id => [period(`root-${id}`), period(`leaf-${id}`, `root-${id}`)]);
  vi.spyOn(stories, 'getSuggestions').mockResolvedValue([]);
  vi.spyOn(searches, 'searchStoryEvents').mockResolvedValue([]);
  vi.spyOn(searches, 'searchStories').mockResolvedValue([{ id: '7', label: { fr: 'Frise 7', en: '' }, description: { fr: 'Résumé', en: '' }, matchedOn: 'content' }]);
  vi.spyOn(searches, 'searchWikidataEntityLabels').mockResolvedValue([]);
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
    { path: '/generate', name: 'wikidata-generation', component: { template: '<div>Aperçu Wikidata</div>' }, meta: { public: true } },
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

it.each([false, true])('opens a public generation preview from a Wikidata subject without importing it (signed in: %s)', async signedIn => {
  vi.useFakeTimers(); await start('/timeline', signedIn);
  vi.mocked(searches.searchStories).mockResolvedValue([]);
  vi.mocked(searches.searchWikidataEntityLabels).mockResolvedValue([{ id: 'Q1', label: 'Univers' }]);
  const input = view.get('header input'); await input.trigger('focus'); await input.setValue('Univers');
  await vi.advanceTimersByTimeAsync(600); await flushPromises();
  await view.get('[role="option"]').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/generate?wikidata=Q1');
  expect(view.text()).toContain('Aperçu Wikidata');
  expect(apiClient.post).not.toHaveBeenCalled();
});

it('starts the public timeline at the Universe with its full duration, before exploring Earth', async () => {
  vi.mocked(stories.getStory).mockResolvedValue(storyFixture('1', [
    { ...period('universe'), label:{fr:'Univers',en:''}, startDate:'G13.8', startYearsBP:13.8e9 },
    { ...period('earth','universe'), label:{fr:'Terre',en:''}, startDate:'G4.54', startYearsBP:4.54e9 },
  ]));
  await start('/timeline');
  const grid = view.getComponent(PeriodGrid);
  expect(grid.props('currentStoryId')).toBe('1');
  expect(grid.props('currentPeriod').label.fr).toBe('Univers');
  expect(grid.props('currentPeriod').startYearsBP).toBe(13.8e9);
  expect(grid.props('periods').map((p:Period) => p.label.fr)).toEqual(['Terre']);
});

it('resets the first frise to its overview from the story breadcrumb and restores the period with browser Back', async () => {
  await start('/timeline?story=1&period=leaf-1');
  await view.get('nav[aria-label="Fil d’Ariane des frises"] button[aria-current="location"]').trigger('click');
  await flushPromises();
  expect(router.currentRoute.value.query).toMatchObject({ story: '1', view: 'overview' });
  expect(router.currentRoute.value.query.period).toBeUndefined();
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
  expect(view.getComponent(PeriodGrid).props('periods').map((period: Period) => period.id)).toEqual(['root-1']);

  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentPeriod')?.id).toBe('leaf-1');
});

it.each([
  { count: 1, displayAsPeriod: false }, { count: 2, displayAsPeriod: false },
  { count: 1, displayAsPeriod: true }, { count: 2, displayAsPeriod: true },
])('opens period-linked frises from the header with their real return anchor ($count choices, displayed as period: $displayAsPeriod)', async ({ count, displayAsPeriod }) => {
  vi.mocked(stories.getListStories).mockResolvedValue(['38', '5', '39'].map(summary));
  const homo = { ...event('homo'), date: 'M2.8' };
  vi.mocked(stories.getStory).mockImplementation(async id => storyFixture(id,
    [{ ...period(id === '38' ? 'hominins' : 'homo-period'), startDate: id === '38' ? 'M7' : 'M2.8', endDate: id === '38' ? 'M1.2' : 'TODAY' }],
    [homo], id === '38' ? [
      { id: '5', title_fr: 'Genre Homo', atRoot: false, anchors: [{ type: 'period', id: 'hominins', displayAsPeriod }] },
      { id: '39', title_fr: 'Histoire des techniques', atRoot: false, anchors: [{ type: 'period', id: 'hominins', displayAsPeriod }] },
    ].slice(0, count) : []));
  await start('/timeline?story=38');
  const header = view.get('.home-view__story-selector');
  await header.get('button').trigger('click'); await flushPromises();
  const options = document.body.querySelectorAll<HTMLElement>('.associated-stories__item');
  expect([...options].map(option => option.querySelector('strong')?.textContent?.trim())).toEqual(['Vue d’ensemble de la frise', ...['Genre Homo', 'Histoire des techniques'].slice(0, count)]);
  options[1].click();
  await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('5');
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('5');
  expect(router.options.history.state).toMatchObject({ timelineReturnPath: [
    { storyId: '38', view: 'overview', anchor: { type: 'period', id: 'hominins' }, anchorStoryId: '38' },
  ] });
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('38');
  expect(view.get('.home-view__story-selector').exists()).toBe(true);
});

it('opens a leaf directly and restores it through browser history after visiting an associated frise', async () => {
  vi.mocked(stories.getStory).mockImplementation(async id => storyFixture(id,
    [period(`root-${id}`), period(id === '2' ? 'leaf-7' : `leaf-${id}`, `root-${id}`), ...(id === '2' ? [period('detail-child','leaf-7')] : [])],
    [event(`event-${id}`)], id === '7' ? [{ id: '2', title_fr: 'Frise 2', anchors: [{ type: 'period', id: 'leaf-7' }] }] : []));
  await start('/timeline?story=7');
  await view.get('[data-period-id="leaf-7"]').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=leaf-7');
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('7');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf-7');
  await view.get('[aria-label="1 frise associée à leaf-7"]').trigger('click'); await flushPromises();
  (document.body.querySelector('.associated-stories__item') as HTMLButtonElement).click(); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=2&period=leaf-7');
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('2');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf-7');
  expect(view.get('[aria-label="Fil d’Ariane de la timeline"]').text()).not.toContain('Frise 7');
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=leaf-7');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf-7');
  const returned = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await returned; await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('root-7');
});

it('opens an associated frise at its overview when the shared period has no children there', async () => {
  vi.mocked(stories.getStory).mockImplementation(async id => storyFixture(id,
    id === '2' ? [period('leaf-7')] : [period('root-7'),period('leaf-7','root-7')], [],
    id === '7' ? [{id:'2',title_fr:'Frise 2',anchors:[{type:'period',id:'leaf-7'}]}] : []));
  await start('/timeline?story=7');
  await view.get('[aria-label="1 frise associée à leaf-7"]').trigger('click'); await flushPromises();
  (document.body.querySelector('.associated-stories__item') as HTMLButtonElement).click(); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=2&view=overview');
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
});

it('allows next and previous to consult a leaf while hiding the missing direction', async () => {
  vi.mocked(stories.getStory).mockResolvedValue(storyFixture('7', [
    period('root-7'),
    {...period('branch','root-7'),endDate:'M30'},
    {...period('leaf','root-7'),startDate:'M30',startYearsBP:30e6},
    {...period('child','branch'),startDate:'M60',endDate:'M40'},
  ]));
  await start('/timeline?story=7&period=branch');
  await view.get('nav[aria-label="Périodes de même niveau"] button').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=leaf');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf');
  const controls = view.get('nav[aria-label="Périodes de même niveau"]').findAll('button');
  expect(controls.map(control => control.text())).toEqual(['Période précédente - branch']);
  await controls[0].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=branch');
});

it('restores a focused leaf from its address and records the local parent and overview in history', async () => {
  await start('/timeline?story=7&period=leaf-7');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf-7');
  await view.get('.period-card--parent .period-card__title-action').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=root-7');
  await view.get('.period-card--parent .period-card__title-action').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&view=overview');
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
  const address = router.currentRoute.value.fullPath;
  view.unmount(); router.options.history.destroy(); disposePinia(pinia);
  await start(address);
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
  expect(view.getComponent(PeriodGrid).props('periods').map((p: Period) => p.id)).toEqual(['root-7']);
});

it('updates the address when a period ancestor is chosen in the breadcrumb', async () => {
  await start('/timeline?story=7&period=leaf-7');
  const crumbs = view.get('[aria-label="Fil d’Ariane de la timeline"]').findAll('button');
  await crumbs[0].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&period=root-7');
  expect(view.get('[aria-label="Fil d’Ariane de la timeline"]').findAll('button')).toHaveLength(0);
  await view.get('.period-card--parent .period-card__title-action').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=7&view=overview');
});

it('closes a choice between detail frises when leaving the cached timeline', async () => {
  const reference = period('subject');
  const older = {...period('older'),startDate:'M100',startYearsBP:1e8,endDate:'M65',endYearsBP:65e6};
  const context = { id:'8', title:{fr:'Parcours',en:''}, periods:[older,reference], presentations:[
    {storyId:'7',periodId:'subject',title:{fr:'Première vue',en:''}},
    {storyId:'2',periodId:'subject',title:{fr:'Autre vue',en:''}},
  ] };
  vi.mocked(stories.getStory).mockImplementation(async id => ({ ...storyFixture(id, [older,reference]), navigationContexts:[context] }));
  await start('/timeline?story=8&period=older');
  await view.get('nav[aria-label="Périodes de même niveau"] button').trigger('click'); await flushPromises();
  expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Autre vue');
  await router.push('/database'); await flushPromises();
  expect(document.body.querySelector('[role="dialog"]')).toBeNull();
});

it.each(['/timeline?story=7&view=other', '/timeline?story=7&view=overview&period=leaf-7', '/timeline?story=7&period=', '/timeline?story=7&entry=other', '/timeline?story=7&entry=universe&entry=universe'])('refuses an invalid timeline position: %s', async path => {
  await start(path);
  expect(view.get('[role="alert"]').text()).toContain('invalide');
  expect(view.findComponent(PeriodGrid).exists()).toBe(false);
});

it('rejects a period that does not belong to the destination frise', async () => {
  await start('/timeline?story=7&period=leaf-8');
  expect(view.get('[role="alert"]').text()).toContain('n’appartient plus à la frise');
});

it('restores the story associated with browser history', async () => {
  await start('/timeline?story=7');
  await router.push('/timeline?story=8'); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('8');
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('7');
});

it('separates visited frises from local periods and restores a visited position without duplicates', async () => {
  await start('/timeline?story=7&period=leaf-7');
  await router.push('/timeline?story=8&period=leaf-8'); await flushPromises();
  await router.push('/timeline?story=2'); await flushPromises();
  const visited = () => view.get('nav[aria-label="Fil d’Ariane des frises"]');
  // Quatre étapes pour trois places : l'Univers passe dans le menu du fil compacté.
  expect(visited().findAll('li').map(item => item.text())).toEqual(['', '/Frise : Frise 7', '/Frise : Frise 8', '/Frise : Frise 2']);
  await visited().get('.story-breadcrumb__overflow button').trigger('click'); await flushPromises();
  expect(visited().findAll('[role="menuitem"]').map(item => item.text())).toEqual(['Frise : Frise 1']);
  await visited().get('.story-breadcrumb__overflow button').trigger('click'); await flushPromises();
  const local = view.get('nav[aria-label="Fil d’Ariane de la timeline"]');
  expect(local.text()).toBe('root-2'); expect(local.text()).not.toContain('Frise');
  await visited().findAll('button').find(button => button.text() === 'Frise : Frise 8')!.trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=8&period=leaf-8');
  expect(visited().findAll('li')).toHaveLength(3);
  expect(view.get('nav[aria-label="Fil d’Ariane de la timeline"]').text()).toBe('root-8/leaf-8');
  await router.push('/timeline?story=7&view=overview'); await flushPromises();
  expect(visited().findAll('li')).toHaveLength(2);
  expect(view.find('nav[aria-label="Fil d’Ariane de la timeline"]').exists()).toBe(false);
});

it('starts a catalogue selection on its Universe path instead of appending the previously opened frise', async () => {
  vi.mocked(stories.getStory).mockImplementation(async id => ({
    ...storyFixture(id, [period(`root-${id}`), period(`leaf-${id}`, `root-${id}`)], [],
      id === '1' || id === '2' ? [{ id: id === '1' ? '2' : '8', title_fr: `Frise ${id === '1' ? '2' : '8'}`, anchors: [{ type: 'period', id: `root-${id}` }] }] : []),
    parentStories: id === '8' || id === '2' ? [{ id: id === '8' ? '2' : '1', title: {fr:'Parente',en:''}, anchors: [] }] : [],
  }));
  await start('/timeline?story=7&period=leaf-7');
  await router.push('/database'); await flushPromises();
  await router.push('/timeline?story=8&entry=universe'); await flushPromises(); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('8');
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').findAll('li').map(item => item.text()))
    .toEqual(['Frise : Frise 1', '/Frise : Frise 2', '/Frise : Frise 8']);
  expect(view.get('nav[aria-label="Fil d’Ariane de la timeline"]').text()).toBe('root-8');
  await view.get('nav[aria-label="Fil d’Ariane des frises"]').findAll('button')[1].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=2&period=root-2');
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('2');
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').findAll('li')).toHaveLength(2);
  await view.get('[aria-label="1 frise associée à root-2"]').trigger('click'); await flushPromises();
  (document.body.querySelector('.associated-stories__item') as HTMLButtonElement).click(); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=8');
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').findAll('li')).toHaveLength(3);
});

it('resets a catalogue entry to the Universe and the selected frise when no Universe path exists, including the same frise', async () => {
  await start('/timeline?story=7');
  await router.push('/timeline?story=8'); await flushPromises();
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').findAll('li')).toHaveLength(3);
  await router.push('/timeline?story=8&entry=universe'); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('8');
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').text()).toBe('Frise : Frise 1/Frise : Frise 8');
});

it('discards a computed entry path when a newer timeline position is opened', async () => {
  let resolve!: (value: ReturnType<typeof storyFixture>) => void;
  vi.mocked(stories.getStory).mockImplementation(async id => {
    if (id === '2') return new Promise(yes => { resolve = yes; });
    return { ...storyFixture(id, [period(`root-${id}`), period(`leaf-${id}`, `root-${id}`)]),
      parentStories: id === '8' ? [{ id: '2', title: {fr:'Parente',en:''}, anchors: [] }] : [] };
  });
  await start('/timeline?story=7');
  await router.push('/timeline?story=8&entry=universe'); await flushPromises();
  expect(view.find('nav[aria-label="Fil d’Ariane des frises"]').exists()).toBe(false);
  await router.push('/timeline?story=7&period=leaf-7'); await flushPromises();
  resolve(storyFixture('2')); await flushPromises();
  expect(view.getComponent(PeriodGrid).props('currentStoryId')).toBe('7');
  expect(view.getComponent(PeriodGrid).props('currentPeriod').id).toBe('leaf-7');
  expect(view.get('nav[aria-label="Fil d’Ariane des frises"]').text()).toBe('Frise : Frise 1/Frise : Frise 7');
});
it('keeps an empty story empty instead of displaying unrelated catalogue content', async () => {
  vi.mocked(stories.getStory).mockResolvedValue(storyFixture('8'));
  vi.mocked(stories.getStoryPeriods).mockResolvedValue([]);
  vi.mocked(events.getStoryListEvents).mockResolvedValue([]);
  await start('/timeline?story=8');
  expect(view.getComponent(PeriodGrid).props('periods')).toEqual([]);
  expect(view.getComponent(PeriodGrid).props('events')).toEqual([]);
  expect(periods.getListPeriods).not.toHaveBeenCalled();
});
it('refuses an unavailable story without exposing catalogue content', async () => {
  vi.mocked(stories.getStory).mockRestore();
  vi.mocked(apiClient.get).mockRejectedValueOnce({ response: { status: 404 } });
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
  vi.mocked(stories.getStory).mockRejectedValueOnce(new Error('Lecture indisponible'));
  await start('/timeline?story=7');
  expect(view.get('[role="alert"]').text()).toContain('Lecture indisponible');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.getComponent(PeriodGrid).props('periods').map((p: Period) => p.id)).toEqual(['leaf-7']);
});
it('discards stale story contents after a newer story is requested', async () => {
  let resolve!: (story: ReturnType<typeof storyFixture>) => void;
  vi.mocked(stories.getStory).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  await start('/timeline?story=7');
  await router.push('/timeline?story=8'); await flushPromises();
  resolve(storyFixture('7', [period('late')])); await flushPromises();
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

it.each(['card', 'selector'])('uses the normal period return when entering a frise displayed as a period through its %s', async entry => {
  const source = { ...summary('1'), title: { fr: 'Histoire de France', en: '' } };
  const destination = { ...summary('2'), title: { fr: 'Régimes politiques en France', en: '' }, startDate: '1804', endDate: 'TODAY' };
  vi.mocked(stories.getListStories).mockResolvedValue([source, destination]);
  vi.mocked(stories.getStory).mockImplementation(async id => ({
    ...storyFixture(id,
      id === '1' ? [{ ...period('gaule'), startDate: '600 BCE', endDate: '51 BCE' }, { ...period('contemporary'), startDate: '1789', endDate: 'TODAY' }]
        : [{ ...period('empire'), startDate: '1804', endDate: '1815' }, { ...period('restauration'), startDate: '1815', endDate: '1830' }],
      [], id === '1' ? [{ id: '2', title_fr: destination.title.fr, anchors: [], atRoot: true, rootDisplayAsPeriod: true }] : []),
    title: id === '1' ? source.title : destination.title,
  }));
  await start('/timeline?story=1&view=overview');
  expect(view.find('.period-card--parent').exists()).toBe(false);
  if (entry === 'card') {
    await view.get('[data-period-id="linked-story:2"] .period-card__title-action').trigger('click');
  } else {
    await view.get('.home-view__story-selector button').trigger('click'); await flushPromises();
    document.body.querySelectorAll<HTMLElement>('.associated-stories__item')[1].click();
  }
  await flushPromises();
  const grid = view.getComponent(PeriodGrid);
  expect(grid.props('currentStoryId')).toBe('2');
  expect(grid.props('currentPeriod')).toBeNull();
  expect(grid.props('storyBounds')?.startYearsBP).toBeLessThan(300);
  expect(grid.props('periods').map((item: Period) => item.id)).toEqual(['empire', 'restauration']);
  const reference = view.get('.period-card--parent[data-period-id="linked-story:2"]');
  expect(reference.text()).toContain(destination.title.fr);
  expect(grid.props('overviewPeriod')).toMatchObject({ label: { fr: destination.title.fr }, startDate: '1804', endDate: 'TODAY' });
  const back = reference.get('button[aria-label="Revenir depuis Régimes politiques en France"]');
  await back.trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query).toMatchObject({ story: '1', view: 'overview' });
  expect(view.getComponent(PeriodGrid).props('periods').map((item: Period) => item.id)).toEqual(['gaule', 'contemporary']);
  expect(view.find('.period-card--parent').exists()).toBe(false);
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(view.find('button[aria-label="Revenir depuis Régimes politiques en France"]').exists()).toBe(true);
});

it('crosses a displayed frise using the real horizontal controls and restores the source period', async () => {
  vi.mocked(stories.getListStories).mockResolvedValue([summary('1'), { ...summary('2'), startDate: '1804', endDate: 'TODAY' }]);
  vi.mocked(stories.getStory).mockImplementation(async id => storyFixture(id,
    id === '1' ? [{ ...period('revolution'), startDate: '1789', endDate: '1799', hasChildren: false }]
      : [{ ...period('empire'), startDate: '1804', endDate: '1815', hasChildren: false }],
    [], id === '1' ? [{ id: '2', title_fr: 'Régimes politiques', atRoot: true, rootDisplayAsPeriod: true, anchors: [] }] : []));
  await start('/timeline?story=1&period=revolution');
  await view.get('button[data-period-direction="next"]').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query).toEqual({ story: '2', view: 'overview' });
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toBeNull();
  expect(view.get('button[data-period-direction="previous"]').text()).toContain('revolution');
  await view.get('button[data-period-direction="previous"]').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query).toEqual({ story: '1', period: 'revolution' });
  expect(view.getComponent(PeriodGrid).props('currentPeriod')).toMatchObject({ id: 'revolution' });
  expect(view.get('button[data-period-direction="next"]').text()).toContain('Régimes politiques');
  const moved = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router.back(); await moved; await flushPromises();
  expect(router.currentRoute.value.query).toEqual({ story: '2', view: 'overview' });
  expect(view.get('button[data-period-direction="previous"]').text()).toContain('revolution');
});

it('does not mark the frise return as clipped when its event boundary and the viewport have the same calendar date', async () => {
  let clock = Date.UTC(2026, 10, 6, 12);
  vi.spyOn(Date, 'now').mockImplementation(() => clock++);
  vi.mocked(stories.getListStories).mockResolvedValue([summary('1'), {
    ...summary('2'), startDate: '1804-03-21', endDate: 'TODAY',
  }]);
  vi.mocked(stories.getStory).mockImplementation(async id => storyFixture(id,
    id === '1' ? [{ ...period('revolution'), startDate: '1789', endDate: '1799', hasChildren: false }]
      : [{ ...period('empire'), startDate: '1804-05-18', endDate: '1815-06-22', hasChildren: false },
        { ...period('republic'), startDate: '1958-10-04', endDate: 'TODAY', hasChildren: false }],
    id === '1' ? [] : [{ ...event('civil-code'), date: '1804-03-21', dateYearsBP: 222.616 }],
    id === '1' ? [{ id: '2', title_fr: 'Régimes politiques', atRoot: true, rootDisplayAsPeriod: true, anchors: [] }] : []));
  await start('/timeline?story=1&period=revolution');
  await view.get('button[data-period-direction="next"]').trigger('click'); await flushPromises();
  const reference = view.get('.period-card--parent');
  expect(reference.classes()).not.toContain('period-card--continues-before');
  expect(reference.classes()).not.toContain('period-card--continues-after');
  expect(view.getComponent(PeriodGrid).props('storyBounds')).toMatchObject({ startDate: '1804-03-21', endDate: 'TODAY' });
});
