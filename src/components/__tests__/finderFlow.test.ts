import { useUiStore } from '@/stores/useUiStore';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import PeriodsView from '@/views/GraphView/Periods.vue';
import FilterBar from '@/components/FilterBar.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { SearchApiService } from '@/services/SearchApiService';
import { useDataStore } from '@/stores/useDataStore';
import type { ListPeriod, Period } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { resolve, reject, promise };
}
const period = (id: string, parentId: string | null = null): Period => ({
  id, label: { fr: id, en: '' }, description: { fr: `Description ${id}`, en: '' },
  parentId, hasParent: !!parentId, hasChildren: true, children: [], categories: [],
  startDate: 'M65', endDate: 'NOW', temporalLocation: '', createdAt: new Date(), updatedAt: new Date(),
});
const hit = (id: string) => ({ id, type: 'period' as const, label: { fr: id, en: '' }, dateLabel: '', fromWikidata: false as const });
const service = PeriodApiService.getInstance();
let view: ReturnType<typeof mount>;
const body = () => new DOMWrapper(document.body);
const button = (label: string) => view.findAll('button').find(b => b.text() === label)!;
const selectedIds = () => view.findAllComponents(FinderItem).filter(row => row.props('selected')).map(row => row.props('itemId'));
const row = (id: string) => view.findAllComponents(FinderItem).find(row => row.props('itemId') === id)!;
const pick = async (p: ListPeriod) => { view.getComponent(FilterBar).vm.$emit('pickPeriod', p); await flushPromises(); };
const edit = async (id: string) => { row(id).vm.$emit('edit', id); await flushPromises(); };
const modal = () => view.findComponent({ name: 'EditModal' });
async function start() {
  view = mount(PeriodsView, { attachTo: document.body, global: { stubs: {
    EditModal: { name: 'EditModal', props: ['data', 'mode'], template: '<div class="test-edit-modal"><button @click="$emit(\'close\')">Fermer</button></div>' },
  } } });
  await flushPromises();
}
async function search(query: string) {
  const input = view.get('input[placeholder="Rechercher une période…"]');
  await input.trigger('focusin'); await input.setValue(query);
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
}
beforeEach(() => {
  vi.spyOn(StoryApiService.getInstance(),'getMemberships').mockResolvedValue(new Map());
  vi.spyOn(StoryApiService.getInstance(),'getListStories').mockResolvedValue([]);
  vi.useFakeTimers(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).hide);
  vi.spyOn(service, 'getListPeriods').mockResolvedValue([period('old'), period('other')]);
  vi.spyOn(service, 'loadChildren').mockResolvedValue([]);
  vi.spyOn(service, 'getPeriod').mockImplementation(async id => period(id));
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

it('shows a retryable search failure instead of an empty catalogue', async () => {
  const load = vi.mocked(SearchApiService.getInstance().searchLocal)
    .mockRejectedValueOnce(new Error('Recherche indisponible')).mockResolvedValueOnce([hit('Résultat')]);
  await start(); await search('terre');
  expect(body().get('[role="alert"]').text()).toContain('Recherche indisponible');
  expect(body().text()).not.toContain('Aucun résultat');
  await body().get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(body().find('[role="alert"]').exists()).toBe(false); expect(body().get('.filter-bar-dd__choose').text()).toContain('Résultat');
  expect(load).toHaveBeenCalledTimes(2);
});

it('aborts the previous search when the category changes and ignores a late success', async () => {
  const a = deferred<any[]>(); const b = deferred<any[]>();
  const load = vi.mocked(SearchApiService.getInstance().searchLocal).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await start(); await search('terre');
  const firstSignal = load.mock.calls[0][1]!.signal!;
  expect(body().text()).toContain('Recherche en cours'); expect(body().text()).not.toContain('Aucun résultat');
  view.getComponent(FilterBar).vm.$emit('update:categoryId', 'geo');
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
  expect(firstSignal.aborted).toBe(true); expect(load.mock.calls[1][1]).toMatchObject({ categoryId: 'geo', onlyPeriods: true });
  b.resolve([hit('Nouvelle')]); await flushPromises(); a.resolve([hit('Ancienne')]); await flushPromises();
  expect(body().get('.filter-bar-dd__choose').text()).toContain('Nouvelle'); expect(body().text()).not.toContain('Ancienne');
});

it('ignores a late search error after clearing the input and cancels it on unmount', async () => {
  const pending = deferred<any[]>(); const load = vi.mocked(SearchApiService.getInstance().searchLocal).mockReturnValue(pending.promise);
  await start(); await search('terre');
  await view.get('input[placeholder="Rechercher une période…"]').setValue('');
  expect(load.mock.calls[0][1]!.signal!.aborted).toBe(true);
  pending.reject(new Error('Ancienne panne')); await flushPromises();
  expect(body().find('[role="alert"]').exists()).toBe(false); expect(body().find('[role="listbox"]').exists()).toBe(false);
  await search('autre'); const signal = load.mock.calls[1][1]!.signal!; view.unmount(); expect(signal.aborted).toBe(true);
});

it('keeps the latest result when two path reads finish in reverse order', async () => {
  const a = deferred<Period>(); const b = deferred<Period>();
  vi.mocked(service.getPeriod).mockImplementation(id => id === 'a' ? a.promise : b.promise);
  await start(); await pick(period('a')); await pick(period('b'));
  a.reject(new Error('Ancienne panne')); await flushPromises();
  expect(view.text()).toContain('Chargement de la fiche'); expect(view.find('[role="alert"]').exists()).toBe(false);
  b.resolve(period('b')); await flushPromises(); expect(selectedIds()).toEqual(['b']);
});

it.each(['selection', 'search', 'add', 'cancel', 'dispose'] as const)('does not apply an old path after %s', async action => {
  const pending = deferred<Period>(); vi.mocked(service.getPeriod).mockImplementation(id => id === 'late' ? pending.promise : Promise.resolve(period(id)));
  await start(); await pick(period('late'));
  if (action === 'selection') { await row('other').trigger('click'); await flushPromises(); }
  if (action === 'search') await view.get('input[placeholder="Rechercher une période…"]').setValue('Nouvelle saisie');
  if (action === 'add') await button('+ Ajouter une période').trigger('click');
  if (action === 'cancel') await button('Annuler').trigger('click');
  if (action === 'dispose') view.unmount();
  pending.resolve(period('late')); await flushPromises();
  if (action !== 'dispose') expect(selectedIds()).toEqual(action === 'selection' ? ['other'] : []);
  expect(useDataStore().periodById('late')).toBeNull();
});

it('opens the latest edit with canonical details when responses arrive in reverse order', async () => {
  const a = deferred<Period>(); const b = deferred<Period>();
  vi.mocked(service.getPeriod).mockImplementation(id => id === 'old' ? a.promise : b.promise);
  await start(); await edit('old'); await edit('other');
  a.resolve(period('old')); await flushPromises(); expect(modal().exists()).toBe(false);
  expect(view.text()).toContain('Chargement du formulaire');
  b.resolve({ ...period('other'), description: { fr: 'Détail complet', en: '' } }); await flushPromises();
  expect(modal().props('data')).toMatchObject({ id: 'other', description: { fr: 'Détail complet' } });
  await modal().get('button').trigger('click'); expect(modal().exists()).toBe(false);
});

it('shows an edit loading failure and retries without opening an empty form', async () => {
  vi.mocked(service.getPeriod).mockRejectedValueOnce(new Error('Détail indisponible')).mockResolvedValueOnce(period('old'));
  await start(); await edit('old');
  expect(view.get('[role="alert"]').text()).toContain('Détail indisponible'); expect(modal().exists()).toBe(false);
  await button('Réessayer').trigger('click'); await flushPromises(); expect(modal().props('data')).toMatchObject({ id: 'old' });
});

it.each(['add', 'selection', 'cancel', 'dispose'] as const)('does not open a late edit after %s', async action => {
  const pending = deferred<Period>(); vi.mocked(service.getPeriod).mockImplementation(id => id === 'old' ? pending.promise : Promise.resolve(period(id)));
  await start(); await edit('old');
  if (action === 'add') await button('+ Ajouter une période').trigger('click');
  if (action === 'selection') await row('other').trigger('click');
  if (action === 'cancel') await button('Annuler').trigger('click');
  if (action === 'dispose') view.unmount();
  pending.reject(new Error('Ancienne panne')); await flushPromises();
  if (action === 'add') { expect(modal().props('mode')).toBe('create'); expect(modal().props('data')).toBeUndefined(); }
  else if (action !== 'dispose') expect(modal().exists()).toBe(false);
  if (action !== 'dispose') expect(view.find('[role="alert"]').exists()).toBe(false);
});

it('keeps the current selection after a detail error and retries the requested fiche without loading ancestors', async () => {
  await start(); await pick(period('old'));
  vi.mocked(service.getPeriod).mockRejectedValueOnce(new Error('Fiche indisponible')).mockResolvedValueOnce(period('leaf','parent'));
  await pick(period('leaf')); expect(selectedIds()).toEqual(['old']);
  expect(view.get('[role="alert"]').text()).toContain('Fiche indisponible');
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(selectedIds()).toEqual(['leaf']); expect(view.findAll('.finder-column')).toHaveLength(1);
  expect(service.loadChildren).not.toHaveBeenCalled();
});
it('renders catalogue entries without a global drag or child navigation', async () => {
  await start(); expect(row('old').props('draggable')).toBe(false); expect(row('old').props('hideChevron')).toBe(true);
  await button('+ Ajouter une période').trigger('click'); expect(modal().props('data')).toBeUndefined();
});