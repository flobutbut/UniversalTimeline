import { useUiStore } from '@/stores/useUiStore';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import EventsView from '@/views/EventsView/EventsView.vue';
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue';
import PeriodsView from '@/views/GraphView/Periods.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import Select from '@/components/base/Select.vue';
import EventPickerModal from '@/views/DatabaseView/EventPickerModal.vue';
import PeriodPickerModal from '@/views/DatabaseView/PeriodPickerModal.vue';
import { CategoryService } from '@/services/CategoryService';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { apiClient } from '@/services/ApiClient';
import { useDataStore } from '@/stores/useDataStore';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() } }));
let view: ReturnType<typeof mount>;
const button = (label: string) => view.findAll('button').find(b => b.text() === label)!;
const event = { id: 'e', wikidata_id: 'Q123', label_fr: 'Événement', date: 'M65', categories: [] };
beforeEach(() => {
  vi.resetAllMocks(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).hide);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(CategoryService.getInstance(), 'getCategories').mockResolvedValue([]);
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/events') return [event] as any;
    if (url === '/periods' || url === '/stories' || url === '/events/story-links') return [] as any;
    throw new Error(`Unexpected read ${url}`);
  });
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });

it('exposes a structured event table and sorting buttons with an announced direction', async () => {
  vi.mocked(apiClient.get).mockImplementation(async url => url === '/events' ? [
    { ...event, id: 'old', label_fr: 'Zulu', date: 'M65' },
    { ...event, id: 'young', label_fr: 'Alpha', date: 'M8' },
  ] as any : [] as any);
  view = mount(EventsView); await flushPromises();
  expect(view.get('[role="table"]').attributes('aria-label')).toBe('Événements');
  expect(view.findAll('[role="columnheader"]').map(header => header.text())).toContain('Frises');
  expect(view.findAll('[role="columnheader"]')).toHaveLength(6);
  const sort = view.get('button[aria-label="Trier par nom"]');
  await sort.trigger('click');
  expect(sort.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('ascending');
  expect(view.findAll('.table-row')[0].get('[role="cell"]').text()).toBe('Alpha');
  await sort.trigger('click');
  expect(sort.element.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('descending');
  expect(view.findAll('.table-row')[0].get('[role="cell"]').text()).toBe('Zulu');
  expect(view.findAll('.col-actions button')[0].attributes('aria-label')).toBe('Modifier Zulu');
});

it('allows bounded keyboard column resizing without sending any mutation', async () => {
  view = mount(EventsView); await flushPromises();
  const handle = view.get('[role="separator"][aria-label="Largeur de la colonne Nom"]');
  await handle.trigger('keydown', { key: 'ArrowRight' }); expect(handle.attributes('aria-valuenow')).toBe('370');
  await handle.trigger('keydown', { key: 'Home' }); expect(handle.attributes('aria-valuenow')).toBe(handle.attributes('aria-valuemin'));
  await handle.trigger('keydown', { key: 'ArrowLeft' }); expect(handle.attributes('aria-valuenow')).toBe(handle.attributes('aria-valuemin'));
  await handle.trigger('keydown', { key: 'End' }); expect(handle.attributes('aria-valuenow')).toBe(handle.attributes('aria-valuemax'));
  expect(view.get('.table-wrap').attributes('tabindex')).toBe('0');
  expect(apiClient.put).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
});

it('keeps an event draft and its error visible after a failed save, and closes only after a successful retry', async () => {
  vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { error: 'Sauvegarde refusée' } } }).mockResolvedValueOnce({ ...event, label_fr: 'Brouillon conservé' });
  view = mount(EventsView); await flushPromises();
  await button('Modifier').trigger('click'); await flushPromises();
  await view.get('input[placeholder="Titre en français"]').setValue('Brouillon conservé');
  await button('Mettre à jour').trigger('click'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(true);
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Brouillon conservé');
  expect(view.get('[role="alert"]').text()).toContain('Sauvegarde refusée');
  expect(useDataStore().events[0].label.fr).toBe('Événement');
  await button('Mettre à jour').trigger('click'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false);
  expect(useDataStore().events[0].label.fr).toBe('Brouillon conservé');
  expect(apiClient.put).toHaveBeenCalledTimes(2);
});

