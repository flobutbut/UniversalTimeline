import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick, type Component } from 'vue';
import { createMemoryHistory, createRouter, type Router, type RouteRecordRaw } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import App from '@/App.vue';
import { appRoutes } from '@/router/routes';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import HomeView from '@/views/HomeView.vue';
import { storyFixture } from '@/testFixtures/story';

const counts = vi.hoisted(() => ({ eventsImports: 0, databaseImports: 0, graphImports: 0, designImports: 0, eventsUnmounted: 0 }));
vi.mock('@/components/GlobalSearch.vue', () => ({ default: { template: '<input aria-label="Recherche globale" />' } }));
vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('@/views/EventsView/EventsView.vue', async () => {
  counts.eventsImports++;
  const { defineComponent, h, ref, onUnmounted } = await import('vue');
  return { default: defineComponent({
    name: 'EventsView',
    setup() {
      const draft = ref(''); onUnmounted(() => { counts.eventsUnmounted++; });
      return () => h('section', { 'data-page': 'events' }, [h('h2', 'Événements'), h('input', { value: draft.value, onInput: (e: Event) => { draft.value = (e.target as HTMLInputElement).value; } })]);
    },
  }) };
});
vi.mock('@/views/DatabaseView/DatabaseView.vue', () => { counts.databaseImports++; return { default: { name: 'DatabaseView', template: '<section data-page="database">Frises</section>' } }; });
vi.mock('@/views/GraphView/Periods.vue', () => { counts.graphImports++; return { default: { name: 'PeriodsView', template: '<section data-page="graph">Périodes</section>' } }; });
vi.mock('@/views/DesignSystemView/DesignSystemView.vue', () => { counts.designImports++; return { default: { name: 'DesignSystemView', template: '<section data-page="design-system">Design system</section>' } }; });
// The real HomeView and navigation run; only geometric layout is replaced in jsdom.
vi.mock('@/views/HomeView/PeriodGrid.vue', () => ({ default: {
  props: ['periods', 'events', 'loading', 'currentPeriod', 'parentPeriod'], emits: ['period-click', 'go-back'],
  template: `<div data-page="timeline"><p data-context>{{ currentPeriod?.label.fr }}</p><button v-for="p in periods" :key="p.id" @click="$emit('period-click', p)">{{ p.label.fr }}</button><button @click="$emit('go-back')">Remonter</button></div>`,
} }));

const period = (id: string, parentId: string | null = null) => ({ id, parentId, hasParent: !!parentId, hasChildren: true, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', startYearsBP: 65000000, endYearsBP: 0, categories: [] });
let view: ReturnType<typeof mount>;
let router: Router;
const button = (label: string) => view.findAll('button, header a').find(node => node.text() === label)!;
const activeTab = () => view.find('header .tab-button--active').text();
async function start(path: string, routes = appRoutes) {
  router = createRouter({ history: createMemoryHistory(), routes });
  const pinia = createPinia();
  const auth = useAuthStore(pinia); auth.enabled = true; auth.ready = true; auth.account = { id: 'admin', isAdmin: true };
  // Mount before navigation, as main.ts does, to exercise initial guards and loaders.
  view = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body });
  await router.push(path); await router.isReady(); await flushPromises();
}
async function go(path: string) { await router.push(path); await flushPromises(); }
async function historyMove(direction: 'back' | 'forward') {
  const navigated = new Promise<void>(resolve => { const stop = router.afterEach(() => { stop(); resolve(); }); });
  router[direction](); await navigated; await flushPromises();
}
function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const withEventsLoader = (loader: () => Promise<Component>) => appRoutes.map(record => record.name === 'events' ? { ...record, component: loader } : { ...record }) as RouteRecordRaw[];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(storyFixture('1', [period('entry'), period('child', 'entry'), period('leaf', 'child')]));
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([{ id:'1', title:{fr:'Frise 1',en:''}, author:'', isPublic:true, categories:[] }]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockImplementation(async id => [period(id === 'entry' ? 'child' : 'leaf', id)] as any);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); });

it('loads only the requested page on direct entry and keeps timeline reads dormant', async () => {
  expect(counts.databaseImports + counts.graphImports + counts.designImports).toBe(0);
  await start('/events');
  expect(view.find('[data-page="events"]').exists()).toBe(true);
  expect(view.findComponent(HomeView).exists()).toBe(false);
  expect(StoryApiService.getInstance().getStory).not.toHaveBeenCalled();
  expect(EventApiService.getInstance().getStoryListEvents).not.toHaveBeenCalled();
  expect(counts.eventsImports).toBe(1);
  expect(counts.databaseImports + counts.graphImports + counts.designImports).toBe(0);
  expect(activeTab()).toBe('Administration');
});

