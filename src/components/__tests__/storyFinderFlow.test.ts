import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import FilterBar from '@/components/FilterBar.vue';
import Tabs from '@/components/base/Tabs.vue';
import Switch from '@/components/base/Switch.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { SearchApiService } from '@/services/SearchApiService';
import { useDataStore } from '@/stores/useDataStore';
import type { Period, Story } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { resolve, reject, promise };
}
const period = (id: string, parentId: string | null = null): Period => ({ id, parentId, hasParent: !!parentId, hasChildren: true, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], children: [], temporalLocation: '', createdAt: new Date(), updatedAt: new Date() });
const story = (id: string, periods = [period('inside'), period('child', 'inside')]): Story => ({ id, title: { fr: id, en: '' }, periods, events: [{ id: 'event', label: { fr: 'event', en: '' }, date: 'M65', categories: [], createdAt: new Date(), updatedAt: new Date() }], author: '', isPublic: false, categories: [], createdAt: new Date(), updatedAt: new Date() });
const hit = (id: string, type: 'period' | 'event' = 'period') => ({ id, type, label: { fr: id, en: '' }, dateLabel: '', fromWikidata: false as const });
const api = PeriodApiService.getInstance();
let view: ReturnType<typeof mount>;
const selected = () => view.findAllComponents(FinderItem).filter(row => row.props('selected')).map(row => row.props('itemId'));
const button = (name: string) => view.findAll('button').find(b => b.text() === name)!;
async function start(data = story('one'), realTimeline = false) {
  view = mount(StoryDetailPanel, { props: { story: data }, attachTo: document.body, global: { stubs: {
    StoryTimeline: realTimeline ? false : { name: 'StoryTimeline', props: ['selectedPeriodId', 'selectedEventId'], template: '<div />' },
    StoryRelatedPickerModal: true,
  } } }); await flushPromises();
}
async function pick(p: Period) { view.getComponent(FilterBar).vm.$emit('pickPeriod', p); await flushPromises(); }
async function search(query: string) {
  const input = view.getComponent(FilterBar).get('input'); await input.trigger('focusin'); await input.setValue(query);
  await vi.advanceTimersByTimeAsync(250); await flushPromises();
}
beforeEach(() => {
  vi.useFakeTimers(); setActivePinia(createPinia());
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockResolvedValue([]);
  vi.spyOn(api, 'getPeriodByWikidataId').mockResolvedValue(null);
  vi.spyOn(api, 'getListPeriods').mockResolvedValue([period('outside')]);
  vi.spyOn(api, 'loadChildren').mockImplementation(async id => id === 'inside' ? [period('outside', 'inside'), period('a', 'inside'), period('b', 'inside')] : []);
  vi.spyOn(api, 'getPeriod').mockImplementation(async id => period(id, 'inside'));
  vi.spyOn(SearchApiService.getInstance(), 'searchLocal').mockResolvedValue([]);
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

it('selects a period belonging to the story without loading the global catalogue', async () => {
  await start(); await pick(period('child', 'inside'));
  expect(selected()).toEqual(['child']); expect(view.findAll('.finder-column')).toHaveLength(3);
  expect(api.getListPeriods).not.toHaveBeenCalled(); expect(api.loadChildren).not.toHaveBeenCalled();
});

it('keeps an empty frise scoped instead of opening the global catalogue from search', async () => {
  await start(story('empty', [])); await pick(period('outside'));
  expect(selected()).toEqual([]);
  expect(view.get('[role="alert"]').text()).toContain('hors de la frise');
  expect(api.getListPeriods).not.toHaveBeenCalled();
  expect(api.getPeriod).not.toHaveBeenCalled();
});

it('clears selection, search and open pickers when switching stories', async () => {
  await start(); await pick(period('child', 'inside'));
  view.getComponent(FilterBar).vm.$emit('add'); await flushPromises(); expect(view.findComponent(EditModal).exists()).toBe(true);
  await view.setProps({ story: story('two') });
  expect(selected()).toEqual([]); expect(view.findComponent(EditModal).exists()).toBe(false);
  expect(view.getComponent({ name: 'StoryTimeline' }).props('selectedPeriodId')).toBeNull();
});

it.each(['periods', 'events'] as const)('shows %s search errors and retries with its category', async mode => {
  const searchApi = vi.mocked(SearchApiService.getInstance().searchLocal).mockRejectedValueOnce(new Error('Recherche impossible')).mockResolvedValueOnce([hit('Résultat', mode === 'periods' ? 'period' : 'event')]);
  await start();
  if (mode === 'events') { view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises(); }
  view.getComponent(FilterBar).vm.$emit('update:categoryId', 'geo'); await search('terre');
  const body = new DOMWrapper(document.body);
  expect(body.get('[role="alert"]').text()).toContain('Recherche impossible'); expect(body.text()).not.toContain('Aucun résultat');
  await body.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(body.get('.filter-bar-dd__choose').text()).toContain('Résultat');
  expect(searchApi.mock.calls[1][1]).toMatchObject({ categoryId: 'geo', ...(mode === 'periods' ? { onlyPeriods: true } : { onlyEvents: true }) });
});

it('aborts story search on tab or story changes and ignores its old results', async () => {
  const pending = deferred<any[]>(); const searchApi = vi.mocked(SearchApiService.getInstance().searchLocal).mockReturnValue(pending.promise);
  await start(); await search('terre'); const signal = searchApi.mock.calls[0][1]!.signal!;
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises(); expect(signal.aborted).toBe(true);
  await view.setProps({ story: story('two') }); pending.resolve([hit('Ancien')]); await flushPromises();
  expect(new DOMWrapper(document.body).text()).not.toContain('Ancien');
  expect(view.getComponent(FilterBar).get('input').element.value).toBe('');
});


it('shows additional children beneath the frise root without revealing its global ancestors or other roots', async () => {
  const friseRoot = {...period('frise-root', 'global-parent'),wikidata_id:'Q100'};
  const linkedChild = {...period('linked-child', 'frise-root'),wikidata_id:'Q200'};
  const additionalChild = period('additional-child', 'frise-root');
  const store = useDataStore();
  store.cachePeriod(period('global-parent'));
  store.cachePeriod(period('unrelated-root'));
  vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).mockResolvedValue([wdChild('Q200'),wdChild('Q300')]);
  await start(story('scoped', [friseRoot, linkedChild]));
  await pick(friseRoot);
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  const firstColumn = view.findAll('.finder-column')[0];
  expect(firstColumn.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['frise-root']);
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['frise-root', 'linked-child', 'wikidata:Q300']);
  expect(selected()).toEqual(['frise-root']);
  expect(api.getListPeriods).not.toHaveBeenCalled();
  expect(api.getPeriod).not.toHaveBeenCalled();
  expect(api.loadChildren).not.toHaveBeenCalled();
  view.getComponent(Switch).vm.$emit('update:modelValue', false); await flushPromises();
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['frise-root', 'linked-child']);
  expect(selected()).toEqual(['frise-root']);
});

