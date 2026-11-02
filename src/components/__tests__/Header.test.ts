import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import Header from '@/components/Header.vue';
import LoginView from '@/views/LoginView.vue';
import { appRoutes } from '@/router/routes';
import { installAccessGuard } from '@/router/access';
import { useAuthStore } from '@/stores/useAuthStore';

vi.mock('@/components/GlobalSearch.vue', () => ({ default: { template: '<input aria-label="Recherche globale" />' } }));
vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/services/ProfileApiService', () => ({ profileApi: { get: vi.fn().mockResolvedValue(null) } }));
let pinia: Pinia;
let router: Router;
let view: ReturnType<typeof mount>;
async function start(options: { enabled?: boolean | null; ready?: boolean; account?: { id: string; isAdmin: boolean }; path?: string } = {}) {
  pinia = createPinia();
  const auth = useAuthStore(pinia);
  auth.enabled = options.enabled === undefined ? true : options.enabled;
  auth.ready = options.ready ?? true;
  auth.account = options.account ?? null;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route
    ? { ...route, component: route.name === 'login' ? LoginView : { template: '<div />' } } : route) });
  installAccessGuard(router, auth);
  await router.push(options.path ?? '/timeline'); await router.isReady();
  view = mount({ components: { Header, RouterView }, template: '<Header current-view="timeline" /><RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return auth;
}
afterEach(() => { view?.unmount(); router?.options.history.destroy(); disposePinia(pinia); vi.restoreAllMocks(); });

it.each([
  { enabled: true, ready: true },
  { enabled: false, ready: true },
  { enabled: null, ready: false },
  { enabled: true, ready: false, account: { id: 'unverified', isAdmin: true } },
])('shows search and the two account actions without a redundant navigation tab before a verified session: %j', async options => {
  await start(options);
  expect(view.find('.header-nav').exists()).toBe(false);
  expect(view.find('input[aria-label="Recherche globale"]').exists()).toBe(true);
  expect(view.get('.header-account-actions').findAll('a').map(a => [a.text(), a.attributes('href')])).toEqual([
    ['Se connecter', '/login'], ['Créer un compte', '/login?mode=signup'],
  ]);
  expect(view.text()).not.toContain('Se déconnecter');
});
it.each(['/database', '/periods', '/graph', '/events', '/design-system'])('redirects an anonymous direct URL to login: %s', async path => {
  await start({ path });
  expect(router.currentRoute.value.name).toBe('login');
  expect(router.currentRoute.value.query.redirect).toBe(path);
  expect(view.find('.header-nav').exists()).toBe(false);
});
it('opens signup from the header and preserves the original destination when switching back to login', async () => {
  await start({ path: '/events?event=example' });
  await view.get('.header-account-actions').findAll('a')[1].trigger('click'); await flushPromises();
  expect(view.get('h2').text()).toBe('Créer un compte');
  expect(router.currentRoute.value.query.redirect).toBe('/events?event=example');
  await view.get('#account-password').setValue('test-password');
  await view.get('.header-account-actions').findAll('a')[0].trigger('click'); await flushPromises();
  expect(view.get('h2').text()).toBe('Se connecter');
  expect(view.get('#account-password').element.value).toBe('');
  expect(router.currentRoute.value.query.redirect).toBe('/events?event=example');
});
it.each([false, true])('restores the appropriate workspace navigation for a verified account (admin: %s)', async isAdmin => {
  const auth = await start({ account: { id: 'alice', isAdmin } });
  expect(view.get('.header-nav').findAll('a').map(a => a.text())).toEqual(['Timeline', 'Frises', 'Périodes', 'Événements', ...(isAdmin ? ['Design system'] : [])]);
  expect(view.find('.header-account-actions').exists()).toBe(false);
  const trigger = view.get('button[aria-haspopup="menu"]');
  expect(trigger.attributes('aria-label')).toBe('Compte : Mon compte'); expect(view.text()).not.toContain('Se déconnecter');
  await trigger.trigger('click'); await flushPromises();
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(view.findAll('[role="menuitem"]').map(item => item.text())).toEqual(['Profil', 'Données et confidentialité', 'Se déconnecter']);
  expect(view.get('[role="menuitem"]').attributes('href')).toBe('/profile');
  await view.get('[role="menu"]').trigger('keydown', { key: 'Escape' }); await flushPromises();
  expect(view.find('[role="menu"]').exists()).toBe(false);
  auth.account = null; await flushPromises();
  expect(view.find('.header-nav').exists()).toBe(false);
  expect(view.find('.header-account-actions').exists()).toBe(true);
});
