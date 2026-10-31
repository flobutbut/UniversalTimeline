import { afterEach, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import StoryItemActionsMenu from '@/views/DatabaseView/StoryItemActionsMenu.vue';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; });
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const options = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

it('opens a contextual menu without selecting the period and supports keyboard dismissal', async () => {
  const row = document.createElement('div'); document.body.append(row);
  let selected = false; row.onclick = () => { selected = true; };
  view = mount(StoryItemActionsMenu, { props: { label: 'Voie Lactée' }, attachTo: row });
  const trigger = view.get('button');
  await trigger.trigger('click'); await flushPromises();
  expect(selected).toBe(false);
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(options().map(item => item.textContent?.trim())).toEqual(['Modifier', 'Supprimer']);
  expect(document.activeElement).toBe(options()[0]);
  options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(options()[1]);
  options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flushPromises();
  expect(menu()).toBeNull(); expect(document.activeElement).toBe(trigger.element);
  expect(view.emitted('remove')).toBeUndefined(); expect(view.emitted('edit')).toBeUndefined();
});

it('dispatches only the selected action and closes on outside click or a disabled state', async () => {
  view = mount(StoryItemActionsMenu, { props: { label: 'Racine' }, attachTo: document.body });
  const trigger = view.get('button');
  await trigger.trigger('click'); options()[0].click(); await flushPromises();
  expect(view.emitted('edit')).toHaveLength(1); expect(view.emitted('remove')).toBeUndefined(); expect(menu()).toBeNull();
  await trigger.trigger('click'); options()[1].click(); await flushPromises();
  expect(view.emitted('remove')).toHaveLength(1); expect(menu()).toBeNull();
  await trigger.trigger('keydown', { key: 'ArrowUp' }); await flushPromises();
  expect(document.activeElement).toBe(options()[1]);
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); await flushPromises(); expect(menu()).toBeNull();
  await trigger.trigger('click'); await view.setProps({ disabled: true });
  expect(menu()).toBeNull(); expect(trigger.attributes('disabled')).toBeDefined();
});
