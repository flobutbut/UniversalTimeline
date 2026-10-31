import { useUiStore } from '@/stores/useUiStore';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useDataStore } from '@/stores/useDataStore';
import { useDatabaseView } from '@/composables/useDatabaseView';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useGraphView } from '@/composables/useGraphView';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { WikidataQueryService } from '@/services/WikidataQueryService';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const period = (id: string) => ({ id, label: { fr: id, en: '' }, hasChildren: true, startDate: 'M65', endDate: 'NOW', categories: [] });
const story = (id: string) => ({ id, title: { fr: id, en: '' }, categories: [] });
const detail = (id: string) => ({ ...story(id), periods: [], events: [], author: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() });
let scope: EffectScope;
const scoped = <T>(setup: () => T): T => scope.run(setup)!;
beforeEach(() => { vi.resetAllMocks(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).hide); scope = effectScope(); });
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('shows the latest story when detail responses finish in reverse order', async () => {
  const a = deferred<any>(); const b = deferred<any>();
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(id => id === 'a' ? a.promise : b.promise);
  const view = scoped(useDatabaseView);
  const first = view.selectStory(story('a')); const second = view.selectStory(story('b'));
  expect(view.selectedStoryId.value).toBe('b');
  a.resolve(detail('a')); await first;
  expect(view.selectedStory.value).toBeNull(); expect(view.state.value.loadingStoryDetails).toBe(true);
  b.resolve(detail('b')); await second;
  expect(view.selectedStory.value?.id).toBe('b'); expect(view.state.value.loadingStoryDetails).toBe(false);
});

it('does not assign story details after the view is disposed', async () => {
  const pending = deferred<any>();
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockReturnValue(pending.promise);
  const view = scoped(useDatabaseView); const reading = view.selectStory(story('a'));
  scope.stop(); pending.resolve(detail('a')); await reading;
  expect(view.selectedStory.value).toBeNull();
});

it('shows a story error and retries instead of displaying an empty selection', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockRejectedValueOnce(new Error('Frise indisponible')).mockResolvedValueOnce(detail('a'));
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([story('a')]);
  useDataStore().updateStories([story('a')]);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  expect(view.state.value.storyError).toBe('Frise indisponible'); expect(view.selectedStoryId.value).toBe('a');
  await view.retryStory(); expect(view.selectedStory.value?.id).toBe('a'); expect(view.state.value.storyError).toBeNull();
});

it('keeps an association attached to its captured story when the tab changes during the write', async () => {
  const pending = deferred<void>();
  const service = StoryApiService.getInstance();
  const write = vi.spyOn(service, 'changeAssociations').mockReturnValue(pending.promise);
  const read = vi.spyOn(service, 'getStory').mockImplementation(async id => detail(id));
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a'), story('b')]);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  const saving = view.addPeriodsToStory(['p']);
  await view.selectStory(story('b')); pending.resolve(); await saving;
  expect(write).toHaveBeenCalledExactlyOnceWith('a', 'period', ['p'], false);
  expect(view.selectedStory.value?.id).toBe('b'); expect(view.selectedStory.value?.periods).toEqual([]);
  expect(read).toHaveBeenCalledTimes(2);
});

it('finishes loading when a saved association refresh overtakes a return to the same story', async () => {
  const pendingWrite = deferred<void>(); const pendingRead = deferred<ReturnType<typeof detail>>();
  const service = StoryApiService.getInstance();
  vi.spyOn(service, 'changeAssociations').mockReturnValue(pendingWrite.promise);
  vi.spyOn(service, 'getStory').mockResolvedValueOnce(detail('a')).mockResolvedValueOnce(detail('b')).mockReturnValue(pendingRead.promise);
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a'), story('b')]);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  const saving = view.addPeriodsToStory(['p']); await view.selectStory(story('b'));
  useDataStore().invalidateStory('a');
  const returning = view.selectStory(story('a'));
  pendingWrite.resolve(); await flushPromises();
  expect(view.state.value.loadingStoryDetails).toBe(true);
  pendingRead.resolve(detail('a')); await Promise.all([saving, returning]);
  expect(view.selectedStory.value?.id).toBe('a');
  expect(view.state.value.loadingStoryDetails).toBe(false);
  expect(view.relationsBusy.value).toBe(false);
});

