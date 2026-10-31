import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import UiFeedbackHost from '@/components/UiFeedbackHost.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import { useUiStore } from '@/stores/useUiStore';
import { useConfirm } from '@/composables/useConfirm';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';
import { PeriodApiService } from '@/services/PeriodApiService';

let host: ReturnType<typeof mount>;
beforeEach(() => { vi.useFakeTimers(); setActivePinia(createPinia()); });
afterEach(() => { host?.unmount(); useUiStore().$dispose(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });
function start() { host = mount(UiFeedbackHost, { attachTo: document.body, global: { stubs: { teleport: true } } }); }
const button = (name: string) => host.findAll('button').find(b => b.text() === name)!;

it('resolves simultaneous confirmations in order without losing either answer', async () => {
  start(); const ui = useUiStore();
  const a = ui.requestConfirmation('Première', 'Un'); const b = ui.requestConfirmation('Deuxième', 'Deux');
  await nextTick(); expect(host.get('[role="alertdialog"]').text()).toContain('Première');
  const oldId = ui.confirmation!.id;
  await button('Confirmer').trigger('click'); expect(await a).toBe(true);
  ui.settleConfirmation(oldId, true); // A duplicate answer cannot accept the next request.
  expect(host.get('[role="alertdialog"]').text()).toContain('Deuxième');
  await button('Annuler').trigger('click'); expect(await b).toBe(false);
  expect(host.find('[role="alertdialog"]').exists()).toBe(false);
});

it.each(['active', 'queued'] as const)('removes a disposed consumer’s %s confirmation and preserves the other consumer', async target => {
  start(); const ui = useUiStore(); const owner = effectScope();
  const confirm = owner.run(useConfirm)!;
  const other = target === 'queued' ? ui.requestConfirmation('Autre', '') : null;
  const own = confirm('À abandonner', '');
  const after = target === 'active' ? ui.requestConfirmation('Autre', '') : other!;
  owner.stop(); expect(await own).toBe(false); await nextTick();
  expect(ui.confirmation?.title).toBe('Autre');
  await button('Confirmer').trigger('click'); expect(await after).toBe(true);
  expect(await confirm('Après fermeture', '')).toBe(false);
});

it('resolves every waiting caller as cancelled when the application host unmounts', async () => {
  start(); const ui = useUiStore();
  const a = ui.requestConfirmation('Un', ''); const b = ui.requestConfirmation('Deux', '');
  host.unmount(); expect(await Promise.all([a, b])).toEqual([false, false]); expect(ui.confirmation).toBeNull();
});

it('does not delete if the consumer disappears immediately after confirmation', async () => {
  const remove = vi.spyOn(PeriodApiService.getInstance(), 'deletePeriod');
  const owner = effectScope(); const deletion = owner.run(useDatabaseDelete)!;
  const result = deletion.handleDelete({ id: 'leaf', label: { fr: 'Feuille' } }, 'period');
  const ui = useUiStore(); ui.settleConfirmation(ui.confirmation!.id, true); owner.stop();
  expect(await result).toBe(false); expect(remove).not.toHaveBeenCalled();
});

it('focuses Cancel, traps Tab, restores focus and closes only the top confirmation on Escape', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  host = mount(ModalShell, { props: { title: 'Édition' }, slots: { default: UiFeedbackHost }, attachTo: document.body, global: { stubs: { teleport: true } } });
  const ui = useUiStore(); const waiting = ui.requestConfirmation('Supprimer ?', 'Irréversible'); await flushPromises();
  const dialog = host.get('[role="alertdialog"]'); const buttons = dialog.findAll('button');
  expect(document.activeElement).toBe(buttons[0].element);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(buttons[1].element);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(buttons[0].element);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await nextTick(); expect(await waiting).toBe(false); expect(host.emitted('close')).toBeUndefined();
  expect(document.activeElement).toBe(host.get('[role="dialog"] button').element);
  host.unmount(); expect(document.activeElement).toBe(trigger);
});

it('keeps the newest notification visible for its own duration and announces errors', async () => {
  start(); const ui = useUiStore(); ui.notify('Ancienne', 'info', 1000); await nextTick();
  await vi.advanceTimersByTimeAsync(900); ui.notify('Nouvelle', 'error', 2000); await nextTick();
  await vi.advanceTimersByTimeAsync(1000); expect(host.get('[role="alert"]').text()).toBe('Nouvelle');
  await vi.advanceTimersByTimeAsync(1000); expect(host.find('.toast').exists()).toBe(false);
});

it('clears a persistent notification explicitly and cancels its timer on disposal', async () => {
  start(); const ui = useUiStore(); ui.notify('En cours', 'info', 0); await vi.advanceTimersByTimeAsync(10000);
  expect(host.get('[role="status"]').text()).toBe('En cours');
  ui.hideNotification(); await nextTick(); expect(host.find('.toast').exists()).toBe(false);
  ui.notify('Attente'); expect(vi.getTimerCount()).toBe(1); ui.$dispose(); expect(vi.getTimerCount()).toBe(0);
});