it('does not load global roots when enabling the switch before selecting a frise period', async () => {
  await start(story('scoped', [period('frise-root', 'global-parent')]));
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['frise-root']);
  expect(api.getListPeriods).not.toHaveBeenCalled();
  expect(api.getPeriod).not.toHaveBeenCalled();
  expect(api.loadChildren).not.toHaveBeenCalled();
});

it('refuses a search result outside the frise while preserving the current selection', async () => {
  vi.mocked(api.getPeriod).mockResolvedValue(period('unrelated-root'));
  await start(); await pick(period('child', 'inside')); await pick(period('unrelated-root'));
  expect(selected()).toEqual(['child']);
  expect(view.get('[role="alert"]').text()).toContain('hors de la frise');
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).not.toContain('unrelated-root');
  expect(api.getListPeriods).not.toHaveBeenCalled();
});


const wdChild = (id: string, hasChildren = false) => ({ id, label: { fr: `Wikidata ${id}`, en: '' }, description: { fr: '', en: '' }, temporalData: [{ startDate: 'M60', endDate: 'TODAY', location: 'Globale' }], hasChildren, children: [] });
const finderRow = (id: string) => view.findAllComponents(FinderItem).find(row => row.props('itemId') === id)!;
async function enableWikidata() {
  const root = { ...period('inside', 'global-parent'), wikidata_id: 'Q100' };
  await start(story('one', [root])); await pick(root);
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
}

