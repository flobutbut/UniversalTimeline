import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StoryFilters from '@/views/DatabaseView/StoryFilters.vue';
import PeriodSelect from '@/components/PeriodSelect.vue';
import Select from '@/components/base/Select.vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useDataStore } from '@/stores/useDataStore';
import { positionFromYearsBP } from '@/lib/storyTimeFilter';

let view: ReturnType<typeof mount>;
beforeEach(() => { setActivePinia(createPinia()); vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([]); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });
async function open(timeRange: { oldBP: number; recentBP: number } | null = null) {
  view = mount(StoryFilters, { props: { modelValue: 'all', timeRange }, attachTo: document.body });
  await view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!.trigger('click');
}

it('narrows the range with keyboard-accessible sliders whose handles never cross', async () => {
  await open();
  const [old, recent] = view.findAll('input[type="range"]');
  expect(old.attributes('aria-label')).toBe('Début de la plage');
  expect(recent.attributes('aria-valuetext')).toBe('aujourd’hui');
  await old.setValue(String(Math.round(positionFromYearsBP(66e6) * 1000)));
  const emitted = view.emitted('update:timeRange')!.at(-1)![0] as { oldBP: number; recentBP: number };
  expect(emitted.recentBP).toBe(0);
  expect(emitted.oldBP).toBeGreaterThan(55e6); expect(emitted.oldBP).toBeLessThan(80e6);
  await view.setProps({ timeRange: { oldBP: 1e6, recentBP: 1e6 } });
  await view.findAll('input[type="range"]')[0].setValue('999');
  const crossed = view.emitted('update:timeRange')!.at(-1)![0] as { oldBP: number; recentBP: number };
  expect(crossed.oldBP).toBeGreaterThanOrEqual(crossed.recentBP);
});
it('sets the range from a catalogue period, reports unknown dates, and resets to all eras', async () => {
  useDataStore().cachePeriod({ id: 'jurassic', label: { fr: 'Jurassique', en: '' }, startDate: 'M201.4', endDate: 'M145', categories: [] } as never);
  useDataStore().cachePeriod({ id: 'vague', label: { fr: 'Sans dates', en: '' }, startDate: '', endDate: '', categories: [] } as never);
  await open();
  view.getComponent(PeriodSelect).vm.$emit('update:modelValue', 'jurassic'); await flushPromises();
  expect(view.emitted('update:timeRange')!.at(-1)).toEqual([{ oldBP: 201.4e6, recentBP: 145e6 }]);
  view.getComponent(PeriodSelect).vm.$emit('update:modelValue', 'vague'); await flushPromises();
  expect(view.get('[role="alert"]').text()).toBe('Les dates de cette période ne sont pas connues.');
  await view.setProps({ timeRange: { oldBP: 201.4e6, recentBP: 145e6 } });
  expect(view.text()).toContain('Frises qui recoupent 201 Ma → 145 Ma');
  await view.findAll('button').find(button => button.text() === 'Toutes les époques')!.trigger('click');
  expect(view.emitted('update:timeRange')!.at(-1)).toEqual([null]);
});
it('keeps the movable handle on top when both handles overlap', async () => {
  await open({ oldBP: 0.001, recentBP: 0 });
  expect(view.findAll('input[type="range"]').map(input => input.element.value)).toEqual(['1000', '1000']);
  expect(view.findAll('input[type="range"]')[0].classes()).toContain('story-filters__slider--front');
  await view.setProps({ timeRange: { oldBP: 1.38e10, recentBP: 1.38e10 } });
  expect(view.findAll('input[type="range"]')[0].classes()).not.toContain('story-filters__slider--front');
});

it('opens from an « Ajouter un filtre » disclosure button', async () => {
  view = mount(StoryFilters, { props: { modelValue: 'all', timeRange: null }, attachTo: document.body });
  const trigger = view.findAll('button').find(button => button.text() === 'Ajouter un filtre')!;
  expect(trigger.attributes('aria-expanded')).toBe('false');
  await trigger.trigger('click');
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(view.get(`#${trigger.attributes('aria-controls')}`).classes()).toContain('story-filters__panel');
});
it('chooses the visibility with a labelled select instead of radio buttons', async () => {
  await open();
  expect(view.find('input[type="radio"]').exists()).toBe(false);
  const select = view.getComponent(Select);
  expect(select.props()).toMatchObject({ modelValue: 'all', label: 'Visibilité' });
  expect(select.props('options').map((option: { label: string }) => option.label)).toEqual(['Toutes les frises', 'Frises publiques', 'Frises privées']);
  select.vm.$emit('update:modelValue', 'public');
  expect(view.emitted('update:modelValue')).toEqual([['public']]);
});
