import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import HomeView from '@/views/HomeView.vue';
import Select from '@/components/base/Select.vue';
import { apiClient } from '@/services/ApiClient';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const tag = (id: string, position: number) => ({ id, label: { fr: id, en: id }, family: 'societes', position, parentId: null });
const row = (id: string, tags: ReturnType<typeof tag>[], importance = 'normal') => ({ id, wikidata_id: null, label_fr: id, label_en: id, date: 'M540', date_years_bp: 540000000, categories: [], tags, importance });
const conflits = tag('Conflits', 6); const arts = tag('Arts', 15);
const events = [...Array.from({ length: 12 }, (_, i) => row(`guerre-${i}`, [conflits])), ...Array.from({ length: 3 }, (_, i) => row(`art-${i}`, [arts])), row('art-majeur', [arts], 'major')];
const small = events.slice(0, 15);
const period = { id: 'earth', label_fr: 'Terre', start_date: 'G4.54', end_date: 'NOW', has_children: false };
let view: VueWrapper;
let router: Router;
const cards = () => view.findAll('.event-card .event-label').map(item => item.text());
const subject = () => view.findAllComponents(Select).find(select => select.classes('home-view__subject'));
const choose = async (label: string) => {
  const select = subject()!;
  select.vm.$emit('update:modelValue', (select.props('options') as { value: string; label: string }[]).find(option => option.label === label)!.value);
  await flushPromises();
};
beforeEach(async () => {
  vi.mocked(apiClient.get).mockImplementation(async path => {
    if (path === '/stories/1') return { id: 1, title_fr: 'Dense', childStories: [], tags: [], periods: [period], events };
    if (path === '/stories/2') return { id: 2, title_fr: 'Courte', childStories: [], tags: [], periods: [period], events: small };
    if (path === '/stories/3') return { id: 3, title_fr: 'Un sujet', childStories: [], tags: [], periods: [period], events: events.slice(0, 12) };
    if (path === '/stories') return [{ id: 1, title_fr: 'Dense', categories: [] }, { id: 2, title_fr: 'Courte', categories: [] }, { id: 3, title_fr: 'Un sujet', categories: [] }];
    if (path.startsWith('/stories/suggestions?')) return [];
    throw new Error(`Lecture inattendue : ${path}`);
  });
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/timeline', name: 'timeline', component: HomeView }, { path: '/database', name: 'database', component: { template: '<div />' } }] });
  await router.push('/timeline?story=1'); await router.isReady();
  view = mount(HomeView, { global: { plugins: [createPinia(), router] } });
  await flushPromises();
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.resetAllMocks(); });

it('opens on the essential events and keeps major ones', () => {
  expect(cards()).toHaveLength(13);
  expect(cards()).toContain('art-majeur');
  expect(cards()).not.toContain('art-0');
  expect((subject()!.props('options') as { label: string }[]).map(option => option.label)).toEqual(['L’essentiel', 'Tous les sujets', 'Conflits (12)', 'Arts (4)']);
});

it('shows a chosen subject alone, every subject, then the essential events again', async () => {
  await choose('Arts (4)');
  expect(cards().sort()).toEqual(['art-0', 'art-1', 'art-2', 'art-majeur']);
  await choose('Tous les sujets');
  expect(cards()).toHaveLength(16);
  await choose('L’essentiel');
  expect(cards()).toHaveLength(13);
});

it('opens a short frise on every subject, still lets one be isolated, and resets when the frise changes', async () => {
  await choose('Arts (4)');
  await router.push('/timeline?story=2'); await flushPromises();
  expect(cards()).toHaveLength(15);
  expect((subject()!.props('options') as { label: string }[]).map(option => option.label)).toEqual(['Tous les sujets', 'Conflits (12)', 'Arts (3)']);
  await choose('Arts (3)');
  expect(cards()).toHaveLength(3);
  await router.push('/timeline?story=1'); await flushPromises();
  expect(cards()).toHaveLength(13);
});

it('offers no select when the frise has a single subject', async () => {
  await router.push('/timeline?story=3'); await flushPromises();
  expect(subject()).toBeUndefined();
  expect(cards()).toHaveLength(12);
});
