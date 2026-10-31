import { afterEach, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { useAuthStore } from '@/stores/useAuthStore';
import { installAccessGuard, safeReturnPath } from '../access';

let router: Router;
afterEach(() => { router?.options.history.destroy(); vi.restoreAllMocks(); });
function setup(options: { enabled?: boolean | null; ready?: boolean; account?: { id: string; isAdmin: boolean } } = {}) {
  setActivePinia(createPinia()); const auth = useAuthStore();
  auth.enabled = options.enabled === undefined ? true : options.enabled; auth.ready = options.ready ?? true; auth.account = options.account ?? null;
  vi.spyOn(auth, 'initialize').mockResolvedValue();
  vi.spyOn(auth, 'refreshAccount').mockResolvedValue();
  const page = { template: '<div />' };
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/timeline', name: 'timeline', component: page, meta: { public: true } },
    { path: '/stories', name: 'database', component: page },
    { path: '/design-system', name: 'design-system', component: page, meta: { admin: true } },
    { path: '/login', name: 'login', component: page, meta: { public: true } },
    { path: '/forbidden', name: 'forbidden', component: page, meta: { public: true } },
  ] });
  installAccessGuard(router, auth); return auth;
}
it('keeps the timeline public when anonymous or when account verification is unavailable', async () => {
  setup({ ready: false, enabled: null }); await router.push('/timeline');
  expect(router.currentRoute.value.name).toBe('timeline');
});
it('redirects an anonymous deep link to login and preserves its local return path', async () => {
  setup(); await router.push('/stories?sort=new#selection');
  expect(router.currentRoute.value.name).toBe('login');
  expect(router.currentRoute.value.query.redirect).toBe('/stories?sort=new#selection');
});
it('fails closed when the access configuration is unavailable', async () => {
  setup({ ready: false, enabled: null }); await router.push('/stories');
  expect(router.currentRoute.value.name).toBe('login');
});
it('lets a verified account reach its workspace', async () => {
  setup({ account: { id: 'alice', isAdmin: false } }); await router.push('/stories');
  expect(router.currentRoute.value.name).toBe('database');
});
it('refuses Design system for a regular account, including a direct URL', async () => {
  setup({ account: { id: 'alice', isAdmin: false } }); await router.push('/design-system');
  expect(router.currentRoute.value.name).toBe('forbidden');
});
it('lets a verified admin reach Design system', async () => {
  setup({ account: { id: 'alice', isAdmin: true } }); await router.push('/design-system');
  expect(router.currentRoute.value.name).toBe('design-system');
});
it('keeps protected pages closed while authentication is disabled', async () => {
  setup({ enabled: false }); await router.push('/stories');
  expect(router.currentRoute.value.name).toBe('login');
});
it.each(['https://example.com', '//example.com', '/\\example.com', '/login?redirect=x', '/forbidden', '/\u0000test', undefined])('refuses unsafe or looping return paths: %s', value => {
  expect(safeReturnPath(value)).toBe('/timeline');
});
it('accepts a local return path including query and hash', () => {
  expect(safeReturnPath('/database?sort=new#story')).toBe('/database?sort=new#story');
});
