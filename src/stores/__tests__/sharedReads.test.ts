import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { SupersededRequestError } from '@/lib/requestCache';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const period = (id: string, parentId: string | null = null) => ({ id, parentId, hasParent: !!parentId, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', categories: [] });
const event = (label: string) => ({ id: 'e', label: { fr: label, en: '' }, date: 'NOW', categories: [] });
const story = (id: string) => ({ id, title: { fr: id, en: '' }, categories: [] });
const detail = (id: string) => ({ ...story(id), periods: [], events: [], author: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() });

beforeEach(() => { vi.resetAllMocks(); setActivePinia(createPinia()); });
afterEach(() => vi.restoreAllMocks());

it.each(['roots', 'children', 'story-periods', 'events', 'stories'] as const)('shares pending %s reads and remembers a successful empty result', async kind => {
  const store = useDataStore();
  const pending = deferred<any[]>();
  const spy = kind === 'roots' ? vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods')
    : kind === 'children' ? vi.spyOn(PeriodApiService.getInstance(), 'loadChildren')
    : kind === 'story-periods' ? vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods')
    : kind === 'events' ? vi.spyOn(EventApiService.getInstance(), 'getListEvents')
    : vi.spyOn(StoryApiService.getInstance(), 'getListStories');
  spy.mockReturnValue(pending.promise);
  const read = () => kind === 'roots' ? store.ensureRootsLoaded()
    : kind === 'children' ? store.ensureChildrenLoaded('p')
    : kind === 'story-periods' ? store.ensureStoryPeriodsLoaded('s')
    : kind === 'events' ? store.ensureEventsLoaded() : store.ensureStoriesLoaded();
  const first = read(); const second = read();
  await flushPromises(); expect(spy).toHaveBeenCalledOnce();
  pending.resolve([]); await Promise.all([first, second]);
  await read(); expect(spy).toHaveBeenCalledOnce();
});

it('shares forced story refreshes while they are pending', async () => {
  const read = vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  const store = useDataStore(); await store.ensureStoriesLoaded();
  await Promise.all([store.ensureStoriesLoaded(true), store.ensureStoriesLoaded(true)]);
  expect(read).toHaveBeenCalledTimes(2);
});

it('propagates a failure, releases loading and allows a retry instead of caching an empty success', async () => {
  const read = vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockRejectedValueOnce(new Error('Hors ligne')).mockResolvedValueOnce([]);
  const store = useDataStore();
  await expect(store.ensureRootsLoaded()).rejects.toThrow('Hors ligne');
  expect(store.error).toBe('Hors ligne'); expect(store.loading).toBe(false);
  await store.ensureRootsLoaded();
  expect(read).toHaveBeenCalledTimes(2); expect(store.error).toBeNull();
});

it('keeps independent parents independent and exposes their own errors', async () => {
  vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockImplementation(async id => {
    if (id === 'bad') throw new Error('Panne enfants');
    return [period('child', id)] as any;
  });
  const store = useDataStore();
  await expect(store.ensureChildrenLoaded('bad')).rejects.toThrow('Panne enfants');
  expect(await store.ensureChildrenLoaded('good')).toHaveLength(1);
  expect(store.requests['children:bad']).toEqual({ loading: false, error: 'Panne enfants' });
  expect(store.requests['children:good'].error).toBeNull();
});

it.each(['success', 'failure'] as const)('ignores an older event read %s after a save and joins the fresh read', async result => {
  const old = deferred<any[]>(); const fresh = deferred<any[]>();
  const read = vi.spyOn(EventApiService.getInstance(), 'getListEvents').mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const store = useDataStore(); const first = store.ensureEventsLoaded(); await flushPromises();
  store.upsertSavedEvent(event('Enregistré'));
  const second = store.ensureEventsLoaded(); await flushPromises();
  if (result === 'success') old.resolve([event('Ancien')]); else old.reject(new Error('Ancienne panne'));
  await flushPromises();
  expect(store.events[0].label.fr).toBe('Enregistré');
  expect(store.requests.events.loading).toBe(true);
  fresh.resolve([event('Canonique')]); await Promise.all([first, second]);
  expect(store.events[0].label.fr).toBe('Canonique'); expect(read).toHaveBeenCalledTimes(2);
});

it('cannot repopulate a reset store or clear a newer request status', async () => {
  const old = deferred<any[]>(); const fresh = deferred<any[]>();
  const read = vi.spyOn(PeriodApiService.getInstance(), 'getListPeriods').mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const store = useDataStore();
  const first = store.ensureRootsLoaded().catch(cause => cause); await flushPromises();
  store.resetData();
  const second = store.ensureRootsLoaded(); await flushPromises();
  old.resolve([period('old')]); expect(await first).toBeInstanceOf(SupersededRequestError);
  expect(store.periods).toEqual([]); expect(store.loading).toBe(true);
  fresh.resolve([period('fresh')]); await second;
  expect(store.periods.map(p => p.id)).toEqual(['fresh']); expect(read).toHaveBeenCalledTimes(2);
});

it('invalidates both parents after a move, preserving an unrelated children cache', async () => {
  const read = vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockImplementation(async id => id === 'old' ? [period('child', 'old')] as any : []);
  const store = useDataStore(); store.updatePeriods([period('old'), period('new'), period('other')]);
  await Promise.all(['old', 'new', 'other'].map(id => store.ensureChildrenLoaded(id)));
  store.upsertSavedPeriod(period('child', 'new'));
  read.mockImplementation(async id => id === 'new' ? [period('child', 'new')] as any : []);
  expect(await store.ensureChildrenLoaded('old')).toEqual([]);
  expect(await store.ensureChildrenLoaded('new')).toHaveLength(1);
  await store.ensureChildrenLoaded('other');
  expect(read).toHaveBeenCalledTimes(5); expect(store.periodById('new')?.hasChildren).toBe(true);
});

it('refreshes shared-link snapshots while retaining unrelated period lists after an association change', async () => {
  const details = vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async id => detail(id));
  const periods = vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([]);
  const list = vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([story('a'), story('b')]);
  const store = useDataStore();
  await Promise.all([store.ensureStoryLoaded('a'), store.ensureStoryLoaded('b'), store.ensureStoryPeriodsLoaded('a'), store.ensureStoryPeriodsLoaded('b'), store.ensureStoriesLoaded()]);
  store.invalidateStory('a');
  await Promise.all([store.ensureStoryLoaded('a'), store.ensureStoryLoaded('b'), store.ensureStoryPeriodsLoaded('a'), store.ensureStoryPeriodsLoaded('b'), store.ensureStoriesLoaded()]);
  expect(details).toHaveBeenCalledTimes(4); expect(periods).toHaveBeenCalledTimes(3); expect(list).toHaveBeenCalledTimes(2);
});

it('does not erase known category and hierarchy enrichment from the sparse story-period endpoint', async () => {
  const store = useDataStore();
  const known = { ...period('p'), hasChildren: true, categories: [{ id: 'cat', label: { fr: 'Catégorie', en: '' } }] };
  store.updatePeriods([known]);
  vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([{ id: 'p', label_fr: 'Actualisée', start_date: 'M65', end_date: 'NOW' }] as any);
  await store.ensureStoryPeriodsLoaded('s');
  expect(store.periodById('p')).toMatchObject({ label: { fr: 'Actualisée' }, hasChildren: true, categories: known.categories });
});

it('keeps frise placements separate from the catalogue and other frises', async () => {
  vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValueOnce([
    { ...period('univers'), storyParentId: null }, { ...period('milky'), storyParentId: 'univers' },
  ] as never[]).mockResolvedValueOnce([{ ...period('milky'), storyParentId: null }] as never[]);
  const store = useDataStore();
  const first = await store.ensureStoryPeriodsLoaded('one');
  const second = await store.ensureStoryPeriodsLoaded('two');
  expect(first.find(p => p.id === 'milky')?.storyParentId).toBe('univers');
  expect(second[0].storyParentId).toBeNull();
  expect(store.periodById('milky')).not.toHaveProperty('storyParentId');
  expect((await store.ensureStoryPeriodsLoaded('one')).find(p => p.id === 'milky')?.storyParentId).toBe('univers');
});
