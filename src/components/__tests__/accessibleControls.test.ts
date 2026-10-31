import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Select from '@/components/base/Select.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Switch from '@/components/base/Switch.vue';
import FilterBar from '@/components/FilterBar.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import EventCard from '@/views/HomeView/EventCard.vue';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('clears a search and returns focus to its input instead of the removed clear button', async () => {
  view = mount(defineComponent({ components: { SearchInput }, setup: () => ({ query: ref('Terre') }), template: '<SearchInput v-model="query" />' }), { attachTo: document.body });
  const clear = view.get('button'); clear.element.focus(); await clear.trigger('click');
  expect(view.get('input').element.value).toBe('');
  expect(view.find('button').exists()).toBe(false);
  expect(document.activeElement).toBe(view.get('input').element);
});

it('disables both the search and its clear action', async () => {
  view = mount(SearchInput, { props: { modelValue: 'Terre', disabled: true } });
  expect(view.get('input').attributes('disabled')).toBeDefined();
  expect(view.get('button').attributes('disabled')).toBeDefined();
  await view.get('button').trigger('click');
  expect(view.emitted('update:modelValue')).toBeUndefined();
});

it('gives labelled and icon-only switches an accessible name on the actual control', async () => {
  view = mount(defineComponent({ components: { Switch }, setup: () => ({ value: ref(false) }), template: '<Switch v-model="value" label="Mode public" /><Switch v-model="value" aria-label="Option compacte" />' }));
  const controls = view.findAll('[role="switch"]');
  expect(view.get('label').attributes('for')).toBe(controls[0].attributes('id'));
  expect(controls[1].attributes('aria-label')).toBe('Option compacte');
  await controls[0].trigger('click');
  expect(controls[0].attributes('aria-checked')).toBe('true');
});

it('announces filtering and keyboard highlight from the focused combobox, then restores focus after selection', async () => {
  view = mount(Select, { props: { modelValue: '', label: 'Catégorie', error: 'Obligatoire', hint: 'Choisir une valeur', options: [{ value: 'off', label: 'Désactivé', disabled: true }, { value: 'a', label: 'Astronomie' }, { value: 'b', label: 'Biologie' }] }, attachTo: document.body });
  const trigger = view.get('.base-select__trigger');
  expect(trigger.attributes('aria-invalid')).toBe('true');
  for (const id of trigger.attributes('aria-describedby')!.split(' ')) expect(view.get(`[id="${id}"]`).text()).not.toBe('');
  await trigger.trigger('click'); await flushPromises();
  const search = view.get('input'); expect(document.activeElement).toBe(search.element);
  expect(search.attributes('role')).toBe('combobox');
  expect(view.get('[role="listbox"]').find('input').exists()).toBe(false);
  await search.trigger('keydown', { key: 'ArrowDown' });
  expect(document.getElementById(search.attributes('aria-activedescendant')!)?.textContent).toContain('Astronomie');
  await search.trigger('keydown', { key: 'Enter' }); await flushPromises();
  expect(view.emitted('update:modelValue')?.at(-1)).toEqual(['a']);
  expect(view.find('[role="listbox"]').exists()).toBe(false);
  expect(document.activeElement).toBe(trigger.element);
});

it('closes a selector on focus leaving the widget without pulling focus back', async () => {
  view = mount(defineComponent({ components: { Select }, setup: () => ({ value: ref('') }), template: '<Select v-model="value" :options="[]" /><button>Suivant</button>' }), { attachTo: document.body });
  await view.get('[role="combobox"]').trigger('click'); await flushPromises();
  const next = view.findAll('button').at(-1)!;
  next.element.focus(); await flushPromises();
  expect(view.find('[role="listbox"]').exists()).toBe(false);
  expect(document.activeElement).toBe(next.element);
});

