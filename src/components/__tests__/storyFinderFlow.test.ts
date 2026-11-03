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

it('edits the event importance for this frise from the event detail', async () => {
  const data = story('one'); data.events[0].importance = 'minor';
  await start(data);
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  const importance = view.findAllComponents(Tabs).find(item => item.attributes('aria-labelledby') === 'event-importance-event')!;
  expect(view.get('#event-importance-event').text()).toBe('Importance dans cette frise');
  expect(importance.findAll('button').map(button => button.text())).toEqual(['Majeur', 'Normal', 'Mineur']);
  expect(importance.get('.tab-button--active').text()).toBe('Mineur');
  await importance.findAll('button')[2].trigger('click');
  await importance.findAll('button')[0].trigger('click');
  expect(view.emitted('change-event-importance')).toEqual([['event', 'major']]);
});

it('shows the selected frise event description, categories, reference and record dates', async () => {
  const data = story('one');
  Object.assign(data.events[0], {
    label: { fr: ' ', en: 'Apollo 11' }, description: { fr: ' ', en: 'First crewed Moon landing.\nA historic mission.' },
    date: '1969-07-21', wikidata_id: 'Q43653',
    categories: [{ id: 'space', label: { fr: 'Conquête spatiale', en: '' } }, { id: 'science', label: { fr: ' ', en: 'Science' } }],
    createdAt: new Date('2026-04-05T12:00:00Z'), updatedAt: new Date('2026-10-30T12:00:00Z'),
  });
  await start(data);
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  const detail = view.get('.events-finder-detail');
  expect(detail.get('h3').text()).toBe('Apollo 11');
  expect(detail.get('.event-detail-date').text()).toBe('21 juillet 1969');
  expect(detail.get('.event-detail-description').text()).toContain('First crewed Moon landing.\nA historic mission.');
  expect(detail.findAll('.event-detail-categories li').map(item => item.text())).toEqual(['Conquête spatiale', 'Science']);
  expect(detail.get('.event-detail-reference a').attributes()).toMatchObject({ href: 'https://www.wikidata.org/wiki/Q43653', target: '_blank', rel: 'noopener noreferrer' });
  expect(detail.get('.event-detail-record').text()).toContain('5 avril 2026');
  expect(detail.get('.event-detail-record').text()).toContain('30 octobre 2026');
  await detail.findAll('button').find(item => item.text() === 'Modifier l’événement')!.trigger('click');
  expect(view.emitted('edit-event')).toEqual([['event']]);
  expect(selected()).toEqual(['event']);
});

it('handles missing event information and only links valid Wikidata identifiers', async () => {
  const data = story('one');
  Object.assign(data.events[0], { date: 'unknown', wikidata_id: 'https://untrusted.example', createdAt: undefined, updatedAt: new Date('invalid') });
  await start(data);
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  const detail = view.get('.events-finder-detail');
  expect(detail.get('.event-detail-date').text()).toBe('Date non déterminée');
  expect(detail.text()).toContain('Aucune description renseignée.');
  expect(detail.text()).toContain('Aucune catégorie renseignée.');
  expect(detail.find('.event-detail-reference').exists()).toBe(false);
  expect(detail.find('.event-detail-record').exists()).toBe(false);
  await view.setProps({ story: { ...data, events: [{ ...data.events[0], date: '', dateYearsBP: 65_000_000 }] } });
  expect(view.get('.events-finder-detail .event-detail-date').text()).toBe('il y a 65.0 Ma');
});

it('disables the selected event edit and importance actions during a save', async () => {
  await start();
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  await view.setProps({ updating: true });
  const detail = view.get('.events-finder-detail');
  expect(detail.findAll('button').every(item => item.attributes('disabled') !== undefined)).toBe(true);
  await detail.findAll('button').find(item => item.text() === 'Modifier l’événement')!.trigger('click');
  expect(view.emitted('edit-event')).toBeUndefined();
});