it('reports a refused batch without claiming that some associations were saved', async () => {
  const service = StoryApiService.getInstance();
  vi.spyOn(service, 'getStory').mockImplementation(async id => detail(id));
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a')]);
  const write = vi.spyOn(service, 'changeAssociations').mockRejectedValueOnce({ response: { data: { error: 'Sélection refusée' } } });
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  await view.addEventsToStory(['one', 'two']);
  expect(write).toHaveBeenCalledExactlyOnceWith('a', 'event', ['one', 'two'], false);
  expect(useUiStore().notify).toHaveBeenLastCalledWith('Sélection refusée', 'error', undefined);
  expect(view.state.value.storyError).toBe('Sélection refusée');
  expect(view.relationsBusy.value).toBe(false);
});

it('keeps timeline selection and history consistent when children arrive in reverse order', async () => {
  const a = deferred<any[]>(); const b = deferred<any[]>();
  const store = useDataStore(); store.updatePeriods([period('a'), period('b')]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockImplementation(id => id === 'a' ? a.promise : b.promise);
  const nav = scoped(useHomeNavigation);
  const first = nav.handlePeriodClick(period('a')); const second = nav.handlePeriodClick(period('b'));
  b.resolve([{ ...period('b-child'), parentId: 'b' }]); await second;
  a.resolve([{ ...period('a-child'), parentId: 'a' }]); await first;
  expect(nav.currentPeriod.value?.id).toBe('b'); expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['b-child']);
  expect(nav.parentStack.value).toEqual([]); expect(nav.loading.value).toBe(false);
});

it('keeps the current timeline and retries the failed destination without duplicating history', async () => {
  const store = useDataStore(); store.updatePeriods([period('root'), period('a')]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockRejectedValueOnce(new Error('Hors ligne')).mockResolvedValueOnce([]);
  const nav = scoped(useHomeNavigation); nav.currentPeriod.value = period('root');
  await nav.handlePeriodClick(period('a'));
  expect(nav.currentPeriod.value?.id).toBe('root'); expect(nav.error.value).toBe('Hors ligne');
  await nav.retryLoad();
  expect(nav.currentPeriod.value?.id).toBe('a'); expect(nav.parentStack.value.map(p => p.id)).toEqual(['root']);
});

it('handles event loading errors in the timeline initial load', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockRejectedValue(new Error('Événements hors ligne'));
  const nav = scoped(useHomeNavigation); await nav.loadInitialData();
  expect(nav.error.value).toBe('Événements hors ligne'); expect(nav.loading.value).toBe(false);
});