it('blocks duplicate submissions and modal dismissal while an event save is pending', async () => {
  let complete!: (value: any) => void;
  vi.mocked(apiClient.put).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  view = mount(EventsView, { attachTo: document.body }); await flushPromises();
  await button('Modifier').trigger('click'); await flushPromises();
  await button('Mettre à jour').trigger('click'); await flushPromises();
  expect(button('Mettre à jour').attributes('disabled')).toBeDefined();
  expect(button('Annuler').attributes('disabled')).toBeDefined();
  expect(view.get('fieldset').attributes('disabled')).toBeDefined();
  const categories = view.getComponent(EditModal).getComponent(Select);
  await categories.get('[role="combobox"]').trigger('click');
  expect(categories.find('[role="listbox"]').exists()).toBe(false);
  await view.get('form').trigger('submit');
  await view.get('.modal-overlay').trigger('click');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(true); expect(apiClient.put).toHaveBeenCalledOnce();
  complete(event); await flushPromises(); expect(view.findComponent(EditModal).exists()).toBe(false);
});

it('keeps a new story draft after failure and inserts the saved story on retry', async () => {
  vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Réseau coupé')).mockResolvedValueOnce({ id: 12, title_fr: 'Ma frise', author: 'Auteur', categories: [] });
  view = mount(DatabaseView); await flushPromises();
  await button('Créer une frise').trigger('click'); await flushPromises();
  await view.get('input[placeholder="Titre en français"]').setValue('Ma frise');
  await view.get('input[placeholder="Nom de l\'auteur"]').setValue('Auteur');
  await button('Créer').trigger('click'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(true);
  expect(view.get('[role="alert"]').text()).toBe('Réseau coupé');
  await button('Créer').trigger('click'); await flushPromises();
  expect(view.findComponent(EditModal).exists()).toBe(false);
  expect(useDataStore().stories[0]).toMatchObject({ id: '12', title: { fr: 'Ma frise' } });
  expect(apiClient.get).not.toHaveBeenCalledWith('/stories/temporal-bounds');
});

it.each(['events', 'stories', 'periods'] as const)('renders a %s load error and offers a working retry', async resource => {
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === `/${resource}`) throw new Error('Service indisponible');
    return [] as any;
  });
  view = mount(resource === 'events' ? EventsView : resource === 'stories' ? DatabaseView : PeriodsView); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Service indisponible');
  expect(view.text()).not.toContain(resource === 'stories' ? 'Aucune frise' : resource === 'periods' ? 'Aucune période' : 'Aucun événement');
  vi.mocked(apiClient.get).mockResolvedValue([]);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.text()).toContain(resource === 'stories' ? 'Aucune frise' : resource === 'periods' ? 'Aucune période' : 'Aucun événement');
});

it.each(['events', 'periods'] as const)('distinguishes an empty %s picker from a failed load', async resource => {
  vi.mocked(apiClient.get).mockRejectedValue(new Error('Chargement impossible'));
  view = resource === 'events' ? mount(EventPickerModal, { props: { alreadyInStory: [], storyPeriods: [] } }) : mount(PeriodPickerModal, { props: { alreadyInStory: [] } });
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Chargement impossible');
  vi.mocked(apiClient.get).mockResolvedValue([]);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.text()).toContain(resource === 'events' ? 'Aucun événement disponible' : 'Aucune période');
  expect(view.text()).not.toContain('Chargement…');
});

