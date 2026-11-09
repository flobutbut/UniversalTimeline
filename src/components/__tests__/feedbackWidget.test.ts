import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import FeedbackWidget from '../FeedbackWidget.vue';
import FeedbackForm from '../FeedbackForm.vue';
import AdminFeedback from '@/views/AdminView/AdminFeedback.vue';
import { feedbackApi } from '@/services/FeedbackApiService';
import { feedbackReply } from '@/lib/feedbackReply';
import { useConsentStore } from '@/stores/useConsentStore';
import { useUiStore } from '@/stores/useUiStore';
import Select from '@/components/base/Select.vue';
import type { UserFeedback } from '../../../server/src/shared/feedback';

let view: ReturnType<typeof mount> | undefined;
beforeEach(() => { vi.spyOn(feedbackApi, 'settings').mockResolvedValue({ enabled: true }); vi.spyOn(feedbackApi, 'notifications').mockResolvedValue({ enabled: false, available: false, email: 'admin@example.test' }); });
afterEach(() => { view?.unmount(); view = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function render(component: any) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/legal/:page', name: 'legal', component: { template: '<div />' } },
    { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
  ] });
  await router.push('/timeline?story=5');
  const pinia = createPinia();
  view = mount(component, { attachTo: document.body, global: { plugins: [pinia, router] } });
  await flushPromises();
  return { view, pinia };
}
async function fillForm() {
  await view!.getComponent(FeedbackForm).get('[role="combobox"]').trigger('click');
  const option = document.querySelector<HTMLElement>('[role="option"]');
  expect(option).not.toBeNull(); option!.click(); await flushPromises();
  await view!.getComponent(FeedbackForm).get('textarea').setValue('Une frise sur les grandes explorations serait utile.');
}
it('opens only on demand, saves before asking for email, and restores trigger focus on Escape', async () => {
  const submit = vi.spyOn(feedbackApi, 'submit').mockResolvedValue({ id: 'receipt' });
  const addEmail = vi.spyOn(feedbackApi, 'addEmail').mockResolvedValue();
  await render(FeedbackWidget);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const trigger = document.querySelector<HTMLButtonElement>('.feedback-widget__trigger')!; trigger.focus(); trigger.click(); await flushPromises();
  expect(view!.findComponent(FeedbackForm).exists()).toBe(true);
  expect(view!.findComponent(FeedbackForm).find('input[type="email"]').exists()).toBe(false);
  await fillForm();
  await view!.getComponent(FeedbackForm).get('form').trigger('submit'); await flushPromises();
  expect(submit).toHaveBeenCalledOnce(); expect(submit.mock.calls[0][0]).toMatchObject({ rating: null, subject: 'missing_timeline' });
  expect(addEmail).not.toHaveBeenCalled();
  expect(view!.getComponent(FeedbackForm).text()).toContain('Votre retour est enregistré');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await flushPromises();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(document.querySelector('.feedback-widget__trigger'));
});
it('retries the exact submission after a lost response and lets email retry independently', async () => {
  const submit = vi.spyOn(feedbackApi, 'submit').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ id: 'receipt' });
  const addEmail = vi.spyOn(feedbackApi, 'addEmail').mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
  await render(FeedbackWidget);
  document.querySelector<HTMLButtonElement>('.feedback-widget__trigger')!.click(); await flushPromises();
  await fillForm();
  await view!.getComponent(FeedbackForm).get('form').trigger('submit'); await flushPromises();
  expect(view!.getComponent(FeedbackForm).get('textarea').element.value).toContain('grandes explorations');
  await view!.getComponent(FeedbackForm).get('form').trigger('submit'); await flushPromises();
  expect(submit.mock.calls[1][0]).toEqual(submit.mock.calls[0][0]);
  await view!.getComponent(FeedbackForm).get('input[type="email"]').setValue('user@example.test');
  await view!.getComponent(FeedbackForm).get('form').trigger('submit'); await flushPromises();
  expect(view!.getComponent(FeedbackForm).find('input[type="email"]').exists()).toBe(true);
  await view!.getComponent(FeedbackForm).get('form').trigger('submit'); await flushPromises();
  expect(view!.getComponent(FeedbackForm).text()).toContain('Votre adresse a bien été ajoutée');
  expect(submit).toHaveBeenCalledTimes(2); expect(addEmail).toHaveBeenCalledTimes(2);
});
it('keeps feedback available when the cookie panel is open or blocked', async () => {
  const { pinia } = await render(FeedbackWidget);
  const consent = useConsentStore(pinia); consent.preferencesOpen = true; await flushPromises();
  expect(document.querySelector('.feedback-widget__trigger')).not.toBeNull();
  document.querySelector<HTMLButtonElement>('.feedback-widget__trigger')!.click(); await flushPromises();
  expect(view!.findComponent(FeedbackForm).exists()).toBe(true);
});
const item: UserFeedback = { id: 'receipt', subject: 'data_error', message: '<script>Un texte utilisateur</script>', pageUrl: 'https://example.test/timeline?story=5', email: 'user@example.test', status: 'new', rating: 4, createdAt: '2026-11-09T12:00:00Z' };
it('shows escaped feedback in admin and opens an editable reply with the original context', async () => {
  vi.spyOn(feedbackApi, 'list').mockResolvedValue({ items: [{ ...item }], total: 1 });
  const status = vi.spyOn(feedbackApi, 'setStatus').mockResolvedValue();
  await render(AdminFeedback);
  expect(view!.find('.admin-feedback__message script').exists()).toBe(false);
  expect(view!.get('.admin-feedback__page').attributes('href')).toBe(item.pageUrl);
  const resolve = view!.findAll('button').find(button => button.text() === 'Marquer « Résolu »')!;
  await resolve.trigger('click'); await flushPromises(); expect(status).toHaveBeenCalledWith(item.id, 'resolved');
  await view!.findAll('button').find(button => button.text() === 'Répondre')!.trigger('click'); await flushPromises();
  const body = document.querySelector<HTMLTextAreaElement>('.admin-feedback__reply textarea')!;
  expect(body.value).toContain('Votre retour a été traité'); expect(body.value).toContain(item.message); expect(body.value).toContain(item.pageUrl);
  const link = document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href^="mailto:"]')!;
  expect(decodeURIComponent(link.getAttribute('href')!)).toContain('mailto:user@example.test?subject=');
});
it('distinguishes acknowledgment from resolution in the reply template', () => {
  expect(feedbackReply(item).body).toContain('l’avons pris en compte');
  expect(feedbackReply({ ...item, status: 'resolved' }).body).toContain('a été traité');
});