it('queries Wikidata even with local children, deduplicates Q-ids, and keeps the frise root', async () => {
  vi.mocked(api.loadChildren).mockResolvedValue([{ ...period('local', 'inside'), wikidata_id: 'Q200' }]);
  const wd = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId)
    .mockResolvedValue([wdChild('Q100'), wdChild('Q200'), wdChild('Q300')]);
  await enableWikidata();
  expect(wd).toHaveBeenCalledExactlyOnceWith('Q100', expect.objectContaining({ signal: expect.any(AbortSignal), force: false }));
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['inside', 'wikidata:Q200', 'wikidata:Q300']);
  expect(finderRow('wikidata:Q300').props('wikidataOnly')).toBe(true);
  expect(api.getListPeriods).not.toHaveBeenCalled(); expect(api.getPeriod).not.toHaveBeenCalled();
  expect(useDataStore().periodById('wikidata:Q300')).toBeNull();
  view.getComponent(Switch).vm.$emit('update:modelValue', false); await flushPromises();
  expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).toEqual(['inside']);
  expect(selected()).toEqual(['inside']);
});

it('queries frise roots when the switch is enabled before a selection', async () => {
  const root = { ...period('root', 'outside'), wikidata_id: 'Q100' };
  await start(story('one', [root]));
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  expect(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).toHaveBeenCalledWith('Q100', expect.anything());
  expect(api.loadChildren).not.toHaveBeenCalled();
  expect(selected()).toEqual([]); expect(api.getListPeriods).not.toHaveBeenCalled();
});

it('explores virtual Wikidata children without sending virtual IDs to the database', async () => {
  const wd = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId)
    .mockResolvedValueOnce([wdChild('Q300', true)]).mockResolvedValueOnce([wdChild('Q400')]);
  await enableWikidata();
  await finderRow('wikidata:Q300').get('.finder-item-content').trigger('click'); await flushPromises();
  expect(wd.mock.calls.map(call => call[0])).toEqual(['Q100', 'Q300']);
  expect(api.loadChildren).not.toHaveBeenCalled();
  expect(finderRow('wikidata:Q400').exists()).toBe(true);
  for (const action of view.findAll('.finder-column')[2].findAll('.story-column-header button')) expect(action.attributes('disabled')).toBeDefined();
  expect(finderRow('wikidata:Q400').get('button[aria-label="Importer depuis Wikidata"]').attributes('disabled')).toBeDefined();
});

it('shows Wikidata failures and retries the read with force', async () => {
  const wd = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId)
    .mockRejectedValueOnce(new Error('Wikidata indisponible')).mockResolvedValueOnce([wdChild('Q300')]);
  await enableWikidata();
  expect(view.get('[role="alert"]').text()).toContain('Wikidata indisponible');
  expect(selected()).toEqual(['inside']);
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(wd.mock.calls[1][1]).toMatchObject({ force: true });
  expect(finderRow('wikidata:Q300').exists()).toBe(true); expect(view.find('[role="alert"]').exists()).toBe(false);
});

it.each(['disable', 'story', 'dispose'] as const)('discards late Wikidata results after %s', async context => {
  const pending = deferred<ReturnType<typeof wdChild>[]>();
  const wd = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).mockReturnValue(pending.promise);
  await enableWikidata();
  const signal = wd.mock.calls[0][1]!.signal!;
  if (context === 'disable') { view.getComponent(Switch).vm.$emit('update:modelValue', false); await flushPromises(); }
  if (context === 'story') await view.setProps({ story: story('two') });
  if (context === 'dispose') view.unmount();
  expect(signal.aborted).toBe(true);
  pending.resolve([wdChild('Q300')]); await flushPromises();
  if (context !== 'dispose') expect(view.findAllComponents(FinderItem).map(row => row.props('itemId'))).not.toContain('wikidata:Q300');
  expect(useDataStore().periodById('wikidata:Q300')).toBeNull();
});