it('provides native navigation links with a current page and a skip link to the focusable main landmark', async () => {
  await start('/events');
  const nav = view.get('nav[aria-label="Navigation principale"]');
  expect(nav.get('a[aria-current="page"]').text()).toBe('Administration');
  expect(nav.findAll('a').every(link => !!link.attributes('href'))).toBe(true);
  expect(nav.findAll('a').map(link => link.text())).toEqual(['Exploration', 'Frises', 'Administration']);
  const skip = view.get('.skip-link'); expect(skip.attributes('href')).toBe('#main-content');
  expect(view.get('main').attributes('tabindex')).toBe('-1');
});

it.each([['/periods', 'Périodes'], ['/graph', 'Périodes'], ['/events', 'Événements']])('opens %s inside the administration sidebar', async (path, label) => {
  await start(path);
  const menu = view.get('nav[aria-label="Administration"]');
  expect(menu.get('a[aria-current="page"]').text()).toBe(label);
  expect(activeTab()).toBe('Administration');
  await menu.get('a[href="/events"]').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('events');
  expect(view.get('[data-page="events"]').exists()).toBe(true);
});

it('preserves native modified-link behavior without starting an in-app navigation', async () => {
  await start('/events'); const link = view.findAll('header a').find(node => node.text() === 'Frises')!;
  let nativeNavigation = false;
  // Observe the component's decision, then stop jsdom's unsupported real navigation.
  link.element.addEventListener('click', event => { nativeNavigation = !event.defaultPrevented; event.preventDefault(); }, { once: true });
  const event = new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true, bubbles: true });
  link.element.dispatchEvent(event); await flushPromises();
  expect(nativeNavigation).toBe(true); expect(router.currentRoute.value.name).toBe('events');
});

it('preserves the actual timeline instance, current period and back stack across pages and browser history', async () => {
  await start('/timeline');
  const original = view.getComponent(HomeView).element;
  await button('child').trigger('click'); await flushPromises();
  expect(view.get('[data-context]').text()).toBe('child');
  await go('/database'); expect(view.find('[data-page="timeline"]').exists()).toBe(false);
  await button('Exploration').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=1&period=child');
  expect(view.getComponent(HomeView).element).toBe(original);
  expect(view.get('[data-context]').text()).toBe('child');
  await button('Remonter').trigger('click'); await flushPromises();
  expect(view.get('[data-context]').text()).toBe('entry');
  await go('/events'); await historyMove('back');
  expect(view.getComponent(HomeView).element).toBe(original); expect(activeTab()).toBe('Exploration');
  await historyMove('forward'); expect(activeTab()).toBe('Administration');
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledOnce();
});

it('reuses the timeline for query and hash changes instead of resetting its navigation', async () => {
  await start('/timeline'); const original = view.getComponent(HomeView).element;
  await button('child').trigger('click'); await flushPromises();
  await go('/timeline?story=1&period=child&source=bookmark#detail');
  expect(view.getComponent(HomeView).element).toBe(original); expect(view.get('[data-context]').text()).toBe('child');
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledOnce();
});

it('does not retain other page instances or unfinished modal state in the cache', async () => {
  await start('/events');
  await view.get('[data-page="events"] input').setValue('Brouillon local');
  const before = counts.eventsUnmounted;
  await go('/graph'); expect(counts.eventsUnmounted).toBe(before + 1);
  await go('/events'); expect((view.get('[data-page="events"] input').element as HTMLInputElement).value).toBe('');
  expect(activeTab()).toBe('Administration');
});

it('shows loading while a lazy page is pending and updates the active tab only after navigation succeeds', async () => {
  const pending = deferred<Component>();
  await start('/timeline', withEventsLoader(() => pending.promise));
  void router.push('/events').catch(() => {}); await flushPromises();
  expect(view.get('[role="status"]').text()).toContain('Chargement de la page');
  expect(activeTab()).toBe('Exploration'); expect(view.find('[data-page="timeline"]').exists()).toBe(true);
  pending.resolve(defineComponent({ template: '<section data-page="events">Événements chargés</section>' }));
  await flushPromises();
  expect(activeTab()).toBe('Administration'); expect(view.find('[role="status"]').exists()).toBe(false);
});

it('keeps the current page after a loading failure and retries the failed route', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('Chunk indisponible')).mockResolvedValueOnce(defineComponent({ template: '<section data-page="events">Événements chargés</section>' }));
  await start('/timeline', withEventsLoader(load));
  void router.push('/events').catch(() => {}); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger cette page');
  expect(activeTab()).toBe('Exploration'); expect(view.find('[data-page="timeline"]').exists()).toBe(true);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(load).toHaveBeenCalledTimes(2); expect(view.find('[role="alert"]').exists()).toBe(false); expect(activeTab()).toBe('Administration');
});

it.each([['/graph', 'Administration'], ['/design-system', 'Administration'], ['/database', 'Frises']])('renders a direct %s route and the matching header', async (path, label) => {
  await start(path); expect(activeTab()).toBe(label);
  expect(view.find('[data-page="timeline"]').exists()).toBe(false);
  expect(StoryApiService.getInstance().getStory).not.toHaveBeenCalled();
});

