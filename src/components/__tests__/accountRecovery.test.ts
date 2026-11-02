import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import PasswordResetView from '@/views/PasswordResetView.vue';
import EmailChangeCard from '@/components/EmailChangeCard.vue';
import { useAuthStore } from '@/stores/useAuthStore';

const sdk = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), verifyOtp: vi.fn(), updateUser: vi.fn() }));
vi.mock('@/services/AuthService', () => ({ authService: { getClient: () => ({ auth: sdk }) } }));

let pinia: Pinia; let router: Router; let view: ReturnType<typeof mount> | undefined; let auth: ReturnType<typeof useAuthStore>;
const page = { template: '<div />' };
async function mountReset(path: string) {
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/reset-password', name: 'password-reset', component: PasswordResetView }, { path: '/login', name: 'login', component: page },
    { path: '/database', component: page },
  ] });
  await router.push(path); await router.isReady();
  view = mount(PasswordResetView, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return view;
}
beforeEach(() => {
  vi.resetAllMocks(); pinia = createPinia(); setActivePinia(pinia); auth = useAuthStore(); auth.enabled = true; auth.ready = true;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockImplementation(async () => { auth.account = { id: 'alice', isAdmin: false }; });
});
afterEach(() => { view?.unmount(); view = undefined; router?.options.history.destroy(); disposePinia(pinia); });

it('sends a reset link with a neutral answer that does not reveal whether the account exists', async () => {
  sdk.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  await mountReset('/reset-password?email=alice@example.test');
  expect((view!.get('#reset-email').element as HTMLInputElement).value).toBe('alice@example.test');
  await view!.get('form').trigger('submit'); await flushPromises();
  expect(sdk.resetPasswordForEmail).toHaveBeenCalledWith('alice@example.test', { redirectTo: `${window.location.origin}/reset-password` });
  expect(view!.get('[role="status"]').text()).toContain('Si un compte existe');
});

it('shows rate limits without provider details', async () => {
  sdk.resetPasswordForEmail.mockResolvedValue({ error: { code: 'over_email_send_rate_limit', message: 'private details' } });
  await mountReset('/reset-password');
  await view!.get('#reset-email').setValue('alice@example.test'); await view!.get('form').trigger('submit'); await flushPromises();
  expect(view!.get('[role="alert"]').text()).toContain('limite d’envoi'); expect(view!.text()).not.toContain('private details');
});

it('removes the token from the address bar, opens a recovery session and saves the new password', async () => {
  sdk.verifyOtp.mockResolvedValue({ data: {}, error: null }); sdk.updateUser.mockResolvedValue({ data: {}, error: null });
  await mountReset('/reset-password?token_hash=secret-hash&type=recovery');
  expect(router.currentRoute.value.fullPath).toBe('/reset-password');
  expect(sdk.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: 'secret-hash', type: 'recovery' });
  await view!.get('#reset-password').setValue('a-new-long-password'); await view!.get('#reset-password-confirmation').setValue('different');
  await view!.get('form').trigger('submit'); await flushPromises();
  expect(view!.get('[role="alert"]').text()).toContain('différents'); expect(sdk.updateUser).not.toHaveBeenCalled();
  await view!.get('#reset-password-confirmation').setValue('a-new-long-password'); await view!.get('form').trigger('submit'); await flushPromises();
  expect(sdk.updateUser).toHaveBeenCalledExactlyOnceWith({ password: 'a-new-long-password' });
  expect(router.currentRoute.value.path).toBe('/database');
});

it.each([
  [{ code: 'same_password' }, 'différent de l’ancien'],
  [{ code: 'weak_password' }, 'trop faible'],
])('explains a refused password (%o)', async (error, expected) => {
  sdk.verifyOtp.mockResolvedValue({ data: {}, error: null }); sdk.updateUser.mockResolvedValue({ error });
  await mountReset('/reset-password?token_hash=secret-hash&type=recovery');
  await view!.get('#reset-password').setValue('a-new-long-password'); await view!.get('#reset-password-confirmation').setValue('a-new-long-password');
  await view!.get('form').trigger('submit'); await flushPromises();
  expect(view!.get('[role="alert"]').text()).toContain(expected); expect(router.currentRoute.value.path).toBe('/reset-password');
});

it('offers a new link when the recovery link has expired or was already used', async () => {
  sdk.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
  await mountReset('/reset-password?token_hash=old&type=recovery');
  expect(view!.get('[role="alert"]').text()).toContain('n’est plus valable');
  await view!.findAll('button').find(button => button.text() === 'Demander un nouveau lien')!.trigger('click');
  expect(view!.find('#reset-email').exists()).toBe(true);
});

it('requests an e-mail change with a confirmation link back to the profile', async () => {
  sdk.updateUser.mockResolvedValue({ data: {}, error: null });
  const card = mount(EmailChangeCard, { props: { email: 'alice@example.test', pendingEmail: null }, global: { plugins: [pinia] } });
  await card.findAll('button').find(button => button.text() === 'Changer d’adresse')!.trigger('click');
  await card.get('#email-change-input').setValue('ALICE@example.test'); await card.get('form').trigger('submit'); await flushPromises();
  expect(card.get('[role="alert"]').text()).toContain('déjà l’adresse'); expect(sdk.updateUser).not.toHaveBeenCalled();
  await card.get('#email-change-input').setValue('alice@new.example.test'); await card.get('form').trigger('submit'); await flushPromises();
  expect(sdk.updateUser).toHaveBeenCalledExactlyOnceWith({ email: 'alice@new.example.test' }, { emailRedirectTo: `${window.location.origin}/profile` });
  expect(card.emitted('requested')).toHaveLength(1);
  await card.setProps({ pendingEmail: 'alice@new.example.test' });
  expect(card.get('[role="status"]').text()).toContain('alice@new.example.test');
  card.unmount();
});

it('explains a refused e-mail change', async () => {
  sdk.updateUser.mockResolvedValue({ error: { code: 'email_exists', message: 'private' } });
  const card = mount(EmailChangeCard, { props: { email: 'alice@example.test', pendingEmail: null }, global: { plugins: [pinia] } });
  await card.findAll('button').find(button => button.text() === 'Changer d’adresse')!.trigger('click');
  await card.get('#email-change-input').setValue('bob@example.test'); await card.get('form').trigger('submit'); await flushPromises();
  expect(card.get('[role="alert"]').text()).toContain('déjà utilisée'); expect(card.text()).not.toContain('private');
  card.unmount();
});