it.each(['navigation', 'disposal'] as const)('ignores old Wikidata suggestions after %s', async action => {
  const pending = deferred<any[]>();
  const a = { ...period('a'), wikidata_id: 'Q123' }; const b = period('b');
  const store = useDataStore(); store.updatePeriods([a, b]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockResolvedValue([]);
  vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId').mockReturnValue(pending.promise);
  const graph = scoped(useGraphView); const reading = graph.handleSelect(a, 0); await flushPromises();
  if (action === 'navigation') await graph.handleSelect(b, 0); else scope.stop();
  pending.resolve([{ id: 'Q999', label: { fr: 'Suggestion', en: '' }, temporalData: [], hasChildren: false }]); await reading;
  expect(store.periodById('wikidata:Q999')).toBeNull();
});

it('shows a database children error without falling back to Wikidata as if the list were empty', async () => {
  const a = { ...period('a'), wikidata_id: 'Q123' };
  useDataStore().updatePeriods([a]);
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockRejectedValue(new Error('API indisponible'));
  const wikidata = vi.spyOn(WikidataQueryService.getInstance(), 'loadPeriodChildrenByWikidataId');
  const graph = scoped(useGraphView); await graph.handleSelect(a, 0);
  expect(graph.childrenError.value).toEqual({ column: 1, message: 'API indisponible' });
  expect(wikidata).not.toHaveBeenCalled(); expect(graph.loadingChildrenColumnIndex.value).toBeNull();
});

it('retries the story list as well as the details after a mutation refresh failed', async () => {
  const service = StoryApiService.getInstance();
  vi.spyOn(service, 'getStory').mockImplementation(async id => detail(id));
  vi.spyOn(service, 'changeAssociations').mockResolvedValue(undefined);
  const list = vi.spyOn(service, 'getListStories').mockRejectedValueOnce(new Error('Liste hors ligne')).mockResolvedValueOnce([{ ...story('a'), startDate: 'M65' }]);
  useDataStore().updateStories([story('a')]);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  await view.addEventsToStory(['e']);
  expect(view.state.value.storyError).toBeTruthy();
  await view.retryStory();
  expect(list).toHaveBeenCalledTimes(2);
  expect(useDataStore().stories[0].startDate).toBe('M65'); expect(view.state.value.storyError).toBeNull();
});

it('keeps a related-story write attached to its original story after selection changes', async () => {
  const service = StoryApiService.getInstance();
  const pending = deferred<void>();
  vi.spyOn(service, 'getStory').mockImplementation(async id => detail(id));
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a'), story('b')]);
  const write = vi.spyOn(service, 'linkChildStories').mockReturnValue(pending.promise);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  const saving = view.addChildStoriesToStory(['child']);
  await view.selectStory(story('b')); pending.resolve(); await saving;
  expect(write).toHaveBeenCalledExactlyOnceWith('a', ['child']);
  expect(view.selectedStory.value?.id).toBe('b'); expect(view.relationsBusy.value).toBe(false);
});

it('refreshes the cached story detail after an anchor changes', async () => {
  const service = StoryApiService.getInstance();
  const read = vi.spyOn(service, 'getStory').mockResolvedValueOnce(detail('a')).mockResolvedValueOnce({ ...detail('a'), childStories: [{ id: 'child', title: story('child').title, anchors: [{ type: 'event', id: 'event' }] }] });
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a')]);
  vi.spyOn(service, 'addAnchor').mockResolvedValue(undefined);
  useDataStore().updateStories([story('a')]);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  await view.addEventAnchorToStory('child', 'event');
  expect(read).toHaveBeenCalledTimes(2);
  expect(view.selectedStory.value?.childStories?.[0].anchors).toEqual([{ type: 'event', id: 'event' }]);
});

it('does not let an older timeline story overwrite a newer story and its scoped events', async () => {
  const pending = deferred<any[]>();
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([story('1'), story('2')]);
  vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockImplementation(async id => id === '1' ? pending.promise : [{ ...period('new-root'), parentId: null }]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockImplementation(async id => [{ id: `event-${id}`, label: { fr: id, en: '' }, date: 'M65', dateYearsBP: 65000000, categories: [] }]);
  const nav = scoped(useHomeNavigation);
  const first = nav.loadInitialData(); await nav.selectStory('2');
  pending.resolve([period('old-root')]); await first;
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['new-root']);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['event-2']);
  expect(nav.loading.value).toBe(false);
});

it('keeps a root replacement attached to its captured story when navigation changes', async () => {
  const service = StoryApiService.getInstance();
  const pending = deferred<void>();
  vi.spyOn(service, 'getStory').mockImplementation(async id => detail(id));
  vi.spyOn(service, 'getListStories').mockResolvedValue([story('a'), story('b')]);
  const write = vi.spyOn(service, 'changeRootPeriod').mockReturnValue(pending.promise);
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  const saving = view.changeRootPeriod('new-root');
  await view.selectStory(story('b')); pending.resolve(); await saving;
  expect(write).toHaveBeenCalledExactlyOnceWith('a', 'new-root');
  expect(view.selectedStory.value?.id).toBe('b');
  expect(view.relationsBusy.value).toBe(false);
});

it('keeps the original story after a root replacement fails and releases the pending state', async () => {
  const service = StoryApiService.getInstance();
  vi.spyOn(service, 'getStory').mockResolvedValue(detail('a'));
  vi.spyOn(service, 'changeRootPeriod').mockRejectedValue({ response: { data: { error: 'Racine indisponible' } } });
  const view = scoped(useDatabaseView); await view.selectStory(story('a'));
  const previous = view.selectedStory.value;
  await view.changeRootPeriod('new-root');
  expect(view.selectedStory.value).toBe(previous);
  expect(view.state.value.storyError).toBe('Racine indisponible');
  expect(view.relationsBusy.value).toBe(false);
});