it('deletes only after confirmation and refreshes the feedback list', async () => {
  vi.spyOn(feedbackApi, 'list').mockResolvedValueOnce({ items: [{ ...item }], total: 1 }).mockResolvedValue({ items: [], total: 0 });
  const remove = vi.spyOn(feedbackApi, 'remove').mockResolvedValue();
  const { pinia } = await render(AdminFeedback);
  const ui = useUiStore(pinia);
  const button = view!.findAll('button').find(button => button.text() === 'Supprimer')!;
  await button.trigger('click'); await flushPromises();
  expect(ui.confirmation?.title).toBe('Supprimer ce retour ?');
  expect(remove).not.toHaveBeenCalled();
  ui.settleConfirmation(ui.confirmation!.id, false); await flushPromises();
  expect(remove).not.toHaveBeenCalled();
  await button.trigger('click'); await flushPromises();
  ui.settleConfirmation(ui.confirmation!.id, true); await flushPromises();
  expect(remove).toHaveBeenCalledExactlyOnceWith(item.id);
  expect(view!.find('.admin-feedback__card').exists()).toBe(false);
});

it('persists email notifications for the authenticated admin and keeps the previous choice on failure', async () => {
  vi.mocked(feedbackApi.notifications).mockResolvedValue({ enabled: false, available: true, email: 'admin@example.test' });
  vi.spyOn(feedbackApi, 'list').mockResolvedValue({ items: [], total: 0 });
  const save = vi.spyOn(feedbackApi, 'setNotifications').mockResolvedValueOnce({ enabled: true, available: true, email: 'admin@example.test' }).mockRejectedValueOnce(new Error('offline'));
  await render(AdminFeedback);
  const toggle = view!.get('.admin-feedback__notifications [role="switch"]');
  expect(view!.get('.admin-feedback__filters').text()).toContain('Envoyer sur admin@example.test');
  await toggle.trigger('click'); await flushPromises();
  expect(save).toHaveBeenCalledWith(true); expect(toggle.attributes('aria-checked')).toBe('true');
  await toggle.trigger('click'); await flushPromises();
  expect(save).toHaveBeenLastCalledWith(false); expect(toggle.attributes('aria-checked')).toBe('true');
  expect(view!.get('[role="alert"]').text()).toContain('offline');
});
it('keeps the compact switch unavailable until configured, with setup information in its tooltip', async () => {
  vi.spyOn(feedbackApi, 'list').mockResolvedValue({ items: [], total: 0 });
  await render(AdminFeedback);
  expect(view!.get('.admin-feedback__notifications [role="switch"]').attributes('disabled')).toBeDefined();
  expect(view!.get('.admin-feedback__notifications').attributes('title')).toBe('Envoi des e-mails à configurer');
});

