import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import LandingView from '@/views/LandingView.vue';
import { useAuthStore } from '@/stores/useAuthStore';

vi.mock('@/components/ThemeToggle.vue', () => ({ default: { template: '<button>Thème</button>' } }));
vi.mock('@/components/LandingTimeDemo.vue', () => ({ default: { template: '<div />' } }));
let view: ReturnType<typeof mount>;
let router: Router;
let pinia: Pinia;
async function start(signedIn: boolean) {
  pinia = createPinia();
  const auth = useAuthStore(pinia);
  if (signedIn) { auth.enabled = true; auth.ready = true; auth.account = { id: 'alice', isAdmin: false }; }
  const page = { template: '<div />' };
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', name: 'landing', component: page }, { path: '/timeline', name: 'timeline', component: page },
    { path: '/login', name: 'login', component: page }, { path: '/database', name: 'database', component: page },
    { path: '/legal/:page', name: 'legal', component: page }, { path: '/contact', name: 'contact', component: page }, { path: '/catalogue', name: 'catalogue', component: page },
  ] });
  await router.push('/'); await router.isReady();
  view = mount(LandingView, { global: { plugins: [pinia, router] } });
  await flushPromises();
}
afterEach(() => { view?.unmount(); router?.options.history.destroy(); if (pinia) disposePinia(pinia); vi.restoreAllMocks(); });

it('turns each usage example into a measured link towards a public frise', async () => {
  await start(false);
  const examples = view.findAll('.workspace-example a.example-row');
  expect(examples.map(link => link.attributes('data-attr'))).toEqual(['landing-cta-example_course', 'landing-cta-example_research', 'landing-cta-example_project']);
  expect(examples.map(link => link.attributes('href'))).toEqual(['/timeline?story=30', '/timeline?story=22', '/timeline?story=14']);
  expect(examples[0]!.text()).toContain('Donner des repères à un cours');
  expect(examples[0]!.text()).toContain('Voir « Révolution française »');
  expect(examples[0]!.get('.sr-only').text()).toContain('ouvrir cet exemple');
});

it('keeps the examples on public frises and the creation link on the account path', async () => {
  await start(false);
  expect(view.get('[data-attr="landing-cta-create"]').attributes('href')).toBe('/login?mode=signup&redirect=/database');
  view.unmount(); router.options.history.destroy(); disposePinia(pinia);
  await start(true);
  expect(view.get('.workspace-example a.example-row').attributes('href')).toBe('/timeline?story=30');
  expect(view.get('[data-attr="landing-cta-create"]').attributes('href')).toBe('/database');
});

it('opens exploration from Mon espace while keeping creation links in Frises', async () => {
  await start(true);
  const workspace = view.get('[data-attr="landing-cta-login"]');
  expect(workspace.text()).toBe('Mon espace');
  expect(workspace.attributes('href')).toBe('/timeline');
  await workspace.trigger('click'); await flushPromises();
  expect(router.currentRoute.value.name).toBe('timeline');
  expect(view.get('[data-attr="landing-cta-create"]').attributes('href')).toBe('/database');
});
