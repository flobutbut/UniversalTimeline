import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import { CURRENT_TERMS_VERSION } from '@account-rules';
import { setLanguage } from '@/i18n';
import ProfileView from '@/views/ProfileView.vue';
import { appRoutes } from '@/router/routes';
import { authService } from '@/services/AuthService';
import { profileApi, type AccountProfile } from '@/services/ProfileApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import type { StorySummary } from '@/types/database';

let pinia: Pinia; let router: Router; let view: ReturnType<typeof mount>;
const saved: AccountProfile = { username: 'Flobutbut', avatarColor: 'teal', avatarIcon: 'rocket', termsVersion: null, termsAcceptedAt: null, createdAt: '2026-11-02T10:00:00.000Z', currentTermsVersion: CURRENT_TERMS_VERSION };
const story = (id: string, ownerUserId: string) => ({ id, title: { fr: `Frise ${id}`, en: '' }, author: 'Flobutbut', isPublic: true, ownerUserId, categories: [] }) as StorySummary;

async function start(path = '/profile', profile: AccountProfile | null = saved) {
  pinia = createPinia();
  const auth = useAuthStore(pinia);
  Object.assign(auth, { enabled: true, ready: true, account: { id: 'alice', isAdmin: true } });
  vi.spyOn(profileApi, 'get').mockResolvedValue(profile);
  vi.spyOn(profileApi, 'usernameAvailable').mockResolvedValue(true);
  const data = useDataStore(pinia);
  data.stories = [story('1', 'alice'), story('2', 'alice'), story('3', 'bob')];
  vi.spyOn(data, 'ensureStoriesLoaded').mockResolvedValue();
  vi.spyOn(authService, 'getIdentity').mockResolvedValue({ email: 'alice@example.test', newEmail: null, createdAt: new Date('2026-10-29T09:07:58Z') });
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route ? { ...route, component: { template: '<div />' } } : route) });
  await router.push(path); await router.isReady();
  view = mount(ProfileView, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return auth;
}
afterEach(() => { view?.unmount(); router?.options.history.destroy(); disposePinia(pinia); vi.restoreAllMocks(); vi.useRealTimers(); });

it('lays out a left menu beside one main column, without a duplicate list of frises', async () => {
  await start();
  expect(view.get('nav').findAll('a').map(link => [link.text(), link.attributes('aria-current')])).toEqual([
    ['Profil', 'page'], ['Langue', undefined], ['Données et confidentialité', undefined], ['Session', undefined],
  ]);
  expect(view.text()).not.toContain('Mes frises');
  expect(view.text()).toContain('alice@example.test'); expect(view.text()).toContain('Administrateur');
});

it('opens the dedicated language section and switches the interface to English', async () => {
  await start('/profile?section=privacy');
  const nav = view.get('nav');
  expect(view.find('[role="combobox"]').exists()).toBe(false);
  await nav.get('a[href="/profile?section=language"]').trigger('click');
  await flushPromises();
  const panel = view.get('section[aria-labelledby="language-title"]');
  expect(panel.get('h2').text()).toBe('Langue');
  const select = panel.get('[role="combobox"]');
  try {
    await select.trigger('click');
    await panel.get('[role="option"]:last-child').trigger('click');
    expect(select.text()).toBe('EN');
    expect(panel.get('h2').text()).toBe('Language');
    expect(panel.get('label').text()).toBe('Interface language');
    expect(nav.get('[aria-current="page"]').text()).toBe(view.get('h2').text());
    expect(router.currentRoute.value.query.section).toBe('language');
  } finally {
    setLanguage('fr');
    localStorage.removeItem('universal-timeline.language');
  }
});

it('edits the avatar colour and motif and saves them with the username', async () => {
  const auth = await start();
  const save = vi.spyOn(profileApi, 'save').mockResolvedValue({ ...saved, avatarColor: 'violet', avatarIcon: 'compass' });
  expect(view.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  await view.get('input[name="avatar-color"][value="violet"]').setValue(true);
  await view.get('input[name="avatar-icon"][value="compass"]').setValue(true);
  await view.get('form').trigger('submit'); await flushPromises();
  expect(save).toHaveBeenCalledWith({ username: 'Flobutbut', avatarColor: 'violet', avatarIcon: 'compass' });
  expect(auth.profile?.avatarIcon).toBe('compass');
});

it('asks an account without profile to choose a username, checked before saving', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await start('/profile', null);
  expect(view.text()).toContain('obligatoire pour créer des frises');
  vi.mocked(profileApi.usernameAvailable).mockResolvedValue(false);
  await view.get('input[autocomplete="username"]').setValue('Pris');
  vi.advanceTimersByTime(500); await flushPromises();
  expect(view.text()).toContain('déjà pris');
  expect(view.get('button[type="submit"]').text()).toBe('Créer mon profil');
  expect(view.get('button[type="submit"]').attributes('disabled')).toBeDefined();
});

it('records the terms acceptance, exports the data and deletes the account after confirmation', async () => {
  const auth = await start('/profile?section=privacy');
  vi.spyOn(profileApi, 'acceptTerms').mockResolvedValue({ ...saved, termsVersion: CURRENT_TERMS_VERSION, termsAcceptedAt: '2026-11-02T11:00:00.000Z' });
  await view.findAll('button').find(button => button.text().startsWith('J’accepte'))!.trigger('click'); await flushPromises();
  expect(profileApi.acceptTerms).toHaveBeenCalledWith(CURRENT_TERMS_VERSION);
  expect(view.text()).toContain(`Vous avez accepté la version du ${CURRENT_TERMS_VERSION}`);

  vi.spyOn(profileApi, 'exportData').mockResolvedValue({ profile: saved, stories: [] });
  const createUrl = vi.fn(() => 'blob:export'); const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  await view.findAll('button').find(button => button.text() === 'Télécharger (JSON)')!.trigger('click'); await flushPromises();
  expect(click).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:export');

  expect(view.text()).toContain('toutes vos frises (2)');
  const remove = vi.spyOn(auth, 'deleteAccount').mockResolvedValue();
  const confirm = view.findAll('button').find(button => button.text() === 'Supprimer définitivement')!;
  expect(confirm.attributes('disabled')).toBeDefined();
  await view.get('.profile-view__danger input').setValue('Flobutbut'); await confirm.trigger('click'); await flushPromises();
  expect(remove).toHaveBeenCalledOnce(); expect(router.currentRoute.value.path).toBe('/timeline');
});
