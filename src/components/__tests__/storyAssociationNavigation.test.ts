import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import FilterBar from '@/components/FilterBar.vue';
import Switch from '@/components/base/Switch.vue';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import type { Period, Story } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const category = { id: 'geo', label: { fr: 'Géologie', en: '' } };
const period = (id: string, parentId: string | null = null): Period => ({ id, parentId, hasParent: !!parentId, hasChildren: id !== 'leaf', children: [], label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', categories: [category], temporalLocation: '' });
const root = period('root'); const branch = period('branch', 'root'); const leaf = period('leaf', 'branch');
const detail = (added = false): Story => ({ id: '1', title: { fr: 'Ma frise', en: '' }, author: '', isPublic: false, categories: [], periods: added ? [root, leaf] : [root], events: [] });
const api = StoryApiService.getInstance();
let pinia: Pinia;
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
const panel = () => view.getComponent(StoryDetailPanel);
const row = (id: string) => panel().findAllComponents(FinderItem).find(item => item.props('itemId') === id)!;
const selected = () => panel().findAllComponents(FinderItem).filter(item => item.props('selected')).map(item => item.props('itemId'));
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  pinia = createPinia(); setActivePinia(pinia);
  vi.spyOn(api, 'getListStories').mockResolvedValue([detail()]);
  vi.spyOn(api, 'getStory').mockResolvedValue(detail());
  vi.spyOn(api, 'changeAssociations').mockResolvedValue(undefined);
  vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockResolvedValue([root]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockImplementation(async id => id === 'root' ? [branch] : id === 'branch' ? [leaf] : []);
  vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); disposePinia(pinia); document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function start() {
  view = mount(DatabaseView, { attachTo: document.body, global: { plugins: [pinia], stubs: { StoryTimeline: true, EditModal: true } } });
  await flushPromises();
  await view.get('.story-card__open').trigger('click'); await flushPromises();
  await panel().getComponent(Switch).get('button').trigger('click'); await flushPromises();
  for (const id of ['root', 'branch', 'leaf']) {
    await row(id).get('.finder-item-content').trigger('click'); await flushPromises();
  }
  panel().getComponent(FilterBar).vm.$emit('update:categoryId', 'geo'); await flushPromises();
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(4);
}
it('keeps the tree, DOM, filters and scroll positions during the write and detail refresh', async () => {
  const writing = deferred<void>(); const refreshing = deferred<Story>();
  vi.mocked(api.changeAssociations).mockReturnValueOnce(writing.promise);
  vi.mocked(api.getStory).mockResolvedValueOnce(detail()).mockReturnValueOnce(refreshing.promise);
  await start();
  const tree = panel().get('.story-detail-panel__finder-columns-wrap').element as HTMLElement;
  const column = panel().findAll('.finder-column-content')[1].element as HTMLElement;
  const selectedRow = row('leaf').element;
  tree.scrollLeft = 220; column.scrollTop = 90;
  const add = row('leaf').get('button[aria-label="Ajouter à la frise"]');
  await add.trigger('click'); await flushPromises();
  expect(panel().attributes('aria-busy')).toBe('true');
  expect(add.attributes('disabled')).toBeDefined();
  await add.trigger('click'); expect(api.changeAssociations).toHaveBeenCalledExactlyOnceWith('1', 'period', ['leaf'], false, 'branch');
  expect(panel().get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(selected()).toEqual(['leaf']);
  writing.resolve(); await flushPromises();
  expect(api.getStory).toHaveBeenCalledTimes(2);
  expect(panel().find('.story-detail-panel__loading').exists()).toBe(false);
  expect(row('leaf').element).toBe(selectedRow);
  refreshing.resolve(detail(true)); await flushPromises();
  expect(panel().attributes('aria-busy')).toBeUndefined();
  expect(panel().getComponent(Switch).props('modelValue')).toBe(true);
  expect(panel().getComponent(FilterBar).props('categoryId')).toBe('geo');
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(4);
  expect(panel().findAllComponents(FinderItem).filter(item => item.props('itemId') === 'leaf')).toHaveLength(1);
  expect(row('leaf').element).toBe(selectedRow);
  expect(row('leaf').get('button[aria-haspopup="menu"]').exists()).toBe(true);
  expect(add.element.isConnected).toBe(false);
  expect(panel().get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(tree.scrollLeft).toBe(220); expect(column.scrollTop).toBe(90);
  // The associated leaf must still open at its full catalogue path on another click.
  await row('leaf').get('.finder-item-content').trigger('click'); await flushPromises();
  expect(panel().findAll('.finder-column')).toHaveLength(4);
  // Toggling additional periods keeps the frise boundary instead of restoring global ancestry.
  await panel().getComponent(Switch).get('button').trigger('click'); await flushPromises();
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(2);
  await panel().getComponent(Switch).get('button').trigger('click'); await flushPromises();
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(2);
  expect(panel().findAllComponents(FinderItem).filter(item => item.props('itemId') === 'leaf')).toHaveLength(1);
});
it('keeps the tree available after a refused write instead of replacing it with an error page', async () => {
  vi.mocked(api.changeAssociations).mockRejectedValueOnce({ response: { data: { error: 'Ajout refusé' } } });
  await start();
  const tree = panel().get('.story-detail-panel__finder-columns-wrap').element;
  await row('leaf').get('.finder-item-add').trigger('click'); await flushPromises();
  expect(panel().get('[role="alert"]').text()).toContain('Ajout refusé');
  expect(panel().get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(4);
  expect(row('leaf').get('.finder-item-add').attributes('disabled')).toBeUndefined();
  expect(api.getStory).toHaveBeenCalledOnce();
});
it('retries a failed refresh without repeating the saved write or resetting the tree', async () => {
  vi.mocked(api.getStory).mockResolvedValueOnce(detail()).mockRejectedValueOnce(new Error('Lecture indisponible')).mockResolvedValueOnce(detail(true));
  await start();
  const tree = panel().get('.story-detail-panel__finder-columns-wrap').element;
  await row('leaf').get('.finder-item-add').trigger('click'); await flushPromises();
  expect(panel().get('[role="alert"]').text()).toContain('Associations enregistrées');
  expect(panel().get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(selected()).toEqual(['leaf']);
  await panel().get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(panel().find('[role="alert"]').exists()).toBe(false);
  expect(selected()).toEqual(['leaf']);
  expect(panel().findAll('.finder-column')).toHaveLength(4);
  expect(panel().get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(row('leaf').find('button[aria-haspopup="menu"]').exists()).toBe(true);
  expect(api.changeAssociations).toHaveBeenCalledOnce();
});

it('edits a period from its menu and refreshes the current frise after saving', async () => {
  const periods = PeriodApiService.getInstance();
  const full = { ...root, wikidata_id: 'Q100', description: { fr: 'Description complète', en: '' } };
  const edited = { ...full, label: { fr: 'Racine modifiée', en: '' } };
  vi.spyOn(periods, 'getPeriod').mockResolvedValue(full);
  vi.spyOn(periods, 'getPeriodByWikidataId').mockResolvedValue(full);
  vi.spyOn(periods, 'updatePeriod').mockResolvedValue(edited);
  vi.mocked(api.getStory).mockResolvedValueOnce(detail()).mockResolvedValueOnce({ ...detail(), periods: [edited] });
  await start();
  await row('root').get('button[aria-haspopup="menu"]').trigger('click');
  (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click(); await flushPromises();
  expect(periods.getPeriod).toHaveBeenCalledExactlyOnceWith('root');
  expect(selected()).toEqual(['leaf']);
  const editor = view.getComponent({ name: 'EditModal' });
  expect(editor.props()).toMatchObject({ type: 'period', mode: 'edit', data: { id: 'root', description: full.description } });
  editor.vm.$emit('submit', { qid: 'Q100', title: edited.label, description: full.description, startDate: 'M65', endDate: 'NOW', date: '', location: 'Globale', parentId: null, categories: [], author: '', isPublic: false });
  await flushPromises();
  expect(periods.updatePeriod).toHaveBeenCalledOnce();
  expect(api.getStory).toHaveBeenCalledTimes(2);
  expect(view.findComponent({ name: 'EditModal' }).exists()).toBe(false);
  expect(row('root').text()).toContain('Racine modifiée');
});

it('removes the period from the frise through its menu without deleting the catalogue entity', async () => {
  const destroy = vi.spyOn(PeriodApiService.getInstance(), 'deletePeriod');
  vi.mocked(api.getStory).mockResolvedValueOnce(detail()).mockResolvedValueOnce({ ...detail(), periods: [] });
  await start();
  await row('root').get('button[aria-haspopup="menu"]').trigger('click');
  [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(item => item.textContent?.trim() === 'Supprimer')!.click(); await flushPromises();
  expect(api.changeAssociations).toHaveBeenCalledExactlyOnceWith('1', 'period', ['root'], true);
  expect(destroy).not.toHaveBeenCalled();
  expect(panel().findAllComponents(FinderItem).some(item => item.props('itemId') === 'root')).toBe(false);
});

it('does not open an outdated period editor after switching frises during its read', async () => {
  const reading = deferred<Period>();
  vi.spyOn(PeriodApiService.getInstance(), 'getPeriod').mockReturnValue(reading.promise);
  const other = { ...detail(), id: '2', title: { fr: 'Autre frise', en: '' }, periods: [] };
  vi.mocked(api.getListStories).mockResolvedValue([detail(), other]);
  vi.mocked(api.getStory).mockImplementation(async id => id === '1' ? detail() : other);
  await start();
  await row('root').get('button[aria-haspopup="menu"]').trigger('click');
  (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click(); await flushPromises();
  await view.get('button[aria-label="Toutes les frises"]').trigger('click'); await flushPromises();
  await view.findAll('.story-card__open')[1].trigger('click'); await flushPromises();
  reading.resolve(root); await flushPromises();
  expect(panel().props('story')?.id).toBe('2');
  expect(view.findComponent({ name: 'EditModal' }).exists()).toBe(false);
});

it('edits a frise event with the shared menu and refreshes its displayed metadata after saving', async () => {
  const events = EventApiService.getInstance();
  const full = { id: 'ev', wikidata_id: 'Q43653', label: { fr: 'Apollo 11', en: '' }, description: { fr: 'Mission lunaire', en: '' }, date: '1969-07-21', categories: [] };
  const edited = { ...full, label: { fr: 'Premiers pas sur la Lune', en: '' } };
  vi.mocked(events.getListEvents).mockResolvedValue([full]);
  vi.spyOn(events, 'getEventById').mockResolvedValue(full);
  vi.spyOn(events, 'updateEvent').mockResolvedValue(edited);
  vi.mocked(api.getStory).mockResolvedValueOnce({ ...detail(), events: [full] }).mockResolvedValueOnce({ ...detail(), events: [edited] });
  await start(); await panel().findAll('button').find(button => button.text() === 'Événements')!.trigger('click'); await flushPromises();
  await row('ev').get('.finder-item-content').trigger('click'); await flushPromises();
  await row('ev').get('button[aria-haspopup="menu"]').trigger('click');
  expect(selected()).toEqual(['ev']);
  (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click(); await flushPromises();
  const editor = view.getComponent({ name: 'EditModal' });
  expect(editor.props()).toMatchObject({ type: 'event', mode: 'edit', data: { id: 'ev', wikidata_id: 'Q43653', description: full.description } });
  editor.vm.$emit('submit', { qid: 'Q43653', title: edited.label, description: full.description, date: full.date, startDate: '', endDate: '', location: '', parentId: null, categories: [], author: '', isPublic: false });
  await flushPromises();
  expect(events.updateEvent).toHaveBeenCalledOnce(); expect(api.getStory).toHaveBeenCalledTimes(2);
  expect(view.findComponent({ name: 'EditModal' }).exists()).toBe(false);
  expect(row('ev').text()).toContain('Premiers pas sur la Lune'); expect(selected()).toEqual(['ev']);
});

it('removes an event through its menu from this frise without deleting its catalogue entity', async () => {
  const full = { id: 'ev', label: { fr: 'Apollo 11', en: '' }, date: '1969-07-21', categories: [] };
  const destroy = vi.spyOn(EventApiService.getInstance(), 'deleteEvent');
  vi.mocked(api.getStory).mockResolvedValueOnce({ ...detail(), events: [full] }).mockResolvedValueOnce(detail());
  await start(); await panel().findAll('button').find(button => button.text() === 'Événements')!.trigger('click'); await flushPromises();
  await row('ev').get('button[aria-haspopup="menu"]').trigger('click');
  (document.querySelectorAll('[role="menuitem"]')[1] as HTMLButtonElement).click(); await flushPromises();
  expect(api.changeAssociations).toHaveBeenCalledExactlyOnceWith('1', 'event', ['ev'], true);
  expect(destroy).not.toHaveBeenCalled();
  expect(panel().findAllComponents(FinderItem).some(item => item.props('itemId') === 'ev')).toBe(false);
});