it('keeps columns as the default and lets the tree show a period detail without replacing the original layout', async () => {
  const data = story('one', [period('inside'), { ...period('child', 'inside'), description: { fr: 'Description complète de la période.', en: '' } }, period('leaf', 'child')]);
  await start(data);
  const originalColumns = view.get('.story-detail-panel__finder-columns-wrap').element;
  expect(view.find('[role="tree"]').exists()).toBe(false);
  await button('Arbre et détail').trigger('click'); await flushPromises();
  const child = view.get('[role="treeitem"][data-period-id="child"]');
  expect(child.attributes('aria-expanded')).toBe('false');
  await child.trigger('click'); await flushPromises();
  expect(child.attributes('aria-expanded')).toBe('false');
  expect(view.get('.story-period-detail h3').text()).toBe('child');
  expect(view.get('.story-period-detail__description').text()).toBe('Description complète de la période.');
  expect(view.getComponent({ name: 'StoryTimeline' }).props('selectedPeriodId')).toBe('child');
  await button('Modifier la période').trigger('click');
  expect(view.emitted('edit-period')).toEqual([['child']]);
  view.getComponent({ name: 'StoryTimeline' }).vm.$emit('select-period', 'leaf'); await flushPromises();
  expect(view.get('.story-period-detail h3').text()).toBe('leaf');
  expect(child.attributes('aria-expanded')).toBe('true');
  await button('Colonnes').trigger('click'); await flushPromises();
  expect(view.get('.story-detail-panel__finder-columns-wrap').element).toBe(originalColumns);
  expect(view.get('.story-period-columns').isVisible()).toBe(true);
  expect(view.get('.story-period-tree-workspace').isVisible()).toBe(false);
  expect(api.getListPeriods).not.toHaveBeenCalled();
});

it('creates a child under the period selected in the tree and preserves current exclusion rules', async () => {
  await start(); await button('Arbre et détail').trigger('click');
  await view.get('[role="treeitem"][data-period-id="inside"]').trigger('click'); await flushPromises();
  await button('Ajouter une sous-période').trigger('click'); await flushPromises();
  const editor = view.getComponent(EditModal);
  expect(editor.props('data')).toMatchObject({ parent_id: 'inside' });
  expect(editor.props('excludedPeriodIds')).toEqual(expect.arrayContaining(['inside', 'child']));
});

it('keeps secondary metadata separate and exposes create-frise and scoped removal actions for the selected period', async () => {
  const data = story('one');
  data.periods[1].wikidata_id = 'Q47158';
  await start(data); await button('Arbre et détail').trigger('click');
  await view.get('[role="treeitem"][data-period-id="child"]').trigger('click'); await flushPromises();
  const main = view.get('.story-period-detail__main');
  const metadata = view.get('.story-period-detail__metadata');
  expect(metadata.text()).toContain('Q47158');
  expect(main.find('.story-period-detail__reference').exists()).toBe(false);
  expect(main.get('h3').text()).toBe('child');
  const create = main.findAll('button').find(item => item.text() === 'Créer une frise')!;
  const remove = main.get('.story-period-detail__danger button');
  expect(main.get('.story-period-detail__danger').text()).toContain('restera disponible dans le catalogue');
  await create.trigger('click');
  expect(view.emitted('create-story-from-period')).toEqual([['child']]);
  await remove.trigger('click');
  expect(view.emitted('remove-period')).toEqual([['child']]);
  await view.setProps({ updating: true });
  expect(create.attributes('disabled')).toBeDefined();
  expect(remove.attributes('disabled')).toBeDefined();
  await create.trigger('click'); await remove.trigger('click');
  expect(view.emitted('create-story-from-period')).toHaveLength(1);
  expect(view.emitted('remove-period')).toHaveLength(1);
});

it('associates a frise to the selected tree period using the existing picker', async () => {
  await start(); await button('Arbre et détail').trigger('click');
  await view.get('[role="treeitem"][data-period-id="child"]').trigger('click'); await flushPromises();
  await button('Associer une frise').trigger('click'); await flushPromises();
  view.getComponent({ name: 'StoryRelatedPickerModal' }).vm.$emit('confirm', ['linked']); await flushPromises();
  expect(view.emitted('add-child-stories')).toEqual([[['linked'], { type: 'period', id: 'child' }]]);
});

it('loads additional tree branches without changing the selected detail or importing suggestions implicitly', async () => {
  const root = { ...period('inside', 'global-parent'), wikidata_id: 'Q100' };
  const childrenApi = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId)
    .mockImplementation(async id => id === 'Q100' ? [wdChild('Q300', true)] : [wdChild('Q400')]);
  await start(story('one', [root])); await button('Arbre et détail').trigger('click');
  await view.get('[role="treeitem"][data-period-id="inside"]').trigger('click');
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  const suggestion = view.get('[role="treeitem"][data-period-id="wikidata:Q300"]');
  await suggestion.get('button[aria-label="Déplier Wikidata Q300"]').trigger('click'); await flushPromises();
  expect(view.get('.story-period-detail h3').text()).toBe('inside');
  expect(view.find('[role="treeitem"][data-period-id="wikidata:Q400"]').exists()).toBe(true);
  await view.get('[role="treeitem"][data-period-id="wikidata:Q400"]').trigger('click'); await flushPromises();
  expect(view.get('.story-period-detail h3').text()).toBe('Wikidata Q400');
  expect(button('Importer cette période').attributes('disabled')).toBeDefined();
  expect(view.emitted('add-periods')).toBeUndefined();
  expect(childrenApi.mock.calls.map(call => call[0])).toContain('Q300');
  expect(api.getListPeriods).not.toHaveBeenCalled();
});