it('consumes Escape from the search before allowing Escape to dismiss the containing dialog', async () => {
  view = mount(ModalShell, { props: { title: 'Saisie' }, slots: { default: defineComponent({ components: { Select }, setup: () => ({ value: ref('') }), template: '<Select v-model="value" :options="[]" />' }) }, attachTo: document.body });
  await view.get('[role="combobox"]').trigger('click'); await flushPromises();
  await view.get('input').trigger('keydown', { key: 'Escape' }); await flushPromises();
  expect(view.emitted('close')).toBeUndefined();
  await view.get('[role="combobox"]').trigger('keydown', { key: 'Escape' });
  expect(view.emitted('close')).toHaveLength(1);
});

const period = (id: string) => ({ id, label: { fr: 'Terre', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], hasChildren: true });
it('offers distinct native selection and creation actions in filter suggestions, reachable with arrows', async () => {
  view = mount(FilterBar, { props: { search: 'Terre', categoryOptions: [], suggestions: [period('wikidata:Q2')] }, attachTo: document.body });
  const input = view.get('input'); input.element.focus(); await input.trigger('keydown', { key: 'ArrowDown' }); await flushPromises();
  const popup = document.getElementById(input.attributes('aria-controls')!)!;
  expect(popup.getAttribute('role')).toBe('dialog');
  const choose = popup.querySelector('.filter-bar-dd__choose')!;
  expect(document.activeElement).toBe(choose);
  choose.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await flushPromises();
  const create = popup.querySelector('.filter-bar-dd__action') as HTMLButtonElement;
  expect(document.activeElement).toBe(create);
  expect(create.getAttribute('aria-label')).toBe('Créer Terre');
  create.click(); await flushPromises();
  expect(view.emitted('wikidataAdd')).toEqual([['wikidata:Q2']]);
  expect(view.emitted('pickPeriod')).toBeUndefined();
  expect(document.activeElement).toBe(input.element);
  expect(input.attributes('aria-expanded')).toBe('false');
});

it('returns from a filter suggestion to the search on Escape without clearing its query', async () => {
  view = mount(FilterBar, { props: { search: 'Terre', categoryOptions: [], suggestions: [period('earth')] }, attachTo: document.body });
  const input = view.get('input'); input.element.focus();
  await input.trigger('keydown', { key: 'ArrowDown' }); await flushPromises();
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flushPromises();
  expect(document.activeElement).toBe(input.element);
  expect(input.element.value).toBe('Terre');
  expect(input.attributes('aria-expanded')).toBe('false');
});

it('keeps finder edit actions in the keyboard order without requiring pointer hover', async () => {
  view = mount(FinderItem, { props: { label: { fr: 'Terre', en: '' }, itemId: 'earth', selected: false, hasChildren: true }, attachTo: document.body });
  const action = view.get('.row-action-button');
  expect((action.element as HTMLElement).style.display).not.toBe('none');
  expect(action.attributes('aria-label')).toBe('Modifier Terre');
  action.element.focus(); await action.trigger('click');
  expect(view.emitted('edit')).toEqual([['earth']]);
  expect(view.emitted('click')).toBeUndefined();
});

it('lists the other frises of a selected event as a labelled list of buttons, without a disclosure', async () => {
  view = mount(EventCard, { props: { event: { id: 'e', label: { fr: 'Terre', en: '' }, date: 'M65', categories: [] }, isSelected: true, isCategoryActive: false, cardStyle: { width: '0', left: '0' }, storySuggestions: [{ id: 's', title: { fr: 'Frise', en: '' } }] as any }, attachTo: document.body });
  const section = view.get('section.event-stories');
  expect(section.attributes('aria-label')).toBe('Autres frises contenant cet événement');
  expect(section.findAll('li button').map(button => button.text())).toEqual(['Frise']);
  expect(view.find('[aria-expanded]').exists()).toBe(false);
  await section.get('button').trigger('click');
  expect(view.emitted('story-select')).toEqual([['s']]);
});
