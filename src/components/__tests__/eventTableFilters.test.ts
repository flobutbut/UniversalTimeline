import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import EventsView from '@/views/EventsView/EventsView.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import { EventApiService } from '@/services/EventApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
let view: ReturnType<typeof mount>;
const ids = () => view.findAll('.table-row').map(row => row.attributes('data-item-id'));
beforeEach(() => {
  setActivePinia(createPinia());
  const category = { id: 'geo', label: { fr: 'Géologie', en: '' }, family: 'societes', position: 1, parentId: null };
  vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockResolvedValue([
    { id: 'inside', label: { fr: 'Inclus', en: '' }, date: 'M20', categories: [], tags: [category] },
    { id: 'outside', label: { fr: 'Ancien', en: '' }, date: 'M80', categories: [], tags: [category] },
    { id: 'untagged', label: { fr: 'Sans catégorie', en: '' }, date: 'M20', categories: [] },
    { id: 'unknown', label: { fr: 'Sans date', en: '' }, date: '', categories: [], tags: [category] },
  ]);
  vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getMemberships').mockResolvedValue(new Map([
    ['inside', ['life']], ['outside', ['other']], ['unknown', ['life']], ['untagged', ['life']],
  ]));
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('combines category, frise and temporal filters and restores unknown dates when time is cleared', async () => {
  view = mount(EventsView); await flushPromises();
  const filters = view.getComponent(CatalogueFilters);
  filters.vm.$emit('update:timeRange', { oldBP: 50e6, recentBP: 10e6 }); await flushPromises();
  expect(ids()).toEqual(['inside', 'untagged']);
  filters.vm.$emit('update:tags', ['geo']); filters.vm.$emit('update:storyIds', ['life']); await flushPromises();
  expect(ids()).toEqual(['inside']);
  filters.vm.$emit('update:timeRange', null); await flushPromises();
  expect(ids()).toEqual(['inside', 'unknown']);
  filters.vm.$emit('update:tags', []); filters.vm.$emit('update:storyIds', []); await flushPromises();
  expect(ids()).toEqual(['inside', 'outside', 'untagged', 'unknown']);
});

it('applies period and date filters independently and combines their ranges', async () => {
  view = mount(EventsView); await flushPromises();
  const filters = view.getComponent(CatalogueFilters);
  filters.vm.$emit('update:period', { id: 'old', label: 'Ancienne', range: { oldBP: 90e6, recentBP: 70e6 } }); await flushPromises();
  expect(ids()).toEqual(['outside']);
  filters.vm.$emit('update:timeRange', { oldBP: 50e6, recentBP: 10e6 }); await flushPromises();
  expect(ids()).toEqual([]);
  filters.vm.$emit('update:period', null); await flushPromises();
  expect(ids()).toEqual(['inside', 'untagged']);
  filters.vm.$emit('update:timeRange', null); await flushPromises();
  expect(ids()).toEqual(['inside', 'outside', 'untagged', 'unknown']);
});

it('sorts the frise column alphabetically and keeps sorting when filters change', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: 'life', title: { fr: 'Zeta', en: '' }, categories: [], author: '', isPublic: true },
    { id: 'other', title: { fr: 'Alpha', en: '' }, categories: [], author: '', isPublic: true },
  ]);
  view = mount(EventsView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } }); await flushPromises();
  const sort = view.get('button[aria-label="Trier par frises"]');
  await sort.trigger('click'); expect(ids()).toEqual(['outside', 'inside', 'untagged', 'unknown']);
  await sort.trigger('click'); expect(ids()).toEqual(['inside', 'untagged', 'unknown', 'outside']);
  expect(sort.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('descending');
  view.getComponent(CatalogueFilters).vm.$emit('update:tags', ['geo']); await flushPromises();
  expect(ids()).toEqual(['inside', 'unknown', 'outside']);
});