it('combines the shared object and status filters and returns to the first page when either changes', async () => {
  const list = vi.spyOn(feedbackApi, 'list').mockResolvedValue({ items: [], total: 100 });
  await render(AdminFeedback);
  await view!.findAll('button').find(button => button.text() === 'Suivant')!.trigger('click'); await flushPromises();
  expect(list).toHaveBeenLastCalledWith(50, { subject: undefined, status: undefined });
  const selects = view!.findAllComponents(Select);
  const subject = selects.find(select => select.props('label') === 'Objet')!;
  const status = selects.find(select => select.props('label') === 'Statut')!;
  expect(subject.props('options').map((option: any) => option.label)).toEqual(['Tous les objets', 'Frise manquante', 'Erreur de données', 'Suggestion de fonctionnalité', 'Bug technique', 'Autre']);
  subject.vm.$emit('update:modelValue', 'bug'); await flushPromises();
  expect(list).toHaveBeenLastCalledWith(0, { subject: 'bug', status: undefined });
  status.vm.$emit('update:modelValue', 'resolved'); await flushPromises();
  expect(list).toHaveBeenLastCalledWith(0, { subject: 'bug', status: 'resolved' });
  subject.vm.$emit('update:modelValue', 'all'); await flushPromises();
  expect(list).toHaveBeenLastCalledWith(0, { subject: undefined, status: 'resolved' });
});

it('hides feedback when globally disabled, preserves cookies and closes an open form on refresh', async () => {
  vi.mocked(feedbackApi.settings).mockResolvedValueOnce({ enabled: false }).mockResolvedValueOnce({ enabled: true }).mockResolvedValue({ enabled: false });
  const { pinia } = await render(FeedbackWidget);
  const consent = useConsentStore(pinia); consent.preferencesOpen = true; await flushPromises();
  expect(document.querySelector('.feedback-widget__trigger')).toBeNull();
  expect(document.querySelector('.cookie-consent')).not.toBeNull();
  window.dispatchEvent(new Event('focus')); await flushPromises();
  document.querySelector<HTMLButtonElement>('.feedback-widget__trigger')!.click(); await flushPromises();
  expect(view!.findComponent(FeedbackForm).exists()).toBe(true);
  window.dispatchEvent(new Event('focus')); await flushPromises();
  expect(view!.findComponent(FeedbackForm).exists()).toBe(false);
  expect(document.querySelector('.feedback-widget__trigger')).toBeNull();
});
it('persists the global switch and keeps it unchanged on a failed save', async () => {
  vi.spyOn(feedbackApi, 'list').mockResolvedValue({ items: [], total: 0 });
  const save = vi.spyOn(feedbackApi, 'setEnabled').mockResolvedValueOnce({ enabled: false }).mockRejectedValueOnce(new Error('offline'));
  await render(AdminFeedback);
  const toggle = view!.get('.admin-feedback__header [role="switch"]');
  expect(toggle.attributes('aria-checked')).toBe('true');
  await toggle.trigger('click'); await flushPromises();
  expect(save).toHaveBeenLastCalledWith(false); expect(toggle.attributes('aria-checked')).toBe('false');
  await toggle.trigger('click'); await flushPromises();
  expect(save).toHaveBeenLastCalledWith(true); expect(toggle.attributes('aria-checked')).toBe('false');
  expect(view!.get('[role="alert"]').text()).toContain('offline');
});
