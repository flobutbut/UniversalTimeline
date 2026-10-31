import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import Select from '@/components/base/Select.vue';

let view: ReturnType<typeof mount>;
const options = [
  { value: 1, label: 'Option numérique' },
  { value: '1', label: 'Option texte' },
  { value: 'disabled', label: 'Option indisponible', disabled: true },
  { value: 'other', label: 'Une autre option' },
];
beforeEach(() => { setActivePinia(undefined); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });
const open = async () => { await view.get('[role="combobox"]').trigger('click'); await flushPromises(); };

it('renders, searches and selects a supplied numeric value without any Pinia provider', async () => {
  view = mount(Select, { props: { modelValue: null, options, label: 'Choix', compact: true } });
  await open();
  await view.get('input').setValue('NUMÉRIQUE');
  expect(view.findAll('[role="option"]')).toHaveLength(1);
  await view.get('[role="option"]').trigger('click');
  expect(view.emitted('update:modelValue')).toEqual([[1]]);
  expect(view.emitted('change')).toEqual([[1]]);
  expect(view.find('[role="listbox"]').exists()).toBe(false);
});

it('preserves the difference between a numeric ID and a string ID in multiple selection and removal', async () => {
  view = mount(Select, { props: { modelValue: [1], options, multiple: true } });
  await open();
  expect(view.get('[role="listbox"]').attributes('aria-multiselectable')).toBe('true');
  await view.findAll('[role="option"]').find(option => option.text().includes('Option texte'))!.trigger('click');
  expect(view.emitted('update:modelValue')).toEqual([[[1, '1']]]);
  await view.setProps({ modelValue: [1, '1'] });
  expect(view.findAll('.base-select__selected-item')).toHaveLength(2);
  await view.get('button[aria-label="Retirer Option numérique"]').trigger('click');
  expect(view.emitted('update:modelValue')?.[1]).toEqual([['1']]);
  expect(view.find('[role="listbox"]').exists()).toBe(true);
});

it('does not choose disabled options by mouse and skips them during keyboard navigation', async () => {
  view = mount(Select, { props: { modelValue: null, options: [options[2], options[1]], searchable: false } });
  await open();
  expect(view.findAll('[role="option"]')[0].attributes('aria-disabled')).toBe('true');
  await view.findAll('[role="option"]')[0].trigger('click');
  expect(view.emitted('change')).toBeUndefined();
  await view.get('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await view.get('[role="combobox"]').trigger('keydown', { key: 'Enter' });
  expect(view.emitted('change')).toEqual([['1']]);
});

it('keeps a disabled control closed and prevents removing existing tags', async () => {
  view = mount(Select, { props: { modelValue: [1], options, multiple: true, disabled: true } });
  await open();
  await view.get('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await view.get('button[aria-label="Retirer Option numérique"]').trigger('click');
  expect(view.find('[role="listbox"]').exists()).toBe(false);
  expect(view.emitted('update:modelValue')).toBeUndefined();
  expect(view.get('[role="combobox"]').attributes('tabindex')).toBe('-1');
});

it('allows spaces in the search and shows the configured empty message', async () => {
  view = mount(Select, { props: { modelValue: null, options, noResultsText: 'Rien à sélectionner' } });
  await open();
  const key = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  view.get('input').element.dispatchEvent(key);
  await flushPromises();
  expect(key.defaultPrevented).toBe(false);
  expect(view.find('[role="listbox"]').exists()).toBe(true);
  await view.get('input').setValue('introuvable');
  expect(view.text()).toContain('Rien à sélectionner');
});

it('closes on Escape and outside click and returns keyboard focus to its trigger', async () => {
  view = mount(Select, { props: { modelValue: null, options }, attachTo: document.body });
  await open();
  expect(document.activeElement).toBe(view.get('input').element);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flushPromises();
  expect(view.find('[role="listbox"]').exists()).toBe(false);
  expect(document.activeElement).toBe(view.get('[role="combobox"]').element);
  await open(); document.body.click(); await flushPromises();
  expect(view.find('[role="listbox"]').exists()).toBe(false);
});

it('updates its displayed selection from parent props and closes when disabled while open', async () => {
  view = mount(Select, { props: { modelValue: null, options, label: 'Choix', error: 'Erreur de choix', hint: 'Aide' } });
  await view.setProps({ modelValue: '1' });
  expect(view.get('.base-select__selected-text').text()).toBe('Option texte');
  expect(view.text()).toContain('Erreur de choix'); expect(view.text()).toContain('Aide');
  await open(); await view.setProps({ disabled: true });
  expect(view.find('[role="listbox"]').exists()).toBe(false);
});
