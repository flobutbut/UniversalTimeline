import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import CookieConsent from '@/components/CookieConsent.vue';
import LegalView from '@/views/LegalView.vue';
import ContactView from '@/views/ContactView.vue';
import StoryGallery from '@/views/DatabaseView/StoryGallery.vue';
import { appRoutes } from '@/router/routes';
import { useConsentStore, CONSENT_VERSION } from '@/stores/useConsentStore';
import { CONTACT_EMAIL, LEGAL_PAGES, legalDocuments } from '@/lib/legalDocuments';

let pinia: Pinia; let router: Router; let view: ReturnType<typeof mount> | undefined;
async function mountWithRouter(component: object, path = '/timeline', props: Record<string, unknown> = {}) {
  router = createRouter({ history: createMemoryHistory(), routes: appRoutes.map(route => 'component' in route ? { ...route, component: { template: '<div />' } } : route) });
  await router.push(path); await router.isReady();
  view = mount(component, { props, global: { plugins: [pinia, router] } });
  await flushPromises();
  return view;
}
beforeEach(() => { localStorage.clear(); pinia = createPinia(); setActivePinia(pinia); });
afterEach(() => { view?.unmount(); view = undefined; router?.options.history.destroy(); disposePinia(pinia); vi.unstubAllEnvs(); vi.useRealTimers(); });

it('shows no banner while no tracker is configured, but keeps the preferences reachable', async () => {
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', '');
  const consent = useConsentStore();
  await mountWithRouter(CookieConsent);
  expect(view!.find('.cookie-consent').exists()).toBe(false);
  consent.openPreferences(); await flushPromises();
  expect(view!.text()).toContain('Aucun traceur de mesure d’audience n’est actif');
  expect(view!.findAll('[role="switch"]').map(item => item.attributes('aria-checked'))).toEqual(['true', 'false', 'true']);
});

it('asks once a tracker exists, measures anonymously until consent, and lets the visitor object', async () => {
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'future-provider');
  const consent = useConsentStore();
  const tracker = { apply: vi.fn() };
  consent.registerTracker(tracker);
  await mountWithRouter(CookieConsent);
  const buttons = () => view!.findAll('button').map(button => button.text());
  expect(buttons()).toEqual(['Tout refuser', 'Personnaliser', 'Tout accepter']);
  expect(tracker.apply).toHaveBeenLastCalledWith('exempt');
  await view!.findAll('button')[0].trigger('click');
  expect(JSON.parse(localStorage.getItem('ut-consent')!)).toMatchObject({ version: CONSENT_VERSION, analytics: false, anonymous: true });
  expect(view!.find('.cookie-consent').exists()).toBe(false); expect(tracker.apply).toHaveBeenCalledTimes(1);
  consent.acceptAll(); await flushPromises(); expect(tracker.apply).toHaveBeenLastCalledWith('consented');
  consent.rejectAll(); await flushPromises(); expect(tracker.apply).toHaveBeenLastCalledWith('exempt');
  // Objecting to the anonymous measurement from the preferences stops everything.
  consent.openPreferences(); await flushPromises();
  await view!.findAll('[role="switch"]')[2]!.trigger('click');
  await view!.findAll('button').find(button => button.text() === 'Enregistrer mes choix')!.trigger('click'); await flushPromises();
  expect(consent.choice).toMatchObject({ analytics: false, anonymous: false }); expect(tracker.apply).toHaveBeenLastCalledWith('off');
  consent.rejectAll(); await flushPromises(); expect(consent.measurementMode).toBe('off');
});

it('never measures a device where an administrator signed in, even signed out later', () => {
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'future-provider');
  const consent = useConsentStore(); const tracker = { apply: vi.fn() };
  consent.registerTracker(tracker); consent.acceptAll();
  consent.markInternalDevice();
  expect(consent.measurementMode).toBe('off');
  disposePinia(pinia); pinia = createPinia(); setActivePinia(pinia);
  expect(useConsentStore().measurementMode).toBe('off'); expect(localStorage.getItem('ut-internal-device')).toBe('1');
});

it('asks again after six months or a new consent version', () => {
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'future-provider');
  const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem('ut-consent', JSON.stringify({ version: CONSENT_VERSION, decidedAt: old, analytics: true, anonymous: true }));
  expect(useConsentStore().needsDecision).toBe(true);
  disposePinia(pinia); pinia = createPinia(); setActivePinia(pinia);
  localStorage.setItem('ut-consent', JSON.stringify({ version: CONSENT_VERSION + 1, decidedAt: new Date().toISOString(), analytics: true, anonymous: true }));
  expect(useConsentStore().analyticsAllowed).toBe(false);
});

it.each(LEGAL_PAGES)('publishes the %s page with a menu and visibly marked missing content', async page => {
  await mountWithRouter(LegalView, `/legal/${page}`);
  expect(view!.get('h2').text()).toBe(legalDocuments[page].title);
  expect(view!.get('[aria-current="page"]').text()).toBe(legalDocuments[page].title);
  expect(view!.findAll('nav a')).toHaveLength(LEGAL_PAGES.length + 1);
  expect(view!.findAll('nav a').at(-1)!.attributes('href')).toBe('/contact');
  for (const todo of view!.findAll('.legal-view__todo')) expect(todo.text()).toMatch(/^\[À compléter/);
});

it('publishes a contact page with prefilled mailto subjects and the legal menu', async () => {
  await mountWithRouter(ContactView, '/contact');
  expect(view!.get('[aria-current="page"]').text()).toBe('Contact');
  const mailtos = view!.findAll('a[href^="mailto:"]').map(link => decodeURIComponent(link.attributes('href')!));
  expect(mailtos[0]).toBe(`mailto:${CONTACT_EMAIL}`);
  expect(mailtos.slice(1).map(href => href.match(/subject=([^&]+)/)![1]))
    .toEqual(['[Universal Timeline] Question', '[Universal Timeline] Signalement', '[Universal Timeline] Données personnelles', '[Universal Timeline] Problème technique']);
  for (const page of LEGAL_PAGES) expect(legalDocuments[page].sections.flatMap(section => section.paragraphs).join(' ')).not.toContain('adresse e-mail de contact');
});

it('opens the cookie preferences from the cookie policy', async () => {
  const consent = useConsentStore();
  await mountWithRouter(LegalView, '/legal/cookies');
  await view!.findAll('button').find(button => button.text() === 'Gérer mes préférences')!.trigger('click');
  expect(consent.preferencesOpen).toBe(true);
});

it('replaces frise creation by a link to the profile until a username exists', async () => {
  await mountWithRouter(StoryGallery, '/database', { stories: [], totalStories: 0, categoryOptions: [], canCreate: false });
  expect(view!.text()).toContain('Choisissez un nom d’utilisateur');
  expect(view!.findAll('button').some(button => button.text().includes('Créer'))).toBe(false);
  expect(view!.findAll('a').find(link => link.text() === 'Choisir un nom d’utilisateur')?.attributes('href')).toBe('/profile');
});