it('opens the existing period form for a Wikidata suggestion and never associates its virtual ID', async () => {
  vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).mockResolvedValue([wdChild('Q300')]);
  const associate = vi.spyOn(StoryApiService.getInstance(), 'changeAssociations').mockResolvedValue(undefined);
  await enableWikidata();
  await finderRow('wikidata:Q300').get('button[aria-label="Importer depuis Wikidata"]').trigger('click'); await flushPromises();
  expect(view.getComponent(EditModal).props('data')).toMatchObject({ wikidata_id: 'Q300', parent_id: 'inside', startDate: 'M60', endDate: '' });
  expect(view.emitted('add-periods')).toBeUndefined(); expect(associate).not.toHaveBeenCalled();
});


it('replaces an imported suggestion with its saved period and keeps its selected column', async () => {
  vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).mockResolvedValue([wdChild('Q300')]);
  const imported = { ...period('saved-child', 'inside'), wikidata_id: 'Q300' };
  const associate = vi.spyOn(StoryApiService.getInstance(), 'changeAssociations').mockResolvedValue(undefined);
  vi.spyOn(api, 'createPeriod').mockResolvedValue(imported);
  await enableWikidata();
  await finderRow('wikidata:Q300').get('.finder-item-content').trigger('click'); await flushPromises();
  await finderRow('wikidata:Q300').get('button[aria-label="Importer depuis Wikidata"]').trigger('click'); await flushPromises();
  view.getComponent(EditModal).vm.$emit('submit', { qid: 'Q300', title: imported.label, description: { fr: '', en: '' }, startDate: 'M60', endDate: 'NOW', date: '', location: 'Globale', parentId: 'inside', categories: [], author: '', isPublic: false });
  await flushPromises();
  expect(associate).toHaveBeenCalledExactlyOnceWith('one', 'period', ['saved-child'], false, 'inside');
  expect(view.emitted('period-imported')).toHaveLength(1); expect(view.emitted('add-periods')).toBeUndefined();
  await view.setProps({ story: story('one', [{ ...period('inside', 'global-parent'), wikidata_id: 'Q100' }, imported]) });
  expect(selected()).toEqual(['saved-child']);
  expect(view.findAllComponents(FinderItem).filter(row => row.props('itemId') === 'saved-child')).toHaveLength(1);
  expect(view.findAll('.finder-column')).toHaveLength(3);
  expect(finderRow('saved-child').get('button[aria-haspopup="menu"]').exists()).toBe(true);
});

it('offers period and frise additions at the root without retaining a nested anchor', async () => {
  await start(); await pick(period('child', 'inside'));
  const headers = view.findAll('.story-column-header');
  const rootButton = (name: string) => headers[0].findAll('button').find(action => action.text() === name)!;
  expect(rootButton('Changer la racine')).toBeUndefined();
  expect(rootButton('Ajouter une période').attributes('disabled')).toBeUndefined();
  await headers[2].findAll('button').find(action => action.text() === 'Ajouter une frise')!.trigger('click');
  view.getComponent({ name: 'StoryRelatedPickerModal' }).vm.$emit('close'); await flushPromises();
  await rootButton('Ajouter une frise').trigger('click');
  expect(view.getComponent({ name: 'StoryRelatedPickerModal' }).props('periods')).toHaveLength(2);
  view.getComponent({ name: 'StoryRelatedPickerModal' }).vm.$emit('confirm', ['linked-frise'], 'inside'); await flushPromises();
  expect(view.emitted('add-child-stories')).toEqual([[['linked-frise'], { type: 'period', id: 'inside' }]]);
  await rootButton('Ajouter une période').trigger('click');
  expect(view.getComponent(EditModal).props()).toMatchObject({ mode: 'create', type: 'period', data: { parent_id: null }, allowExistingPeriods: true });
  expect(view.emitted('add-periods')).toBeUndefined();
});

