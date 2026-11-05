import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import PeriodsView from '@/views/GraphView/Periods.vue';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import type { Period } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const period = (id: string, startDate: string, endDate: string): Period => ({
  id, label: { fr: id, en: '' }, startDate, endDate, categories: [],
  children: [], hasParent: false, temporalLocation: '',
});
let view: ReturnType<typeof mount>;
const ids = () => view.findAll('.table-row').map(row => row.attributes('data-item-id'));
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([
    period('Ancienne', 'M65', 'M10'), period('Récente', 'M8', 'NOW'), period('Inconnue', '', ''),
  ]);
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getMemberships').mockResolvedValue(new Map());
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('uses the shared table and sorts each period boundary chronologically with unknown dates last', async () => {
  view = mount(PeriodsView); await flushPromises();
  expect(view.findComponent(CatalogueTable).exists()).toBe(true);
  expect(view.findAll('[role="columnheader"]').map(header => header.text().replace('▲', '').trim()))
    .toEqual(['', 'Nom', 'Début', 'Fin', 'Catégories', 'Frises', 'Modifié', 'Actions']);
  for (const boundary of ['début', 'fin']) {
    const sort = view.get(`button[aria-label="Trier par ${boundary}"]`);
    await sort.trigger('click'); expect(ids()).toEqual(['Ancienne', 'Récente', 'Inconnue']);
    await sort.trigger('click'); expect(ids()).toEqual(['Récente', 'Ancienne', 'Inconnue']);
  }
  expect(view.get('.table-row[data-item-id="Inconnue"] .col-date').text()).toBe('—');
});

it('filters table rows by category and keeps the date columns keyboard resizable', async () => {
  vi.mocked(PeriodApiService.getInstance().getListPeriods).mockResolvedValue([
    { ...period('Géologie', 'M65', 'NOW'), categories: [{ id: 'geo', label: { fr: 'Géologie', en: '' } }] },
    period('Autre', 'M8', 'NOW'),
  ]);
  view = mount(PeriodsView); await flushPromises();
  view.getComponent(CatalogueFilters).vm.$emit('update:categories', ['geo']); await flushPromises();
  expect(ids()).toEqual(['Géologie']);
  const handle = view.get('[role="separator"][aria-label="Largeur de la colonne Fin"]');
  await handle.trigger('keydown', { key: 'ArrowRight' }); expect(handle.attributes('aria-valuenow')).toBe('170');
  await handle.trigger('keydown', { key: 'End' }); expect(handle.attributes('aria-valuenow')).toBe('280');
  view.getComponent(CatalogueFilters).vm.$emit('update:categories', ['missing']); await flushPromises();
  expect(view.get('[role="table"]').text()).toContain('Aucune période trouvée');
});

it('sorts by associated frise titles instead of their IDs, in both directions', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: 'z', title: { fr: 'Alpha', en: '' }, categories: [], author: '', isPublic: true },
    { id: 'a', title: { fr: 'Zeta', en: '' }, categories: [], author: '', isPublic: true },
  ]);
  vi.mocked(StoryApiService.getInstance().getMemberships).mockResolvedValue(new Map([
    ['Ancienne', ['a']], ['Récente', ['z']],
  ]));
  view = mount(PeriodsView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } }); await flushPromises();
  const sort = view.get('button[aria-label="Trier par frises"]');
  await sort.trigger('click'); expect(ids()).toEqual(['Inconnue', 'Récente', 'Ancienne']);
  expect(sort.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('ascending');
  await sort.trigger('click'); expect(ids()).toEqual(['Ancienne', 'Récente', 'Inconnue']);
});

it('loads period memberships on arrival and distinguishes their failure from no associated frise', async () => {
  vi.mocked(StoryApiService.getInstance().getMemberships).mockRejectedValueOnce(new Error('Frises hors ligne')).mockResolvedValueOnce(new Map());
  view = mount(PeriodsView); await flushPromises();
  expect(StoryApiService.getInstance().getMemberships).toHaveBeenCalledWith('period', expect.anything());
  expect(view.get('.links-error').text()).toContain('Frises hors ligne');
  expect(view.get('.table-row .col-stories').text()).toBe('—');
  await view.get('.links-error button').trigger('click'); await flushPromises();
  expect(view.find('.links-error').exists()).toBe(false);
  expect(view.get('.table-row .col-stories').text()).toBe('Aucune');
});

it('combines the frise filter with category and text filters and resets to the whole catalogue', async () => {
  const category = { id: 'geo', label: { fr: 'Géologie', en: '' } };
  vi.mocked(PeriodApiService.getInstance().getListPeriods).mockResolvedValue([
    { ...period('Cambrien', 'M538', 'M486'), categories: [category] },
    { ...period('Jurassique', 'M201', 'M145'), categories: [category] },
    period('Antiquité', '-3200', '476'),
  ]);
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: 'life', title: { fr: 'Histoire de la vie', en: '' }, categories: [], author: '', isPublic: true },
    { id: 'other', title: { fr: 'Autre frise', en: '' }, categories: [], author: '', isPublic: true },
  ]);
  vi.mocked(StoryApiService.getInstance().getMemberships).mockResolvedValue(new Map([
    ['Cambrien', ['life', 'other']], ['Antiquité', ['life']], ['Jurassique', ['other']],
  ]));
  view = mount(PeriodsView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } }); await flushPromises();
  const filters = view.getComponent(CatalogueFilters);
  expect(filters.props('context')).toBe('periods');
  filters.vm.$emit('update:storyIds', ['life']); await flushPromises();
  expect(ids()).toEqual(['Antiquité', 'Cambrien']);
  expect(view.get('.table-row[data-item-id="Cambrien"] .col-stories').text()).toContain('Histoire de la vie');
  filters.vm.$emit('update:categories', ['geo']); await flushPromises();
  expect(ids()).toEqual(['Cambrien']);
  await view.get('input[placeholder="Rechercher une période…"]').setValue('Jurassique');
  expect(ids()).toEqual([]);
  await view.get('input[placeholder="Rechercher une période…"]').setValue('');
  filters.vm.$emit('update:storyIds', []); filters.vm.$emit('update:categories', []); await flushPromises();
  expect(ids()).toEqual(['Antiquité', 'Cambrien', 'Jurassique']);
});

it('keeps periods that overlap the selected time range and excludes unknown dates', async () => {
  view = mount(PeriodsView); await flushPromises();
  const filters = view.getComponent(CatalogueFilters);
  filters.vm.$emit('update:timeRange', { oldBP: 20e6, recentBP: 9e6 }); await flushPromises();
  expect(ids()).toEqual(['Ancienne']);
  filters.vm.$emit('update:timeRange', { oldBP: 7e6, recentBP: 0 }); await flushPromises();
  expect(ids()).toEqual(['Récente']);
  filters.vm.$emit('update:timeRange', null); await flushPromises();
  expect(ids()).toEqual(['Ancienne', 'Inconnue', 'Récente']);
});
