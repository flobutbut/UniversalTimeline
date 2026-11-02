import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import Input from '@/components/base/Input.vue';
import Tag from '@/components/base/Tag.vue';
import { applyDocumentTheme, documentTheme, hasUserChosenTheme } from '@/composables/useDocumentTheme';

let view: VueWrapper;
afterEach(() => { view?.unmount(); localStorage.removeItem('theme'); applyDocumentTheme('light', false); });

it('keeps native form attributes and combines external help with field validation', async () => {
  view = mount(Input, { props: { modelValue: '', id: 'email', label: 'Adresse e-mail', type: 'email', required: true, hint: 'Adresse professionnelle', error: 'Adresse invalide' }, attrs: { name: 'email', autocomplete: 'email', 'aria-describedby': 'account-help' } });
  const field = view.get('input');
  expect(field.attributes()).toMatchObject({ name: 'email', autocomplete: 'email', 'aria-invalid': 'true', 'aria-describedby': 'account-help email-error email-hint' });
  expect(view.get('label').attributes('for')).toBe(field.attributes('id'));
  expect(view.get('.base-input').attributes('autocomplete')).toBeUndefined();
  await field.setValue('person@example.test');
  expect(view.emitted('update:modelValue')?.[0]).toEqual(['person@example.test']);
});

it('renders a linked tag without a router and keeps removal a separate named action', async () => {
  view = mount(Tag, { props: { label: 'Histoire', to: { path: '/timeline', query: { story: '17' }, hash: '#details' }, removable: true, disabled: true } });
  expect(view.get('a').attributes('href')).toBe('/timeline?story=17#details');
  const remove = view.get('button');
  expect(remove.attributes('aria-label')).toBe('Retirer Histoire');
  await remove.trigger('click');
  expect(view.emitted('remove')).toBeUndefined();
  await view.setProps({ disabled: false });
  await remove.trigger('click');
  expect(view.emitted('remove')).toHaveLength(1);
});

it('tracks an automatic theme without turning the system preference into a user choice', () => {
  localStorage.removeItem('theme');
  applyDocumentTheme('dark', false);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(documentTheme.value).toBe('dark');
  expect(hasUserChosenTheme()).toBe(false);
  applyDocumentTheme('light');
  expect(hasUserChosenTheme()).toBe(true);
  expect(localStorage.getItem('theme')).toBe('light');
});