it('keeps the loading indicator inside the filter bar instead of inserting a banner above the columns', async () => {
  const pending = deferred<ReturnType<typeof wdChild>[]>();
  vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId).mockReturnValue(pending.promise);
  await enableWikidata();
  expect(view.getComponent(FilterBar).find('.story-finder-activity__cancel').exists()).toBe(true);
  expect(view.find('.story-finder-feedback').exists()).toBe(false);
  const tree = view.get('.story-detail-panel__finder-columns-wrap').element;
  pending.resolve([wdChild('Q300')]); await flushPromises();
  expect(view.get('.story-detail-panel__finder-columns-wrap').element).toBe(tree);
  expect(view.find('.story-finder-activity__cancel').exists()).toBe(false);
  expect(view.find('.story-finder-activity').exists()).toBe(true);
});


it('keeps the full preview visible through column exploration, category changes and tab changes', async () => {
  const periods = [period('root'), period('other-root'), period('branch-a', 'root'), period('branch-b', 'root'), period('a-leaf', 'branch-a'), period('a-second', 'branch-a'), period('b-leaf', 'branch-b')];
  await start(story('one', periods), true);
  const expectFullPreview = () => expect(view.findAll('[data-period-id]').map(row => row.attributes('data-period-id')).sort()).toEqual(periods.map(p => p.id).sort());
  expectFullPreview();
  for (const id of ['root', 'branch-a', 'a-leaf', 'branch-b', 'root']) {
    await finderRow(id).get('.finder-item-content').trigger('click'); await flushPromises();
    expectFullPreview();
  }
  view.getComponent({ name: 'StoryTimeline' }).vm.$emit('deselect'); await flushPromises();
  expectFullPreview();
  view.getComponent(FilterBar).vm.$emit('update:categoryId', 'no-match'); await flushPromises();
  expectFullPreview();
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  expectFullPreview();
  const scrollArea = view.get('.story-detail-panel__scroll-area');
  expect(scrollArea.findComponent({ name: 'StoryTimeline' }).exists()).toBe(true);
  expect(scrollArea.find('.story-detail-panel__tab-content').exists()).toBe(true);
  expect(scrollArea.find('.story-detail-panel__tabs-bar').exists()).toBe(false);
});

it('allows an existing root to be placed below another period and preserves that placement after refresh', async () => {
  const univers = period('univers'); const milky = period('milky');
  await start(story('one', [univers, milky])); await pick(univers);
  const header = view.findAll('.story-column-header')[1];
  await header.findAll('button').find(action => action.text() === 'Ajouter une période')!.trigger('click');
  const picker = view.getComponent(EditModal);
  expect(picker.props('data')).toMatchObject({ parent_id: 'univers' });
  expect(picker.props('excludedPeriodIds')).toContain('univers');
  expect(picker.props('excludedPeriodIds')).not.toContain('milky');
  const associate = vi.spyOn(StoryApiService.getInstance(), 'changeAssociations').mockResolvedValue(undefined);
  picker.vm.$emit('select-period', 'milky'); await flushPromises();
  expect(associate).toHaveBeenCalledExactlyOnceWith('one', 'period', ['milky'], false, 'univers');
  expect(view.emitted('period-imported')).toHaveLength(1);
  await view.setProps({ story: story('one', [univers, { ...milky, storyParentId: 'univers' }]) });
  const columns = view.findAll('.finder-column');
  expect(columns[0].findAllComponents(FinderItem).map(item => item.props('itemId'))).toEqual(['univers']);
  expect(columns[1].findAllComponents(FinderItem).map(item => item.props('itemId'))).toEqual(['milky']);
});

it('opens the shared event creator, excludes existing events, and attaches the confirmed selection', async () => {
  const associate = vi.spyOn(StoryApiService.getInstance(), 'changeAssociations').mockResolvedValue(undefined);
  await start(); await button('Ajouter un événement').trigger('click');
  const editor = view.getComponent(EditModal);
  expect(editor.props()).toMatchObject({ type: 'event', mode: 'create', data: {}, allowExistingEvents: true, excludedEventIds: ['event'] });
  editor.vm.$emit('select-event', 'other-event'); await flushPromises();
  expect(associate).toHaveBeenCalledExactlyOnceWith('one', 'event', ['other-event']);
  expect(view.emitted('event-added')).toHaveLength(1); expect(view.findComponent(EditModal).exists()).toBe(false);
});
