import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import StoryFilters from '@/views/DatabaseView/StoryFilters.vue';
import Select from '@/components/base/Select.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import type { Period, Story, StorySummary } from '@/types/database';

const root: Period = { id: 'root', label: { fr: 'Période racine', en: '' }, startDate: '1945', endDate: '1991', categories: [], hasParent: false, children: [], temporalLocation: '' };
const summaries: StorySummary[] = [
  { id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, author: 'Auteur', categories: [], isPublic: true, previewPeriods: [root], previewEvents: [] },
  { id: '2', title: { fr: 'Histoire de France', en: '' }, author: 'Auteur', categories: [], isPublic: false, previewPeriods: [], previewEvents: [] },
];
const story = (id: string): Story => ({ ...summaries.find(s => s.id === id)!, periods: id === '1' ? [root] : [], events: [] });
const api = StoryApiService.getInstance();
let view: ReturnType<typeof mount>;
let router: ReturnType<typeof createRouter>;
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(api, 'getListStories').mockResolvedValue(summaries);
  vi.spyOn(api, 'getStory').mockImplementation(async id => story(id));
  vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([root]);
  vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); });
async function start(path = '/database') {
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/database', name: 'database', component: DatabaseView }] });
  await router.push(path); await router.isReady();
  view = mount(RouterView, { global: { plugins: [router], stubs: { StoryTimeline: true, EditModal: true } } });
  await flushPromises();
}
it('opens directly in columns with the gallery disabled and selects a story from the sidebar', async () => {
  await start();
  expect(view.find('.story-gallery').exists()).toBe(false);
  expect(view.findAll('.story-card')).toHaveLength(0);
  expect(view.find('.database-columns-layout').exists()).toBe(true);
  expect(view.getComponent(StoryDetailPanel).props('story')).toBeNull();
  await view.get('.database-story-tabs-wrap button').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('1');
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('1');
  expect(view.findAll('.story-detail-panel__meta-actions button').some(button => button.text() === 'Settings')).toBe(false);
  expect(view.get('.story-detail-panel__meta-actions a').text()).toBe('Voir dans la timeline');
  expect(view.get('.story-detail-panel__meta-actions a').attributes('href')).toBe('/timeline?story=1');
  const settings = view.findAll('.story-detail-panel__tabs-bar button').find(button => button.text() === 'Settings')!;
  await settings.trigger('click');
  expect(view.text()).toContain('Paramètres de la frise');
});
it('filters the sidebar by search and visibility without changing the stored list', async () => {
  await start();
  const rows = () => view.findAll('.database-story-tabs-wrap button');
  await view.get('input[type="search"]').setValue('cold');
  expect(rows()).toHaveLength(1);
  await view.get('input[type="search"]').setValue('');
  await view.get('button[aria-label="Filtrer les frises"]').trigger('click');
  const visibility = view.getComponent(StoryFilters).getComponent(Select);
  visibility.vm.$emit('update:modelValue', 'private'); await flushPromises();
  expect(rows()).toHaveLength(1);
  expect(rows()[0].text()).toContain('Histoire de France');
  visibility.vm.$emit('update:modelValue', 'all'); await flushPromises();
  expect(rows()).toHaveLength(2);
});
it('restores the selected story from its URL and follows another story link', async () => {
  await start('/database?story=1');
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('1');
  await router.push('/database?story=2'); await flushPromises();
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('2');
  await router.push('/database'); await flushPromises();
  expect(view.getComponent(StoryDetailPanel).props('story')).toBeNull();
  expect(view.find('.database-columns-layout').exists()).toBe(true);
});
it('reports an inaccessible linked story while keeping the sidebar available', async () => {
  await start('/database?story=999');
  expect(view.get('[role="alert"]').text()).toContain('introuvable ou inaccessible');
  expect(view.findAll('.database-story-tabs-wrap button')).toHaveLength(2);
  expect(api.getStory).not.toHaveBeenCalled();
});
it('lists at the root column a child frise whose anchor period is no longer in the frise', async () => {
  vi.mocked(api.getStory).mockImplementation(async id => ({ ...story(id), childStories: id === '1'
    ? [{ id: '2', title: { fr: 'Histoire de France', en: '' }, anchors: [{ type: 'period', id: 'period-not-in-frise' }] }] : [] }));
  await start('/database?story=1');
  const rootColumn = view.findAll('.finder-column')[0];
  expect(rootColumn.text()).toContain('Histoire de France');
});
it('filters the frise list by time overlap and clears it from the chip', async () => {
  vi.mocked(api.getListStories).mockResolvedValue([
    { ...summaries[0], startDate: '1945-01-01', endDate: '1991-12-25' },
    { ...summaries[1], startDate: '0476-01-01', endDate: '1789-01-01' },
  ]);
  await start();
  const tabs = () => view.findAll('.database-story-tabs-wrap button').map(button => button.text().replace(/de \d.*$/, ''));
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  view.findAllComponents(StoryFilters).at(-1)!.vm.$emit('update:timeRange', { oldBP: 87, recentBP: 81 }); await flushPromises();
  expect(tabs()).toEqual(['Guerre froide']);
  expect(view.get('.story-sidebar__time-chip').text()).toMatch(/→/);
  await view.get('.story-sidebar__time-chip button').trigger('click');
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  expect(view.find('.story-sidebar__time-chip').exists()).toBe(false);
});
