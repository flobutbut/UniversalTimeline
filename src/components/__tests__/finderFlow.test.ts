import { useUiStore } from '@/stores/useUiStore';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import PeriodsView from '@/views/GraphView/Periods.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { SearchApiService } from '@/services/SearchApiService';
import { useDataStore } from '@/stores/useDataStore';
import type { Period } from '@/types/database';

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
const service = PeriodApiService.getInstance();
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(b => b.text() === label)!;
const row = (id: string) => view.get(`.table-row[data-item-id="${id}"]`);
const edit = async (id: string) => { await row(id).get('.col-actions button').trigger('click'); await flushPromises(); };
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

it('filters the local table with the same search control as events', async () => {
  await start(); await search('other');
  expect(view.findAll('.table-row').map(row => row.attributes('data-item-id'))).toEqual(['other']);
  expect(SearchApiService.getInstance().searchLocal).not.toHaveBeenCalled();
  expect(view.find('h2').exists()).toBe(false);
  expect(view.find('.catalogue-hint').exists()).toBe(false);
  expect(view.find('.table-scroll-hint').exists()).toBe(false);
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

it.each(['add', 'search', 'cancel', 'dispose'] as const)('does not open a late edit after %s', async action => {
  const pending = deferred<Period>(); vi.mocked(service.getPeriod).mockImplementation(id => id === 'old' ? pending.promise : Promise.resolve(period(id)));
  await start(); await edit('old');
  if (action === 'add') await button('+ Ajouter une période').trigger('click');
  if (action === 'search') await search('other');
  if (action === 'cancel') await button('Annuler').trigger('click');
  if (action === 'dispose') view.unmount();
  pending.reject(new Error('Ancienne panne')); await flushPromises();
  if (action === 'add') { expect(modal().props('mode')).toBe('create'); expect(modal().props('data')).toBeUndefined(); }
  else if (action !== 'dispose') expect(modal().exists()).toBe(false);
  if (action !== 'dispose') expect(view.find('[role="alert"]').exists()).toBe(false);
});

it('renders catalogue entries without a global drag or child navigation', async () => {
  await start(); expect(row('old').attributes('draggable')).toBeUndefined(); expect(row('old').find('.finder-item-chevron').exists()).toBe(false);
  await button('+ Ajouter une période').trigger('click'); expect(modal().props('data')).toBeUndefined();
});