import { afterEach, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Select from '@/components/base/Select.vue';
import Input from '@/components/base/Input.vue';
import Tabs from '@/components/base/Tabs.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; });
const key = (name: string, shiftKey = false) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true }));

it('traps focus within the top dialog and restores the exact background state when closed', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const alreadyInert = document.createElement('section'); alreadyInert.setAttribute('inert', ''); document.body.append(alreadyInert);
  view = mount(ModalShell, { props: { title: 'Saisie' }, slots: { default: '<input aria-label="Premier" /><button>Dernier du corps</button>' }, attachTo: document.body });
  await flushPromises(); const first = view.get('input').element; const last = view.findAll('button').at(-1)!.element;
  expect(view.get('[role="dialog"]').attributes('aria-labelledby')).toBe(view.get('h2').attributes('id'));
  expect(document.activeElement).toBe(first); expect(trigger.hasAttribute('inert')).toBe(true);
  last.focus(); key('Tab'); expect(document.activeElement).toBe(first);
  key('Tab', true); expect(document.activeElement).toBe(last);
  trigger.focus(); expect(document.activeElement).toBe(first);
  view.unmount(); expect(trigger.hasAttribute('inert')).toBe(false); expect(alreadyInert.hasAttribute('inert')).toBe(true); expect(document.activeElement).toBe(trigger);
});

it('closes an open selector before its parent dialog on Escape', async () => {
  view = mount(ModalShell, { props: { title: 'Sélection' }, slots: { default: defineComponent({ components: { Select }, setup: () => ({ value: ref('') }), template: '<Select v-model="value" :options="[{ value: \'a\', label: \'A\' }]" />' }) }, attachTo: document.body });
  await flushPromises(); const trigger = view.get('[role="combobox"]'); await trigger.trigger('click'); trigger.element.focus();
  key('Escape'); await flushPromises(); expect(view.find('[role="listbox"]').exists()).toBe(false); expect(view.emitted('close')).toBeUndefined();
  key('Escape'); expect(view.emitted('close')).toHaveLength(1);
});

it('closes only the nested dialog, then returns focus to the parent control', async () => {
  view = mount(defineComponent({ components: { ModalShell }, setup: () => ({ nested: ref(false) }), template: '<ModalShell title="Parent"><button @click="nested = true">Ouvrir</button><ModalShell v-if="nested" title="Enfant" @close="nested = false"><input /></ModalShell></ModalShell>' }), { attachTo: document.body });
  await flushPromises(); const opener = view.findAll('button').find(b => b.text() === 'Ouvrir')!; opener.element.focus(); await opener.trigger('click'); await flushPromises();
  expect(document.activeElement).toBe(view.get('input').element); key('Escape'); await flushPromises();
  expect(view.findAll('[role="dialog"]')).toHaveLength(1); expect(document.activeElement).toBe(opener.element);
});

it('allows a dialog-owned teleported panel to receive focus and ignores a disabled form', async () => {
  view = mount(ModalShell, { props: { title: 'Popup', busy: true }, slots: {
    default: '<fieldset disabled><input /></fieldset>',
  }, attachTo: document.body });
  await flushPromises(); expect(document.activeElement).toBe(view.get('[role="dialog"]').element);
  key('Escape'); expect(view.emitted('close')).toBeUndefined();
  // A teleported panel declares the owning dialog; it is part of that focus scope.
  const owner = view.get('[role="dialog"]').attributes('aria-labelledby')!.replace(/-title$/, '');
  const panel = document.createElement('div'); panel.setAttribute('data-dialog-owner', owner); panel.innerHTML = '<button>Réessayer</button>'; document.body.append(panel);
  panel.querySelector('button')!.focus(); expect(document.activeElement).toBe(panel.querySelector('button'));
});

it('associates input errors and hints with both text and multiline controls', () => {
  view = mount(defineComponent({ components: { Input }, template: '<Input model-value="" label="Titre" error="Obligatoire" hint="En français" /><Input model-value="" type="textarea" label="Description" error="Invalide" />' }));
  for (const input of view.findAll('input, textarea')) {
    expect(input.attributes('aria-invalid')).toBe('true');
    for (const id of input.attributes('aria-describedby')!.split(' ')) expect(view.get(`[id="${id}"]`).text()).not.toBe('');
  }
});

it.each([false, true])('moves between enabled tabs with arrows and Home/End (vertical=%s)', async vertical => {
  view = mount(Tabs, { props: { modelValue: 'one', vertical, tabs: [{ value: 'one', label: 'Un' }, { value: 'disabled', label: 'Désactivé', disabled: true }, { value: 'three', label: 'Trois' }] }, attachTo: document.body });
  const buttons = view.findAll('button'); buttons[0].element.focus();
  await buttons[0].trigger('keydown', { key: vertical ? 'ArrowDown' : 'ArrowRight' }); await flushPromises();
  expect(view.emitted('update:modelValue')?.at(-1)).toEqual(['three']); expect(document.activeElement).toBe(buttons[2].element);
  await buttons[2].trigger('keydown', { key: 'Home' }); await flushPromises(); expect(document.activeElement).toBe(buttons[0].element);
  await buttons[0].trigger('keydown', { key: 'End' }); await flushPromises(); expect(document.activeElement).toBe(buttons[2].element);
});

it('uses native selection buttons alongside finder actions and timeline badges', async () => {
  view = mount(FinderItem, { props: { label: { fr: 'Terre', en: '' }, itemId: 'earth', selected: false, hasChildren: true } });
  expect(view.get('.finder-item-content').element.tagName).toBe('BUTTON');
  await view.get('.finder-item-content').trigger('click'); expect(view.emitted('click')).toHaveLength(1);
  view.unmount();
  view = mount(PeriodCard, { props: { period: { id: 'earth', label: { fr: 'Terre', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], hasChildren: true }, isSelected: false } });
  expect(view.get('button[aria-label="Terre"]').element.tagName).toBe('BUTTON');
  await view.get('button[aria-label="Terre"]').trigger('click'); expect(view.emitted('select')).toHaveLength(1);
  await view.setProps({ loading: true }); await view.get('button[aria-label="Terre"]').trigger('click'); expect(view.emitted('select')).toHaveLength(1);
});
