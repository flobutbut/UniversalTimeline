import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import PeriodSelect from '@/components/PeriodSelect.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import PeriodFilterPicker from '@/components/filters/PeriodFilterPicker.vue';
import EventsView from '@/views/EventsView/EventsView.vue';
import DesignSystemView from '@/views/DesignSystemView/DesignSystemView.vue';
import Select from '@/components/base/Select.vue';
import { usePeriodSelect } from '@/composables/usePeriodSelect';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { apiClient } from '@/services/ApiClient';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const root = { id: 'root', label_fr: 'Âge ancien', start_date: 'M100', end_date: 'NOW', parent_id: null, has_children: true };
const other = { ...root, id: 'other', label_fr: 'Zoologie', has_children: false };
const child = { ...root, id: 'child', label_fr: 'Branche', parent_id: 'root', start_date: 'M50', end_date: 'M10', has_children: true };
const leaf = { ...child, id: 'leaf', label_fr: 'Feuille', parent_id: 'child', has_children: false };
let view: ReturnType<typeof mount>;
const open = async () => { await view.get('button.base-select__trigger').trigger('click'); await flushPromises(); };
const button = (text: string) => view.findAll('button').find(node => node.text() === text)!;
const drill = (label: string) => view.get(`button[aria-label="Voir les sous-périodes de ${label}"]`);
const choose = (label: string) => view.findAll('.period-select__choose').find(node => node.text().includes(label))!;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { resolve, promise };
}
beforeEach(() => {
  vi.resetAllMocks(); setActivePinia(createPinia());
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/periods') return [other, root] as any;
    if (url === '/periods/root/children') return [child] as any;
    if (url === '/periods/child/children') return [leaf] as any;
    if (url === '/periods/leaf/children' || url === '/events') return [] as any;
    throw new Error(`Unexpected read ${url}`);
  });
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('loads roots only when opened, sorts them, formats their dates and filters the visible level', async () => {
  view = mount(PeriodSelect, { props: { modelValue: '', compact: true } });
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(view.text()).toBe('Toutes les périodes');
  await open();
  expect(view.findAll('.period-select__choose').map(node => node.text().replace('✓', '').trim())).toEqual([
    expect.stringContaining('Âge ancien (de '), expect.stringContaining('Zoologie (de '),
  ]);
  expect(view.text()).toContain("aujourd'hui");
  await view.get('input[type="search"]').setValue('ÂGE');
  expect(view.findAll('.period-select__choose')).toHaveLength(1);
  await view.get('input[type="search"]').setValue('absent'); expect(view.text()).toContain('Aucun résultat');
});

it('shows root failures and retries without treating them as an empty list', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Racines hors ligne')).mockResolvedValueOnce([]);
  view = mount(PeriodSelect, { props: { modelValue: '' } }); await open();
  expect(view.get('[role="alert"]').text()).toContain('Racines hors ligne');
  expect(view.text()).not.toContain('Aucune période');
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false); expect(view.text()).toContain('Aucune période');
  expect(view.find('[role="status"]').exists()).toBe(false);
});

it('does not update its navigation after the owning scope is disposed', async () => {
  const pending = deferred<any[]>();
  useDataStore().updatePeriods([PeriodApiService.mapPeriod(root)]);
  vi.mocked(apiClient.get).mockReturnValue(pending.promise);
  const scope = effectScope();
  const navigation = scope.run(() => usePeriodSelect(() => ''))!;
  const reading = navigation.drillDown(PeriodApiService.mapPeriod(root));
  await flushPromises(); scope.stop(); pending.resolve([child]); await reading;
  expect(navigation.currentParentId.value).toBeNull();
});

it('keeps disabled period controls closed, then dismisses an enabled panel with Escape and restores focus', async () => {
  view = mount(PeriodSelect, { props: { modelValue: '', disabled: true }, attachTo: document.body });
  await open(); expect(apiClient.get).not.toHaveBeenCalled();
  await view.setProps({ disabled: false }); await open();
  expect(document.activeElement).toBe(view.get('input').element);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flushPromises();
  expect(view.find('[role="dialog"]').exists()).toBe(false);
  expect(document.activeElement).toBe(view.get('button.base-select__trigger').element);
});

