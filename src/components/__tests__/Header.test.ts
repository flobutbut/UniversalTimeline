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
  view = mount({ components: { Header, RouterView }, props: { currentView: { default: 'timeline' } }, template: '<Header :current-view="currentView" /><RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return auth;
}
afterEach(() => { if (view?.exists()) view.unmount(); router?.options.history.destroy(); disposePinia(pinia); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([
  { enabled: true, ready: true },
  { enabled: false, ready: true },
  { enabled: null, ready: false },
  { enabled: true, ready: false, account: { id: 'unverified', isAdmin: true } },
])('shows public navigation, search and account actions before a verified session: %j', async options => {
  await start(options);
  expect(view.get('.header-nav').findAll('a').map(a => a.text())).toEqual(['Exploration', 'Catalogue']);
  expect(view.find('input[aria-label="Recherche globale"]').exists()).toBe(true);
  expect(view.get('.header-account-actions').findAll('a').map(a => [a.text(), a.attributes('href')])).toEqual([
    ['Se connecter', '/login'], ['Créer un compte', '/login?mode=signup'],
  ]);
  expect(view.get('.header-controls [role="combobox"]').attributes('aria-label')).toBe('Langue');
  expect(view.text()).not.toContain('Se déconnecter');
});
it.each(['/database', '/periods', '/graph', '/events', '/design-system'])('redirects an anonymous direct URL to login: %s', async path => {
  await start({ path });
  expect(router.currentRoute.value.name).toBe('login');
  expect(router.currentRoute.value.query.redirect).toBe(path);
  expect(view.get('.header-nav').findAll('a').map(a => a.text())).toEqual(['Exploration', 'Catalogue']);
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
  expect(view.get('.header-nav').findAll('a').map(a => a.text())).toEqual(['Exploration', 'Catalogue', 'Mes frises', ...(isAdmin ? ['Administration'] : [])]);
  expect(view.find('.header-account-actions').exists()).toBe(false);
  expect(view.find('.header-controls [role="combobox"]').exists()).toBe(false);
  const trigger = view.get('button[aria-haspopup="dialog"]');
  expect(trigger.attributes('aria-label')).toBe('Compte : Mon compte'); expect(view.text()).not.toContain('Se déconnecter');
  await trigger.trigger('click'); await flushPromises();
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(view.findAll('.user-menu__item').map(item => item.text())).toEqual(['Profil', 'Données et confidentialité', 'Se déconnecter']);
  expect(view.get('.user-menu__item').attributes('href')).toBe('/profile');
  expect(view.find('[role="dialog"] [role="combobox"]').exists()).toBe(false);
  await view.get('[role="dialog"]').trigger('keydown', { key: 'Escape' }); await flushPromises();
  expect(view.find('[role="dialog"]').exists()).toBe(false);
  auth.account = null; await flushPromises();
  expect(view.get('.header-nav').findAll('a').map(a => a.text())).toEqual(['Exploration', 'Catalogue']);
  expect(view.find('.header-account-actions').exists()).toBe(true);
});

it('collapses navigation when space runs out, keeps navigation usable and expands again when space returns', async () => {
  let availableWidth = 1800;
  let resize = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('header-content') ? availableWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('header-brand')) return 160;
    if (this.classList.contains('header-nav')) return this.children.length * 120;
    if (this.classList.contains('header-controls')) return 76;
    return 0;
  });
  const auth = await start({ account: { id: 'alice', isAdmin: true } });
  const header = view.getComponent(Header);
  expect(view.find('.header-nav-select').exists()).toBe(false);

  availableWidth = 1360; resize(); await flushPromises();
  expect(view.find('.header-nav-select').exists()).toBe(false);
  expect(view.get('.header-content').attributes('style')).toContain('--header-search-width: 248px');

  // Les trois groupes tiendraient côte à côte, mais décentreraient la recherche.
  availableWidth = 1240; resize(); await flushPromises();
  expect(view.find('.header-nav-select').exists()).toBe(true);

  availableWidth = 604; resize(); await flushPromises();
  expect(view.get('.header-content').attributes('style')).toContain('--header-search-width: 172px');
  expect(view.find('.header-search-open').exists()).toBe(false);

  availableWidth = 602; resize(); await flushPromises();
  expect(view.find('.header-search-wrap').exists()).toBe(false);
  expect(view.get('.header-search-open').attributes('href')).toBe('/search?from=/timeline');

  availableWidth = 1240; resize(); await flushPromises();
  expect(view.find('.header-search-open').exists()).toBe(false);
  expect(view.get('.header-nav-wrap').attributes('inert')).toBeDefined();
  expect(view.get('.header-nav-wrap').attributes('aria-hidden')).toBe('true');
  expect(view.get('[role="combobox"]').attributes('aria-label')).toBe('Navigation principale');
  expect(view.get('[role="combobox"]').text()).toBe('Exploration');
  await view.get('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await view.get('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await view.get('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await view.get('[role="combobox"]').trigger('keydown', { key: 'Enter' });
  expect(header.emitted('change-view')).toEqual([['catalogue']]);

  // Frises conserve exactement la même recherche et le même repli.
  await view.setProps({ currentView: 'database' });
  expect(view.find('.header-nav-select').exists()).toBe(true);
  expect(view.find('.header-search-wrap').exists()).toBe(true);
  // Sans recherche, les onglets peuvent tenir dans la même largeur.
  await view.setProps({ currentView: 'admin' });
  expect(view.find('.header-nav-select').exists()).toBe(false);
  expect(view.find('.header-search-wrap').exists()).toBe(false);
  await view.setProps({ currentView: 'timeline' });
  expect(view.find('.header-nav-select').exists()).toBe(true);

  // Le repli dépend aussi des droits et du nombre réel d'onglets.
  auth.account = { id: 'alice', isAdmin: false }; await flushPromises();
  expect(view.find('.header-nav-select').exists()).toBe(false);
  auth.account = { id: 'alice', isAdmin: true }; await flushPromises();
  expect(view.find('.header-nav-select').exists()).toBe(true);

  availableWidth = 1800; resize(); await flushPromises();
  expect(view.find('.header-nav-select').exists()).toBe(false);
  expect(view.get('.header-nav-wrap').attributes('inert')).toBeUndefined();
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it.each(['timeline', 'catalogue', 'database'] as const)('opens dedicated search on mobile from %s even when a field could still fit', async currentView => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(550);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('header-brand')) return 32;
    if (this.classList.contains('header-nav')) return 400;
    if (this.classList.contains('header-controls')) return 40;
    return 0;
  });
  const path = currentView === 'timeline' ? '/timeline?story=9&entry=universe' : currentView === 'catalogue' ? '/catalogue' : '/database?story=9';
  await start({ account: { id: 'alice', isAdmin: true }, path });
  await view.setProps({ currentView });
  expect(view.find('.header-search-wrap').exists()).toBe(false);
  expect(view.find('.header-nav-select').exists()).toBe(true);
  await view.get('.header-search-open').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('search');
  expect(router.currentRoute.value.query.from).toBe(path);
});
