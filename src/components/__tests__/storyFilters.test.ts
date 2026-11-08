import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StoryFilters from '@/views/DatabaseView/StoryFilters.vue';
import PeriodFilterPicker from '@/components/filters/PeriodFilterPicker.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import FilterValueList from '@/components/filters/FilterValueList.vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useDataStore } from '@/stores/useDataStore';
import { positionFromYearsBP } from '@/lib/storyTimeFilter';

let view: ReturnType<typeof mount>;
beforeEach(() => { setActivePinia(createPinia()); vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([]); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
const body = () => new DOMWrapper(document.body);
async function open(timeRange: { oldBP: number; recentBP: number } | null = null, type = 'Dates') {
  view = mount(StoryFilters, { props: { modelValue: 'all', timeRange }, attachTo: document.body });
  if (type !== 'Dates' || !timeRange) {
    await view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!.trigger('click');
    await body().findAll('[role="menuitem"]').find(button => button.text() === type)!.trigger('click');
  }
  if (type === 'Dates') await view.get('[data-filter-type="time"]').trigger('click');
}

it('narrows the range with keyboard-accessible sliders whose handles never cross', async () => {
  await open();
  const [old, recent] = body().findAll('input[type="range"]');
  expect(old.attributes('aria-label')).toBe('Début de la plage');
  expect(recent.attributes('aria-valuetext')).toBe('aujourd’hui');
  await old.setValue(String(Math.round(positionFromYearsBP(66e6) * 1000)));
  const emitted = view.emitted('update:timeRange')!.at(-1)![0] as { oldBP: number; recentBP: number };
  expect(emitted.recentBP).toBe(0);
  expect(emitted.oldBP).toBeGreaterThan(55e6); expect(emitted.oldBP).toBeLessThan(80e6);
  await view.setProps({ timeRange: { oldBP: 1e6, recentBP: 1e6 } });
  await body().findAll('input[type="range"]')[0].setValue('999');
  const crossed = view.emitted('update:timeRange')!.at(-1)![0] as { oldBP: number; recentBP: number };
  expect(crossed.oldBP).toBeGreaterThanOrEqual(crossed.recentBP);
});
it('selects a period independently from dates and reports periods with unknown bounds', async () => {
  useDataStore().cachePeriod({ id: 'jurassic', label: { fr: 'Jurassique', en: '' }, startDate: 'M201.4', endDate: 'M145', categories: [] } as never);
  useDataStore().cachePeriod({ id: 'vague', label: { fr: 'Sans dates', en: '' }, startDate: '', endDate: '', categories: [] } as never);
  await open(null, 'Période'); await flushPromises();
  const picker = view.getComponent(PeriodFilterPicker);
  picker.vm.$emit('update:modelValue', 'jurassic'); await flushPromises();
  expect(view.emitted('update:period')!.at(-1)).toEqual([{ id: 'jurassic', label: 'Jurassique', range: { oldBP: 201.4e6, recentBP: 145e6 } }]);
  expect(view.emitted('update:timeRange')).toBeUndefined();
  picker.vm.$emit('update:modelValue', 'vague'); await flushPromises();
  expect(body().get('[role="alert"]').text()).toContain('Les dates de cette période ne sont pas connues.');
  expect(body().find('[role="listbox"]').exists()).toBe(true);
  picker.vm.$emit('update:modelValue', ''); await flushPromises();
  expect(view.emitted('update:period')!.at(-1)).toEqual([null]);
});
it('keeps the movable handle on top when both handles overlap', async () => {
  await open({ oldBP: 0.001, recentBP: 0 });
  expect(body().findAll('input[type="range"]').map(input => input.element.value)).toEqual(['1000', '1000']);
  expect(body().findAll('input[type="range"]')[0].classes()).toContain('temporal-range__slider--front');
  await view.setProps({ timeRange: { oldBP: 1.38e10, recentBP: 1.38e10 } });
  expect(body().findAll('input[type="range"]')[0].classes()).not.toContain('temporal-range__slider--front');
});

it('opens from an « Ajouter un filtre » disclosure button', async () => {
  view = mount(StoryFilters, { props: { modelValue: 'all', timeRange: null }, attachTo: document.body });
  const trigger = view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!;
  expect(trigger.attributes('aria-expanded')).toBe('false');
  await trigger.trigger('click');
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(body().get(`#${trigger.attributes('aria-controls')}`).attributes('role')).toBe('menu');
  expect(body().findAll('[role="menuitem"]').map(item => item.text())).toEqual(['Visibilité', 'Tag', 'Dates', 'Période']);
  expect(body().find('input[type="range"]').exists()).toBe(false);
});
it('presents visibility values immediately without an intermediate select', async () => {
  await open(null, 'Visibilité');
  expect(view.find('input[type="radio"]').exists()).toBe(false);
  const select = view.getComponent(FilterValueList);
  expect(select.props()).toMatchObject({ modelValue: ['all'], label: 'Visibilité' });
  expect(select.props('options').map((option: { label: string }) => option.label)).toEqual(['Toutes les frises', 'Frises publiques', 'Frises privées']);
  select.vm.$emit('update:modelValue', ['public']);
  expect(view.emitted('update:modelValue')).toEqual([['public']]);
});

it('navigates filter types by keyboard and returns focus on Escape', async () => {
  view = mount(StoryFilters, { props: { modelValue: 'all' }, attachTo: document.body });
  const add = view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!;
  await add.trigger('click'); await flushPromises();
  const items = body().findAll('[role="menuitem"]');
  expect(document.activeElement).toBe(items[0].element);
  await items[0].trigger('keydown', { key: 'ArrowDown' }); expect(document.activeElement).toBe(items[1].element);
  await items[1].trigger('keydown', { key: 'End' }); expect(document.activeElement).toBe(items[3].element);
  await items[3].trigger('keydown', { key: 'Escape' });
  expect(body().find('[role="menu"]').exists()).toBe(false);
  expect(document.activeElement).toBe(add.element);
});

it('shows tag values on hover and opens the same list directly from an active chip', async () => {
  view = mount(StoryFilters, { props: { modelValue: 'all', tags: ['geo'], tagOptions: [
    { value: 'geo', label: 'Géologie' }, { value: 'history', label: 'Histoire' },
  ] }, attachTo: document.body });
  await view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!.trigger('click');
  const tags = body().findAll('[role="menuitem"]').find(item => item.text() === 'Tag')!;
  await tags.trigger('mouseenter');
  expect(body().findAll('[role="option"]').map(item => item.text())).toEqual(['Géologie', 'Histoire']);
  expect(body().find('[role="combobox"]').exists()).toBe(false);
  expect(body().text()).not.toContain('Filtrer par');
  await body().get('button[aria-label="Fermer le filtre"]').trigger('click');
  await view.get('button[aria-label="Modifier le filtre Géologie"]').trigger('click');
  expect(body().find('[role="menuitem"]').exists()).toBe(false);
  expect(body().get('[role="listbox"]').attributes('aria-label')).toBe('Tags');
  await body().findAll('[role="option"]').find(item => item.text() === 'Histoire')!.trigger('click');
  expect(view.emitted('update:tags')!.at(-1)).toEqual([['geo', 'history']]);
});

it('adds a temporal trigger without applying a range and edits it from the toolbar', async () => {
  view = mount(StoryFilters, { props: { modelValue: 'all', timeRange: null }, attachTo: document.body });
  await view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!.trigger('click');
  await body().findAll('[role="menuitem"]').find(item => item.text() === 'Dates')!.trigger('click');
  expect(body().find('[role="menu"]').exists()).toBe(false);
  expect(body().find('input[type="range"]').exists()).toBe(false);
  const temporal = view.get('[data-filter-type="time"]');
  expect(temporal.text()).toBe('Début');
  expect(view.get('button[aria-label="Modifier la date de fin"]').text()).toBe('Fin');
  expect(view.emitted('update:timeRange')).toBeUndefined();
  await temporal.trigger('click');
  expect(body().findAll('input[type="range"]')).toHaveLength(2);
  await body().get('button[aria-label="Fermer le filtre"]').trigger('click');
  await view.get('button[aria-label="Retirer le filtre Dates"]').trigger('click');
  expect(view.find('[data-filter-type="time"]').exists()).toBe(false);
});

it('focuses the requested date boundary and never displays a period selector in Dates', async () => {
  await open({ oldBP: 201.4e6, recentBP: 145e6 }); await flushPromises();
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Début de la plage');
  expect(view.findComponent(PeriodFilterPicker).exists()).toBe(false);
  await body().get('button[aria-label="Fermer le filtre"]').trigger('click');
  await view.get('button[aria-label="Modifier la date de fin"]').trigger('click'); await flushPromises();
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Fin de la plage');
  expect(view.get('button[aria-label="Modifier la date de début"]').text()).toBe('201 Ma');
  expect(view.get('button[aria-label="Modifier la date de fin"]').text()).toBe('145 Ma');
});

it('disables period selection in the periods catalogue without loading a period list', async () => {
  view = mount(CatalogueFilters, { props: { context: 'periods' }, attachTo: document.body });
  await view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!.trigger('click');
  const periodType = body().findAll('[role="menuitem"]').find(item => item.text() === 'Période')!;
  expect(periodType.attributes('disabled')).toBeDefined();
  await periodType.trigger('mouseenter');
  expect(view.findComponent(PeriodFilterPicker).exists()).toBe(false);
  expect(PeriodApiService.getInstance().getListPeriods).not.toHaveBeenCalled();
});
