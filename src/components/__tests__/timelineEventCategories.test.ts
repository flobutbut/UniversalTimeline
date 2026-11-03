import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import HomeView from '@/views/HomeView.vue';
import { apiClient } from '@/services/ApiClient';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const category = (id: string) => ({ id, label: { fr: id, en: id } });
const event = (id: string, label: string, categories: ReturnType<typeof category>[]) => ({
  id, wikidata_id: null, label_fr: label, label_en: label, date: 'M540', date_years_bp: 540000000, categories,
});
const events = [
  event('euk', 'Eukaryota', [category('micro'), category('bio')]),
  event('cambrian', 'Explosion cambrienne', [category('paleo'), category('bio')]),
  event('other', 'Autre événement', [category('geo')]),
  event('none', 'Sans catégorie', []),
];
let view: VueWrapper;
let router: Router;
const card = (label: string) => view.get(`button[aria-label="Afficher l’événement ${label}"]`);
const highlighted = () => view.findAll('.event-card.is-category-active .event-label').map(e => e.text());
async function select(label: string) { await card(label).trigger('click'); await flushPromises(); }
beforeEach(async () => {
  vi.mocked(apiClient.get).mockImplementation(async path => {
    if (path === '/stories/1') return { id: 1, title_fr: 'Univers', childStories: [], periods: [{ id: 'earth', label_fr: 'Terre', start_date: 'G4.54', end_date: 'NOW', has_children: false }], events };
    if (path === '/stories') return [{ id: 1, title_fr: 'Univers', categories: [] }];
    if (path === '/stories/1/periods') return [{ id: 'earth', label_fr: 'Terre', start_date: 'G4.54', end_date: 'NOW', has_children: false }];
    if (path === '/stories/1/events') return events;
    if (path.startsWith('/stories/suggestions?')) return [];
    throw new Error(`Lecture inattendue : ${path}`);
  });
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/timeline', name: 'timeline', component: HomeView },
    { path: '/database', name: 'database', component: { template: '<div />' } },
  ] });
  await router.push('/timeline'); await router.isReady();
  view = mount(HomeView, { global: { plugins: [createPinia(), router] } });
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.resetAllMocks(); });

it('highlights events sharing any category, including a non-first category, from a fresh timeline load', async () => {
  await flushPromises();
  expect(highlighted()).toEqual([]);
  await select('Eukaryota');
  expect(highlighted()).toEqual(['Explosion cambrienne']);
  expect(card('Eukaryota').attributes('aria-pressed')).toBe('true');
  expect(card('Explosion cambrienne').attributes('aria-pressed')).toBe('false');
  await select('Explosion cambrienne');
  expect(highlighted()).toEqual(['Eukaryota']);
  await select('Explosion cambrienne');
  expect(highlighted()).toEqual([]);
});

it('does not highlight unrelated or uncategorized events and clears an old category highlight on selection change', async () => {
  await flushPromises(); await select('Eukaryota');
  expect(highlighted()).toEqual(['Explosion cambrienne']);
  await select('Autre événement'); expect(highlighted()).toEqual([]);
  await select('Sans catégorie'); expect(highlighted()).toEqual([]);
});