it('keeps the period and category filters working together in the real events view', async () => {
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/periods') return [root,child] as any;
    if (url === '/periods/root/children') return [child] as any;
    if (url === '/events') return [
      { id: 'inside', label_fr: 'Inclus', date: 'M20', date_years_bp: 20000000, tags: [{ id: 'cat', label: { fr: 'Catégorie', en: '' }, family: 'societes', position: 1, parentId: null }] },
      { id: 'outside', label_fr: 'Hors période', date: 'M80', date_years_bp: 80000000, tags: [{ id: 'cat', label: { fr: 'Catégorie', en: '' }, family: 'societes', position: 1, parentId: null }] },
      { id: 'uncategorized', label_fr: 'Sans catégorie', date: 'M20', date_years_bp: 20000000, categories: [] },
    ] as any;
    throw new Error(`Unexpected read ${url}`);
  });
  view = mount(EventsView, { global: { stubs: { Teleport: true } } }); await flushPromises();
  await button('Ajouter un filtre').trigger('click');
  await view.findAll('[role="menuitem"]').find(item => item.text() === 'Période')!.trigger('click');
  view.getComponent(PeriodFilterPicker).vm.$emit('update:modelValue', 'child'); await flushPromises();
  expect(view.text()).toContain('Inclus'); expect(view.text()).toContain('Sans catégorie'); expect(view.text()).not.toContain('Hors période');
  view.getComponent(CatalogueFilters).vm.$emit('update:tags', ['cat']); await flushPromises();
  expect(view.text()).toContain('Inclus'); expect(view.text()).not.toContain('Sans catégorie');
  await button('Toutes les périodes').trigger('click'); await flushPromises();
  expect(view.text()).toContain('Hors période'); expect(view.text()).not.toContain('Sans catégorie');
  expect(vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/periods')).toHaveLength(1);
});

it('renders generic controls in the design system without fetching business data until a period control opens', async () => {
  view = mount(DesignSystemView); await flushPromises();
  // jsdom does not implement element scrolling; the real browser does.
  Object.defineProperty(view.get('.design-system__main').element, 'scrollTo', { value: vi.fn() });
  expect(apiClient.get).not.toHaveBeenCalled();
  await button('Select').trigger('click'); await flushPromises();
  expect(view.findAllComponents(Select)).toHaveLength(4); expect(view.findAllComponents(PeriodSelect)).toHaveLength(2);
  expect(apiClient.get).not.toHaveBeenCalled();
  const periods = view.findAllComponents(PeriodSelect);
  await periods[0].get('button.base-select__trigger').trigger('click');
  await periods[1].get('button.base-select__trigger').trigger('click'); await flushPromises();
  expect(vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/periods')).toHaveLength(1);
});

it('keeps catalogue-wide parent search and exclusion after splitting the generic select', async () => {
  const { SearchApiService } = await import('@/services/SearchApiService');
  const search = vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([
    { id: 'excluded', type: 'period', label: { fr: 'À exclure', en: '' } },
    { id: 'remote', type: 'period', label: { fr: 'Parent distant', en: '' }, parentId: 'root', startDate: 'M65', endDate: 'NOW' },
  ]);
  view = mount(PeriodSelect, { props: { modelValue: '', searchRemote: true, excludeId: 'excluded' } });
  await open();
  vi.useFakeTimers();
  await view.get('input[type="search"]').setValue('parent');
  await vi.advanceTimersByTimeAsync(280); await flushPromises();
  expect(search).toHaveBeenCalledWith('parent', { onlyPeriods: true });
  expect(view.text()).not.toContain('À exclure');
  await choose('Parent distant').trigger('click'); await view.setProps({ modelValue: 'remote' });
  expect(view.get('.period-select__summary').text()).toContain('Parent distant');
  expect(view.emitted('update:modelValue')).toEqual([['remote']]);
  vi.useRealTimers();
});

it('ignores catalogue search results after the parent picker is closed', async () => {
  const { SearchApiService } = await import('@/services/SearchApiService');
  const pending = deferred<any[]>();
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockReturnValue(pending.promise);
  view = mount(PeriodSelect, { props: { modelValue: '', searchRemote: true } }); await open();
  vi.useFakeTimers();
  await view.get('input[type="search"]').setValue('ancien');
  await vi.advanceTimersByTimeAsync(280);
  await view.get('button.base-select__trigger').trigger('click');
  pending.resolve([{ id: 'stale', type: 'period', label: { fr: 'Ancien résultat', en: '' } }]); await flushPromises();
  await open();
  expect(view.text()).not.toContain('Ancien résultat');
  vi.useRealTimers();
});

it('selects and clears any catalogue period directly without reading a global hierarchy', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([root,child,leaf,other]);
  view = mount(PeriodSelect,{props:{modelValue:''}}); await open();
  expect(view.findAll('.period-select__drill')).toHaveLength(0);
  await choose('Feuille').trigger('click'); await view.setProps({modelValue:'leaf'});
  expect(view.emitted('change')).toEqual([['leaf']]);
  await open(); await button('Toutes les périodes').trigger('click');
  expect(view.emitted('change')).toEqual([['leaf'],['']]); expect(apiClient.get).toHaveBeenCalledOnce();
});