it('opens the landing page at the root and displays a useful unknown-page screen with a working return link', async () => {
  await start('/'); expect(router.currentRoute.value.name).toBe('landing');
  expect(view.get('h1').text()).toContain('13,8 milliards d’années.');
  expect(view.find('.header-search-wrap').exists()).toBe(false);
  expect(StoryApiService.getInstance().getStory).not.toHaveBeenCalled();
  expect(view.get('.create-bottom a').attributes('href')).toBe('/database');
  useAuthStore().account = null; await nextTick();
  expect(view.get('.create-bottom a').attributes('href')).toBe('/login?mode=signup&redirect=/database');
  await view.get('.hero-actions a').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.path).toBe('/timeline');
  await go('/unknown-page'); expect(view.text()).toContain('Page introuvable');
  expect(view.find('header .tab-button--active').exists()).toBe(false);
  await view.get('main a').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.path).toBe('/timeline'); expect(view.find('[data-page="timeline"]').exists()).toBe(true);
});

it('retains pending initial timeline data while cached and reflects shared-store saves on return', async () => {
  const pending = deferred<ReturnType<typeof storyFixture>>();
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValue(pending.promise);
  await start('/timeline'); await go('/events');
  pending.resolve(storyFixture('1', [period('entry'), period('child', 'entry')])); await flushPromises();
  const saved = { ...period('entry'), label: { fr: 'Enregistrée', en: '' } };
  useDataStore().upsertSavedPeriod(saved); await nextTick();
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(storyFixture('1', [saved, period('child', 'entry')]));
  await go('/timeline'); expect(view.get('[data-context]').text()).toBe('Enregistrée');
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(2);
});

it('recovers from a failed initial page load before any view has mounted', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('Premier téléchargement interrompu')).mockResolvedValueOnce(defineComponent({ template: '<section data-page="events">Événements chargés</section>' }));
  router = createRouter({ history: createMemoryHistory(), routes: withEventsLoader(load) });
  const pinia = createPinia(); const auth = useAuthStore(pinia); auth.enabled = true; auth.ready = true; auth.account = { id: 'admin', isAdmin: true };
  view = mount(App, { global: { plugins: [pinia, router] } });
  await router.push('/events').catch(() => {}); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger cette page');
  expect(view.find('[data-page="timeline"]').exists()).toBe(false);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('[data-page="events"]').exists()).toBe(true); expect(activeTab()).toBe('Administration');
});

it('ignores a late load failure from an abandoned navigation', async () => {
  const pending = deferred<Component>();
  await start('/timeline', withEventsLoader(() => pending.promise));
  void router.push('/events').catch(() => {}); await flushPromises();
  await button('Frises').trigger('click'); await flushPromises();
  expect(activeTab()).toBe('Frises');
  pending.reject(new Error('Ancien téléchargement interrompu')); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false); expect(activeTab()).toBe('Frises');
  expect(view.find('[role="status"]').exists()).toBe(false);
});

it('does not clear a newer loader when a cancelled request targeted the same URL', async () => {
  const old = deferred<Component>(); const fresh = deferred<Component>();
  const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  await start('/timeline', withEventsLoader(load));
  const first = router.push('/events'); await flushPromises();
  const second = router.push('/events'); await flushPromises();
  expect(load).toHaveBeenCalledTimes(2);
  old.resolve(defineComponent({ template: '<p>Ancienne réponse</p>' })); await first; await flushPromises();
  expect(view.find('[role="status"]').exists()).toBe(true); expect(activeTab()).toBe('Exploration');
  fresh.resolve(defineComponent({ template: '<section data-page="events">Événements chargés</section>' })); await second; await flushPromises();
  expect(view.find('[role="status"]').exists()).toBe(false); expect(activeTab()).toBe('Administration');
});

it('refreshes a changed frise on return and discards a path that is no longer a root', async () => {
  await start('/timeline');
  expect(view.get('[data-context]').text()).toBe('entry');
  await go('/database');
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(storyFixture('1', [
    { ...period('univers'), story_parent_id: null },
    { ...period('entry'), story_parent_id: 'univers' },
  ]));
  useDataStore().invalidateStory('1');
  await go('/timeline');
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(2);
  expect(view.get('[data-context]').text()).toBe('univers');
  expect(button('entry').exists()).toBe(true);
});

it('rebuilds a changed local parent path while preserving an explicitly addressed period', async () => {
  await start('/timeline?story=1&period=entry');
  await go('/database');
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(storyFixture('1', [
    { ...period('univers'), story_parent_id: null },
    { ...period('entry'), story_parent_id: 'univers' },
  ]));
  useDataStore().invalidateStory('1');
  await button('Exploration').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/timeline?story=1&period=entry');
  expect(view.get('[data-context]').text()).toBe('entry');
  expect(view.get('[aria-label="Fil d’Ariane de la timeline"]').text()).toContain('univers');
});