it('keeps the selected period when a tree suggestion read fails and waits for an explicit retry', async () => {
  const root = { ...period('inside'), wikidata_id: 'Q100' };
  const childrenApi = vi.mocked(WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId)
    .mockRejectedValueOnce(new Error('Suggestions indisponibles')).mockResolvedValueOnce([wdChild('Q300')]);
  await start(story('one', [root])); await button('Arbre et détail').trigger('click');
  await view.get('[role="treeitem"][data-period-id="inside"]').trigger('click');
  view.getComponent(Switch).vm.$emit('update:modelValue', true); await flushPromises();
  expect(childrenApi).toHaveBeenCalledOnce();
  expect(view.get('[role="alert"]').text()).toContain('Suggestions indisponibles');
  expect(view.get('.story-period-detail h3').text()).toBe('inside');
  await button('Réessayer').trigger('click'); await flushPromises();
  expect(childrenApi).toHaveBeenCalledTimes(2);
  expect(view.find('[role="treeitem"][data-period-id="wikidata:Q300"]').exists()).toBe(true);
  expect(view.find('[role="alert"]').exists()).toBe(false);
});

function mockTabScrollGeometry() {
  const viewport = view.get('.story-detail-panel__scroll-area').element as HTMLElement;
  const content = view.get('.story-detail-panel__tab-content').element as HTMLElement;
  const scrollTo = vi.fn();
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo });
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 200, 900, 600));
  vi.spyOn(content, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 360 - viewport.scrollTop, 900, 900));
  return { viewport, content, scrollTo };
}

it('opens a frise on the first Aperçu tab and keeps the existing period layout beneath the preview', async () => {
  await start();
  const tabs = view.getComponent(Tabs);
  expect(tabs.findAll('button')[0].text()).toBe('Aperçu');
  expect(tabs.props('modelValue')).toBe('overview');
  expect(view.findComponent({ name: 'StoryTimeline' }).exists()).toBe(true);
  expect(view.get('.story-period-columns').isVisible()).toBe(true);
});

it('returns to the preview smoothly without losing the selected event or replaying at the top', async () => {
  await start();
  const { viewport, scrollTo } = mockTabScrollGeometry();
  await button('Événements').trigger('click'); await flushPromises();
  view.findAllComponents(FinderItem).find(row => row.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  viewport.scrollTop = 160;
  await button('Aperçu').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' });
  expect(view.getComponent(Tabs).props('modelValue')).toBe('overview');
  expect(view.get('.event-detail-label').text()).toBe('event');
  viewport.scrollTop = 0;
  const calls = scrollTo.mock.calls.length;
  await button('Aperçu').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenCalledTimes(calls);
});

it('smoothly scrolls a clicked tab to the filter bar, including when that tab is already active', async () => {
  await start();
  const { viewport, content, scrollTo } = mockTabScrollGeometry();
  await button('Périodes').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 160, behavior: 'smooth' });
  expect(content.style.minHeight).toBe('600px');
  viewport.scrollTop = 160;
  await button('Événements').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenCalledOnce();
  viewport.scrollTop = 240;
  await button('Relations').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenCalledOnce();
  viewport.scrollTop = 60;
  await button('Relations').trigger('click'); await flushPromises();
  expect(scrollTo).toHaveBeenCalledTimes(2);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 160, behavior: 'smooth' });
});

it('applies only the latest tab click when several clicks arrive before the next render', async () => {
  await start();
  const { scrollTo } = mockTabScrollGeometry();
  const tabs = view.getComponent(Tabs);
  tabs.vm.$emit('update:modelValue', 'events');
  tabs.vm.$emit('update:modelValue', 'relations');
  await flushPromises();
  expect(view.getComponent(Tabs).props('modelValue')).toBe('relations');
  expect(scrollTo).toHaveBeenCalledOnce();
});

it('hides the preview without animation when reduced motion is requested', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  try {
    await start();
    const { scrollTo } = mockTabScrollGeometry();
    await button('Événements').trigger('click'); await flushPromises();
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 160, behavior: 'instant' });
  } finally { vi.unstubAllGlobals(); }
});
