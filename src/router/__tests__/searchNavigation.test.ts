import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import App from '@/App.vue';
import { appRoutes } from '@/router/routes';
import { installAccessGuard } from '@/router/access';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import type { SearchHit } from '@/services/SearchApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { CategoryService } from '@/services/CategoryService';
import { apiClient } from '@/services/ApiClient';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { searchHitLocation } from '@/router/searchTarget';
import type { Period, ListEvent } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/views/HomeView.vue', () => ({ default: { name: 'HomeView', template: '<div>Timeline publique</div>' } }));
vi.mock('@/views/LoginView.vue', () => ({ default: { template: '<div>Connexion requise</div>' } }));
vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));

const periods = PeriodApiService.getInstance();
const period = (id: string, parentId: string | null = null): Period => ({
  id, parentId, hasParent: !!parentId, hasChildren: true, children: [], categories: [],
  label: { fr: id, en: '' }, description: { fr: `Détail canonique ${id}`, en: '' },
  startDate: 'M65', endDate: 'NOW', temporalLocation: '', createdAt: new Date(), updatedAt: new Date(),
});
const event: ListEvent = { id: 'event-canonical', wikidata_id: 'Q123', label: { fr: 'Fiche complète', en: '' }, description: { fr: 'Description conservée', en: '' }, date: '1944-06-06', categories: [] };
const local = (type: 'period' | 'event', id: string): SearchHit => ({ id, type, label: { fr: 'Suggestion', en: '' }, dateLabel: '', fromWikidata: false });
const wd = (type: 'period' | 'event'): SearchHit => ({ id: 'Q456', type, label: 'Wikidata', dateLabel: '', fromWikidata: true });
let router: Router;
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
async function start(path = '/timeline', anonymous = false) {
  const auth = useAuthStore(); auth.enabled = true; auth.ready = true;
  // The catalogue views are reserved to admins.
  auth.account = anonymous ? null : { id: 'alice', isAdmin: true };
  vi.spyOn(auth, 'initialize').mockResolvedValue(); vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes });
  installAccessGuard(router, auth);
  await router.push(path); await router.isReady();
  view = mount(App, { attachTo: document.body, global: { plugins: [router] } });
  await flushPromises();
}
async function choose(hit: SearchHit) {
  await router.push(searchHitLocation(hit)); await flushPromises();
}
beforeEach(() => {
  vi.useFakeTimers(); setActivePinia(createPinia());
  vi.spyOn(periods, 'getListPeriods').mockResolvedValue([period('root')]);
  vi.spyOn(periods, 'getPeriod').mockImplementation(async id => period(id, id === 'leaf' ? 'child' : id === 'child' ? 'root' : null));
  vi.spyOn(periods, 'loadChildren').mockImplementation(async id => id === 'root' ? [period('child', 'root')] : id === 'child' ? [period('leaf', 'child')] : []);
  vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockResolvedValue([event]);
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  vi.mocked(apiClient.get).mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

it('opens a period catalogue fiche directly without navigating global ancestors', async () => {
  await start(); await choose(local('period', 'leaf'));
  expect(router.currentRoute.value.fullPath).toBe('/periods?period=leaf');
  expect(view.getComponent(EditModal).props('data')).toMatchObject({ id: 'leaf', description: { fr: 'Détail canonique leaf' } });
  expect(periods.getPeriod).toHaveBeenCalledWith('leaf');
  expect(apiClient.post).not.toHaveBeenCalled();
});
it('opens a local event with its full catalogue data, not its partial suggestion', async () => {
  await start(); await choose(local('event', event.id));
  expect(router.currentRoute.value.fullPath).toBe('/events?event=event-canonical');
  const form = view.getComponent(EditModal);
  expect(form.props('mode')).toBe('edit'); expect(form.props('data')).toMatchObject(event);
  expect(document.body.textContent).toContain('Modifier un événement');
  expect([...document.querySelectorAll('input')].some(input => input.value === 'Fiche complète')).toBe(true);
  expect(apiClient.put).not.toHaveBeenCalled();
});
it('does not reopen a dismissed form when only the hash or unrelated filters change', async () => {
  await start('/events?event=event-canonical');
  await new DOMWrapper(document.body).findAll('button').find(b => b.text() === 'Annuler')!.trigger('click'); await flushPromises();
  await router.push('/events?event=event-canonical#main-content'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false);
  await router.push('/events?event=event-canonical&sort=date'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false);
});
it.each(['period', 'event'] as const)('opens a %s Wikidata draft without an automatic import or write', async type => {
  await start(); await choose(wd(type));
  const form = view.getComponent(EditModal);
  expect(form.props('mode')).toBe('create'); expect(form.props('data')).toMatchObject({ wikidata_id: 'Q456' });
  expect(document.body.textContent).toContain('Remplir avec Wikidata');
  if (type === 'period') {
    expect(document.body.textContent).toContain('Nombre de sous-périodes inconnu');
    expect(document.body.textContent).not.toContain('0 sous-périodes');
  }
  expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled();
  await new DOMWrapper(document.body).findAll('button').find(b => b.text() === 'Annuler')!.trigger('click'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false);
});
it('refreshes a loaded event catalogue when search points to a record missing from that cache', async () => {
  const list = vi.mocked(EventApiService.getInstance().getListEvents).mockResolvedValueOnce([]).mockResolvedValueOnce([event]);
  await useDataStore().ensureEventsLoaded();
  await start(); await choose(local('event', event.id));
  expect(view.getComponent(EditModal).props('data')).toMatchObject(event);
  expect(list).toHaveBeenCalledTimes(2);
});
it('keeps a failed event refresh retryable instead of opening an empty form', async () => {
  vi.mocked(EventApiService.getInstance().getListEvents).mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('Catalogue hors ligne')).mockResolvedValueOnce([event]);
  await start('/events?event=event-canonical');
  expect(view.get('[role="alert"]').text()).toContain('Catalogue hors ligne');
  expect(view.findComponent(EditModal).exists()).toBe(false);
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.getComponent(EditModal).props('mode')).toBe('edit');
});
it('does not replace a manually opened draft when an older event refresh finishes', async () => {
  const late = deferred<ListEvent[]>();
  vi.mocked(EventApiService.getInstance().getListEvents).mockResolvedValueOnce([]).mockReturnValueOnce(late.promise);
  await start('/events?event=event-canonical');
  await view.findAll('button').find(b => b.text() === '+ Ajouter un événement')!.trigger('click'); await flushPromises();
  late.resolve([event]); await flushPromises();
  expect(view.getComponent(EditModal).props('mode')).toBe('create');
  expect(view.getComponent(EditModal).props('data')).toBeNull();
});
it('shows a retryable path failure and resolves the same destination on retry', async () => {
  vi.mocked(periods.getPeriod).mockRejectedValueOnce(new Error('Lecture du chemin indisponible'));
  await start(); await choose(local('period', 'leaf'));
  expect(view.get('[role="alert"]').text()).toContain('Lecture du chemin indisponible');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.getComponent(EditModal).props('data')).toMatchObject({ id: 'leaf' });
});
it('ignores an old path after a newer query has selected another period', async () => {
  const old = deferred<Period>(); vi.mocked(periods.getPeriod).mockReturnValueOnce(old.promise);
  await start('/periods?period=old');
  await router.push('/periods?period=fresh'); await flushPromises();
  old.resolve(period('old')); await flushPromises();
  expect(useDataStore().periodById('old')).toBeNull();
  expect(view.getComponent(EditModal).props('data')).toMatchObject({ id: 'fresh' });
  expect(useDataStore().periodById('fresh')?.id).toBe('fresh');
});
it('does not reopen a draft after leaving while its initial catalogue read is pending', async () => {
  const pending = deferred<Period[]>(); vi.mocked(periods.getListPeriods).mockReturnValueOnce(pending.promise);
  await start('/periods?wikidata=Q456'); await router.push('/timeline'); await flushPromises();
  pending.resolve([]); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false); expect(router.currentRoute.value.name).toBe('timeline');
});
it.each(['/events?event=missing', '/events?event=one&event=two'])('shows a destination failure without opening an empty edit form: %s', async path => {
  await start(path); expect(view.findComponent(EditModal).exists()).toBe(false);
  expect(view.get('[role="alert"]').text()).toMatch(/introuvable|invalide/);
  await view.get('[role="alert"]').findAll('button')[1].trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
});