it('shows the readable frises of each event and keeps a links failure distinct from an empty list', async () => {
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/events') return [event, { ...event, id: 'alone', label_fr: 'Seul' }] as any;
    if (url === '/stories') return [{ id: 2, title_fr: 'Histoire de la vie sur Terre', author: '', is_public: true }] as any;
    if (url === '/events/story-links') return [{ event_id: 'e', story_id: 2 }] as any;
    return [] as any;
  });
  view = mount(EventsView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a class="story-tag"><slot /></a>' } } } }); await flushPromises();
  const rows = view.findAll('.table-row');
  expect(rows.find(row => row.text().includes('Événement'))!.get('.col-stories').text()).toBe('Histoire de la vie sur Terre');
  expect(rows.find(row => row.text().includes('Seul'))!.get('.col-stories').text()).toBe('Aucune');
  view.unmount();
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/events/story-links') throw new Error('API indisponible');
    return url === '/events' ? [event] as any : [] as any;
  });
  view = mount(EventsView); await flushPromises();
  expect(view.get('.links-error').text()).toContain('API indisponible');
  expect(view.get('.table-row .col-stories').text()).not.toContain('Aucune');
});

it('keeps the graph draft and store intact when atomic creation fails, then saves the child in one request', async () => {
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (url === '/periods') return [{ id: 'parent', label_fr: 'Parent', wikidata_id: 'Q111', start_date: 'M65', end_date: 'NOW' }] as any;
    if (url === '/periods/parent') return {id:'parent',label_fr:'Parent',start_date:'M65',end_date:'NOW'} as any;
    if (url === '/periods/story-links' || url === '/stories') return [] as any;
    if (url.startsWith('/periods/wikidata/')) return null as any;
    throw new Error(`Unexpected read ${url}`);
  });
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockResolvedValue([]);
  const created = { id: 'created', wikidata_id: 'Q222', label_fr: 'Enfant', start_date: 'M65', end_date: 'NOW', parent_id: null, categories: [] };
  vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { error: 'Parent indisponible' } } }).mockResolvedValueOnce(created);
  view = mount(PeriodsView); await flushPromises();
  await view.get('.finder-item').trigger('click'); await flushPromises();
  await button('+ Ajouter une période').trigger('click'); await flushPromises();
  await view.get('input[placeholder="Q12345"]').setValue('Q222');
  await view.get('input[placeholder="Titre en français"]').setValue('Enfant');
  const modal = view.getComponent(EditModal);
  (modal.vm as any).form.startDate = 'M65'; (modal.vm as any).form.endDate = 'NOW';
  await flushPromises();
  await button('Créer').trigger('click'); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Parent indisponible');
  expect(useDataStore().periodById('created')).toBeNull();
  await button('Créer').trigger('click'); await flushPromises();
  expect(apiClient.post).toHaveBeenCalledTimes(2); expect(apiClient.put).not.toHaveBeenCalled(); expect(apiClient.patch).not.toHaveBeenCalled();
  expect(vi.mocked(apiClient.post).mock.calls.at(-1)?.[1]).not.toHaveProperty('parent_id');
  expect(useDataStore().periodById('created')?.parentId).toBeNull(); expect(view.findComponent(EditModal).exists()).toBe(false);
});

it('keeps the draft and blocks saving when categories fail, then reloads real categories on retry', async () => {
  vi.mocked(CategoryService.getInstance().getCategories).mockRejectedValueOnce(new Error('Categories hors ligne')).mockResolvedValueOnce([{ id: 'real-uuid', label: 'Réelle' }]);
  view = mount(EventsView); await flushPromises();
  await button('Modifier').trigger('click'); await flushPromises();
  await view.get('input[placeholder="Titre en français"]').setValue('Mon brouillon');
  expect(view.get('[role="alert"]').text()).toContain('Impossible de charger les catégories');
  expect(button('Mettre à jour').attributes('disabled')).toBeDefined();
  await view.get('form').trigger('submit'); await flushPromises(); expect(apiClient.put).not.toHaveBeenCalled();
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(button('Mettre à jour').attributes('disabled')).toBeUndefined();
  expect((view.get('input[placeholder="Titre en français"]').element as HTMLInputElement).value).toBe('Mon brouillon');
});

it('opens the flat catalogue picker without fetching an old ancestor chain', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([]);
  view=mount(PeriodPickerModal,{props:{alreadyInStory:[],initialPeriodId:'leaf'}}); await flushPromises();
  expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/periods'); expect(view.text()).toContain('Aucune période');
});