import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount, DOMWrapper } from '@vue/test-utils';
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import StoryFilters from '@/views/DatabaseView/StoryFilters.vue';
import FilterValueList from '@/components/filters/FilterValueList.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { CategoryService } from '@/services/CategoryService';
import { useUiStore } from '@/stores/useUiStore';
import type { Period, Story, StorySummary } from '@/types/database';

const root: Period = { id: 'root', label: { fr: 'Période racine', en: '' }, startDate: '1945', endDate: '1991', categories: [], hasParent: false, children: [], temporalLocation: '' };
const summaries: StorySummary[] = [
  { id: '1', title: { fr: 'Guerre froide', en: 'Cold War' }, author: 'Auteur', categories: [], isPublic: true, previewPeriods: [root], previewEvents: [] },
  { id: '2', title: { fr: 'Histoire de France', en: '' }, author: 'Auteur', categories: [], isPublic: false, previewPeriods: [], previewEvents: [] },
];
const story = (id: string): Story => ({ ...summaries.find(s => s.id === id)!, periods: id === '1' ? [root] : [], events: [] });
const api = StoryApiService.getInstance();
const cards = () => view.findAll('.story-card__open').map(button => button.text());
const tabs = () => view.findAll('.story-tabs__open').map(button => button.text());
const button = (label: string) => view.findAll('button').find(item => item.text() === label || item.attributes('aria-label') === label)!;
let view: ReturnType<typeof mount>;
let router: ReturnType<typeof createRouter>;
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
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
it('opens on the frise cards and opens a frise in its own tab', async () => {
  await start();
  expect(cards()).toEqual(['Guerre froide', 'Histoire de France']);
  expect(view.findComponent(StoryDetailPanel).exists()).toBe(false);
  expect(view.find('.story-sidebar').exists()).toBe(false);
  expect(button('Toutes les frises').attributes('aria-current')).toBe('page');
  await view.get('.story-card__open').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('1');
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('1');
  expect(view.find('.story-gallery').exists()).toBe(false);
  expect(tabs()).toEqual(['Guerre froide']);
  expect(view.get('.story-tabs__open').attributes('aria-current')).toBe('page');
  expect(view.get('.story-detail-panel__meta-actions a').attributes('href')).toBe('/timeline?story=1&entry=universe');
  expect(view.findAll('.story-detail-panel__meta-actions > *').map(item => item.text())).toEqual(['Ajouter un événement', 'Voir dans la timeline']);
  expect(view.get('.story-detail-panel__meta-actions a').find('svg').exists()).toBe(false);
  expect(view.findAll('.story-detail-panel__tabs-bar button').map(item => item.text())).toEqual(['Aperçu', 'Périodes', 'Événements']);
  expect(view.text()).toContain('Paramètres de la frise');
  await button('Toutes les frises').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBeUndefined();
  expect(cards()).toHaveLength(2);
  expect(tabs()).toEqual(['Guerre froide']);
});
it('filters the cards by search and visibility, with removable filter chips', async () => {
  await start();
  await view.get('input[type="search"]').setValue('cold');
  expect(cards()).toEqual(['Guerre froide']);
  await view.get('input[type="search"]').setValue('');
  await button('Ajouter un filtre').trigger('click');
  await new DOMWrapper(document.body).findAll('[role="menuitem"]').find(item => item.text() === 'Visibilité')!.trigger('click');
  view.getComponent(StoryFilters).getComponent(FilterValueList).vm.$emit('update:modelValue', ['private']); await flushPromises();
  expect(cards()).toEqual(['Histoire de France']);
  expect(view.get('.filter-chip').text()).toBe('Frises privées');
  await button('Retirer le filtre Frises privées').trigger('click');
  expect(cards()).toHaveLength(2);
  expect(view.find('.filter-chip').exists()).toBe(false);
});
it.each(['cards', 'list'])('invites creation in an empty %s catalogue, including with a retained search', async mode => {
  localStorage.setItem('frises:view', mode);
  vi.mocked(api.getListStories).mockResolvedValue([]);
  await start();
  expect(view.get('.feedback-state').text()).toContain('Votre première frise commence ici');
  await view.get('input[type="search"]').setValue('Histoire');
  expect(view.get('.feedback-state').text()).toContain('Aucune frise pour le moment.');
  expect(view.get('.feedback-state').text()).not.toContain('ne correspond');
  await button('Créer ma première frise').trigger('click'); await flushPromises();
  expect(view.find('edit-modal-stub').exists()).toBe(true);
});
it('distinguishes an unsuccessful search from a catalogue with no frises', async () => {
  await start();
  await view.get('input[type="search"]').setValue('Introuvable');
  expect(view.get('.feedback-state').text()).toContain('Aucune frise ne correspond à votre recherche.');
  expect(view.get('.feedback-state').text()).not.toContain('Votre première frise');
  await view.get('input[type="search"]').setValue('');
  expect(cards()).toHaveLength(2);
  expect(view.find('.feedback-state').exists()).toBe(false);
});
it('filters the cards by tag from the filter panel and removes one tag from its chip', async () => {
  const tag = (id: string, fr: string) => ({ id, label: { fr, en: '' } });
  vi.mocked(api.getListStories).mockResolvedValue([
    { ...summaries[0], categories: [tag('war', 'Guerres'), tag('politics', 'Politique')] },
    { ...summaries[1], categories: [tag('politics', 'Politique')] },
  ]);
  await start();
  await button('Ajouter un filtre').trigger('click');
  await new DOMWrapper(document.body).findAll('[role="menuitem"]').find(item => item.text() === 'Tags')!.trigger('click');
  const tags = view.getComponent(StoryFilters).findAllComponents(FilterValueList).find(select => select.props('label') === 'Tags')!;
  expect(tags.props('options')).toEqual([{ value: 'war', label: 'Guerres' }, { value: 'politics', label: 'Politique' }]);
  tags.vm.$emit('update:modelValue', ['war']); await flushPromises();
  expect(cards()).toEqual(['Guerre froide']);
  expect(view.get('.filter-chip').text()).toBe('Guerres');
  tags.vm.$emit('update:modelValue', ['war', 'politics']); await flushPromises();
  expect(cards()).toHaveLength(2);
  await button('Retirer le filtre Politique').trigger('click');
  expect(cards()).toEqual(['Guerre froide']);
  await button('Retirer le filtre Guerres').trigger('click');
  expect(cards()).toHaveLength(2);
});
it('switches to the list without inventing missing record dates', async () => {
  vi.mocked(api.getListStories).mockResolvedValue([{ ...summaries[0], startDate: '1945-01-01', endDate: '1991-12-25', createdAt: new Date('2022-12-12T10:00:00Z') }, summaries[1]]);
  await start();
  await button('Afficher en liste').trigger('click');
  expect(button('Afficher en liste').attributes('aria-pressed')).toBe('true');
  const rows = view.findAll('.story-gallery__table .table-row');
  expect(rows).toHaveLength(2);
  expect(rows[0].findAll('[role="cell"]').slice(1).map(cell => cell.text())).toEqual(['1 janvier 1945 – 25 décembre 1991', '—', '12 décembre 2022']);
  expect(rows[1].findAll('[role="cell"]').slice(1).map(cell => cell.text())).toEqual(['Dates non déterminées', '—', '—']);
  await rows[1].get('.catalogue-label-button').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('2');
});
it('restores the selected frise from its URL and keeps every opened frise as a tab', async () => {
  await start('/database?story=1');
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('1');
  await router.push('/database?story=2'); await flushPromises();
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('2');
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  await view.findAll('.story-tabs__open')[0].trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('1');
  await router.push('/database'); await flushPromises();
  expect(view.findComponent(StoryDetailPanel).exists()).toBe(false);
  expect(cards()).toHaveLength(2);
});
it('closes tabs onto their neighbour, then back to the frise list', async () => {
  await start('/database?story=1');
  await router.push('/database?story=2'); await flushPromises();
  await button('Fermer Histoire de France').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('1');
  expect(tabs()).toEqual(['Guerre froide']);
  await button('Fermer Guerre froide').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBeUndefined();
  expect(tabs()).toEqual([]);
  expect(cards()).toHaveLength(2);
});
it('reorders frise tabs by dragging, preserves the active frise and restores their order', async () => {
  await start('/database?story=1');
  await router.push('/database?story=2'); await flushPromises();
  const transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  const items = view.findAll('.story-tabs__item');
  vi.spyOn(items[0].element, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 200 } as DOMRect);
  expect(view.get('.story-tabs__home').attributes('draggable')).toBeUndefined();
  expect(view.get('.story-tabs__scroll').find('.story-tabs__home').exists()).toBe(false);
  await items[1].get('.story-tabs__open').trigger('dragstart', { dataTransfer: transfer });
  await items[0].trigger('dragover', { clientX: 50, dataTransfer: transfer });
  expect(items[0].classes()).toContain('story-tabs__item--drop-before');
  await items[0].trigger('drop', { dataTransfer: transfer }); await flushPromises();
  expect(tabs()).toEqual(['Histoire de France', 'Guerre froide']);
  expect(router.currentRoute.value.query.story).toBe('2');
  expect(view.getComponent(StoryDetailPanel).props('story').id).toBe('2');
  expect(JSON.parse(sessionStorage.getItem('frises:open-tabs')!)).toEqual(['2', '1']);
  expect(view.find('.story-tabs__item--dragging').exists()).toBe(false);
  view.unmount(); router.options.history.destroy();
  await start('/database?story=2');
  expect(tabs()).toEqual(['Histoire de France', 'Guerre froide']);
  await button('Fermer Histoire de France').trigger('click'); await flushPromises();
  expect(router.currentRoute.value.query.story).toBe('1');
});
it('supports drops after a tab, cancels unfinished drags, and reorders with the keyboard', async () => {
  await start('/database?story=1');
  await router.push('/database?story=2'); await flushPromises();
  const items = view.findAll('.story-tabs__item');
  vi.spyOn(items[1].element, 'getBoundingClientRect').mockReturnValue({ left: 200, width: 200 } as DOMRect);
  await items[0].get('.story-tabs__open').trigger('dragstart');
  await items[1].trigger('dragover', { clientX: 350 });
  await items[0].get('.story-tabs__open').trigger('dragend');
  await items[1].trigger('drop');
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  await items[0].get('.story-tabs__open').trigger('dragstart');
  await items[1].trigger('dragover', { clientX: 350 });
  await items[1].trigger('drop'); await flushPromises();
  expect(tabs()).toEqual(['Histoire de France', 'Guerre froide']);
  await view.findAll('.story-tabs__open')[1].trigger('keydown', { key: 'ArrowLeft', altKey: true });
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  await view.findAll('.story-tabs__open')[0].trigger('keydown', { key: 'ArrowLeft', altKey: true });
  expect(tabs()).toEqual(['Guerre froide', 'Histoire de France']);
  expect(router.currentRoute.value.query.story).toBe('2');
});
it('keeps open tabs across a remount but drops frises that are no longer accessible', async () => {
  sessionStorage.setItem('frises:open-tabs', JSON.stringify(['2', 'gone']));
  await start();
  expect(tabs()).toEqual(['Histoire de France']);
  expect(JSON.parse(sessionStorage.getItem('frises:open-tabs')!)).toEqual(['2']);
});
it('reports an inaccessible linked frise while keeping the list available', async () => {
  await start('/database?story=999');
  expect(view.get('[role="alert"]').text()).toContain('introuvable ou inaccessible');
  expect(cards()).toHaveLength(2);
  expect(tabs()).toEqual([]);
  expect(api.getStory).not.toHaveBeenCalled();
});
it('lists at the root column a child frise whose anchor period is no longer in the frise', async () => {
  vi.mocked(api.getStory).mockImplementation(async id => ({ ...story(id), childStories: id === '1'
    ? [{ id: '2', title: { fr: 'Histoire de France', en: '' }, anchors: [{ type: 'period', id: 'period-not-in-frise' }] }] : [] }));
  await start('/database?story=1');
  await view.findAll('.story-detail-panel__tabs-bar button').find(item => item.text() === 'Périodes')!.trigger('click'); await flushPromises();
  const rootColumn = view.findAll('.finder-column')[0];
  expect(rootColumn.text()).toContain('Histoire de France');
});
it('filters the frise list by time overlap and clears it from the chip', async () => {
  vi.mocked(api.getListStories).mockResolvedValue([
    { ...summaries[0], startDate: '1945-01-01', endDate: '1991-12-25' },
    { ...summaries[1], startDate: '0476-01-01', endDate: '1789-01-01' },
  ]);
  await start();
  expect(cards()).toEqual(['Guerre froide', 'Histoire de France']);
  view.getComponent(StoryFilters).vm.$emit('update:timeRange', { oldBP: 87, recentBP: 81 }); await flushPromises();
  expect(cards()).toEqual(['Guerre froide']);
  expect(view.get('.filter-chip').text()).toMatch(/→/);
  await view.get('.filter-chip .ui-tag__remove').trigger('click');
  expect(cards()).toEqual(['Guerre froide', 'Histoire de France']);
  expect(view.find('.filter-chip').exists()).toBe(false);
});
it('saves the frise settings from the Aperçu tab and reloads the frise', async () => {
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  const update = vi.spyOn(api, 'updateStory').mockImplementation(async (id, data) => ({ ...summaries[0], title: data.title }));
  vi.mocked(api.getStory).mockImplementation(async id => ({ ...story(id), title: update.mock.calls.length ? { fr: 'Guerre froide renommée', en: 'Cold War' } : story(id).title }));
  await start('/database?story=1');
  expect(button('Enregistrer')).toBeUndefined();
  await view.get('.story-settings-form input[placeholder="Titre en français"]').setValue('Guerre froide renommée');
  expect(button('Enregistrer').exists()).toBe(true);
  await view.get('.story-settings-form form').trigger('submit'); await flushPromises();
  expect(update).toHaveBeenCalledWith('1', expect.objectContaining({ title: { fr: 'Guerre froide renommée', en: 'Cold War' }, author: 'Auteur' }));
  expect(view.get('.story-detail-panel__title').text()).toBe('Guerre froide renommée');
  expect(button('Enregistrer')).toBeUndefined();
});
it('changes the frise visibility from the danger zone after confirmation', async () => {
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  const update = vi.spyOn(api, 'updateStory').mockImplementation(async (id, data) => ({ ...summaries[0], isPublic: data.isPublic ?? true }));
  vi.mocked(api.getStory).mockImplementation(async id => ({ ...story(id), isPublic: !update.mock.calls.length }));
  await start('/database?story=1');
  expect(view.find('.story-detail-panel__meta-actions [aria-pressed]').exists()).toBe(false);
  const ui = useUiStore();
  await button('Rendre privée').trigger('click'); await flushPromises();
  expect(ui.confirmation?.title).toBe('Rendre la frise privée');
  ui.settleConfirmation(ui.confirmation!.id, false); await flushPromises();
  expect(update).not.toHaveBeenCalled();
  await button('Rendre privée').trigger('click'); await flushPromises();
  ui.settleConfirmation(ui.confirmation!.id, true); await flushPromises();
  expect(update).toHaveBeenCalledWith('1', expect.objectContaining({ isPublic: false, title: summaries[0].title, author: 'Auteur' }));
  expect(view.get('.story-danger-zone').text()).toContain('Visibilité : privée');
});

it('filters frises by a selected period independently from the date range', async () => {
  vi.mocked(api.getListStories).mockResolvedValue([
    { ...summaries[0], startDate: '1945-01-01', endDate: '1991-12-25' },
    { ...summaries[1], startDate: '0476-01-01', endDate: '1492-01-01' },
  ]);
  await start();
  const filters = view.getComponent(StoryFilters);
  filters.vm.$emit('update:period', { id: 'war', label: 'Guerre mondiale', range: { oldBP: 87, recentBP: 81 } }); await flushPromises();
  expect(cards()).toEqual(['Guerre froide']);
  filters.vm.$emit('update:timeRange', { oldBP: 1500, recentBP: 600 }); await flushPromises();
  expect(cards()).toEqual([]);
  filters.vm.$emit('update:period', null); await flushPromises();
  expect(cards()).toEqual(['Histoire de France']);
});
