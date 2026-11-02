import { useUiStore } from '@/stores/useUiStore';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useDatabaseDelete } from '@/composables/useDatabaseDelete';
import { useDataStore } from '@/stores/useDataStore';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { apiClient } from '@/services/ApiClient';
import { WikidataQueryService } from '@/services/WikidataQueryService';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
const leaf = { id: 'leaf', parentId: 'parent', wikidata_id: 'Q123', label: { fr: 'Feuille', en: 'Leaf' }, startDate: 'M65', endDate: 'NOW', categories: [] };
const parent = { ...leaf, id: 'parent', parentId: null, hasChildren: true };
const deleted = { id: 'leaf', parent: { id: 'parent', hasChildren: false } };
const toast = { show: vi.fn(), hide: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation((toast).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation((toast).hide);
  vi.spyOn(useUiStore(), 'requestConfirmation').mockResolvedValue(true);
  vi.mocked(apiClient.delete).mockResolvedValue(deleted);
  useDataStore().updatePeriods([parent, leaf]);
});
afterEach(() => vi.restoreAllMocks());

it('does not delete or change the store after cancellation', async () => {
  vi.mocked(useUiStore().requestConfirmation).mockResolvedValue(false);
  const handler = useDatabaseDelete();
  expect(await handler.handleDelete(leaf, 'period')).toBe(false);
  expect(apiClient.delete).not.toHaveBeenCalled();
  expect(useDataStore().periods).toHaveLength(2);
  expect(handler.loading.value).toBe(false);
});

it.each([409, 500])('preserves all data and displays a readable API error (%s)', async status => {
  vi.mocked(apiClient.delete).mockRejectedValue({ response: { status, data: { error: 'Cette période appartient à une frise.' } } });
  expect(await useDatabaseDelete().handleDelete(leaf, 'period')).toBe(false);
  expect(useDataStore().periods).toEqual([parent, leaf]);
  expect(toast.show).toHaveBeenLastCalledWith('Cette période appartient à une frise.', 'error', undefined);
});

it('uses the server response to remove the period and update its parent', async () => {
  expect(await useDatabaseDelete().handleDelete(leaf, 'period')).toBe(true);
  expect(apiClient.delete).toHaveBeenCalledWith('/periods/leaf');
  expect(useDataStore().periods).toEqual([{ ...parent, hasChildren: false }]);
});

it('encodes identifiers and propagates a missing-period error', async () => {
  const missing = { response: { status: 404 } };
  vi.mocked(apiClient.delete).mockRejectedValue(missing);
  await expect(PeriodApiService.getInstance().deletePeriod('a/b')).rejects.toBe(missing);
  expect(apiClient.delete).toHaveBeenCalledWith('/periods/a%2Fb');
});

it('prevents a second confirmation while the first deletion is pending', async () => {
  let confirm!: (accepted: boolean) => void;
  vi.mocked(useUiStore().requestConfirmation).mockReturnValue(new Promise(resolve => { confirm = resolve; }));
  const handler = useDatabaseDelete();
  const first = handler.handleDelete(leaf, 'period');
  expect(await handler.handleDelete(leaf, 'period')).toBe(false);
  expect(useUiStore().requestConfirmation).toHaveBeenCalledOnce();
  confirm(true);
  expect(await first).toBe(true);
  expect(apiClient.delete).toHaveBeenCalledOnce();
});

it('releases the loading state if the confirmation fails', async () => {
  vi.mocked(useUiStore().requestConfirmation).mockRejectedValue(new Error('Dialogue indisponible'));
  const handler = useDatabaseDelete();
  expect(await handler.handleDelete(leaf, 'period')).toBe(false);
  expect(handler.loading.value).toBe(false);
  expect(apiClient.delete).not.toHaveBeenCalled();
});

it('removes virtual suggestions under the deleted period while keeping unrelated rows', () => {
  const store = useDataStore();
  store.updatePeriods([parent, leaf, { ...leaf, id: 'wikidata:Q5', parentId: 'leaf' }, { ...leaf, id: 'wikidata:Q6', parentId: 'wikidata:Q5' }, { ...leaf, id: 'other', parentId: null }]);
  store.removeDeletedPeriod(deleted);
  expect(store.periods.map(p => p.id)).toEqual(['parent', 'other']);
});

it('invalidates story snapshots and the parent children cache after deletion', async () => {
  const store = useDataStore();
  const children = vi.spyOn(PeriodApiService.getInstance(), 'loadChildren').mockResolvedValue([leaf] as any);
  const story = vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([leaf] as any);
  await store.ensureChildrenLoaded('parent'); await store.ensureStoryPeriodsLoaded('1');
  await store.ensureChildrenLoaded('parent'); await store.ensureStoryPeriodsLoaded('1');
  store.removeDeletedPeriod(deleted);
  children.mockResolvedValue([]); story.mockResolvedValue([]);
  expect(await store.ensureChildrenLoaded('parent')).toEqual([]);
  expect(await store.ensureStoryPeriodsLoaded('1')).toEqual([]);
  expect(children).toHaveBeenCalledTimes(2); expect(story).toHaveBeenCalledTimes(2);
});

it.each(['roots', 'children', 'story'] as const)('does not resurrect a deleted period from an older %s response', async source => {
  const store = useDataStore();
  let complete!: (rows: any[]) => void;
  const pending = new Promise<any[]>(resolve => { complete = resolve; });
  const service = PeriodApiService.getInstance();
  if (source === 'roots') vi.spyOn(service, 'getListPeriods').mockReturnValue(pending);
  if (source === 'children') vi.spyOn(service, 'loadChildren').mockReturnValue(pending);
  if (source === 'story') vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockReturnValue(pending);
  const loading = source === 'roots' ? store.ensureRootsLoaded() : source === 'children' ? store.ensureChildrenLoaded('parent') : store.ensureStoryPeriodsLoaded('1');
  store.removeDeletedPeriod(deleted);
  complete([leaf]); await loading;
  expect(store.periodById('leaf')).toBeNull();
  if (source === 'story') expect(await store.ensureStoryPeriodsLoaded('1')).toEqual([]);
});

it('removes deleted cards from the retained timeline without clearing the current parent', async () => {
  const nav = useHomeNavigation();
  nav.currentPeriod.value = parent; nav.displayedPeriods.value = [leaf];
  useDataStore().removeDeletedPeriod(deleted); await nextTick();
  expect(nav.currentPeriod.value).toMatchObject({ id: 'parent', hasChildren: false });
  expect(nav.displayedPeriods.value).toEqual([]);
});

it('returns to a surviving ancestor when the current timeline context is deleted', async () => {
  const nav = useHomeNavigation();
  nav.currentPeriod.value = leaf; nav.parentStack.value = [parent];
  useDataStore().removeDeletedPeriod(deleted); await nextTick();
  expect(nav.currentPeriod.value?.id).toBe('parent');
  expect(nav.parentStack.value).toEqual([]);
});

it.each(['event', 'story'] as const)('preserves the existing %s deletion workflow', async type => {
  const store = useDataStore();
  store.updateEvents([{ id: 'e', label: { fr: 'Événement', en: '' }, date: 'NOW', categories: [] }]);
  store.updateStories([{ id: 's', title: { fr: 'Frise', en: '' }, categories: [] }]);
  const item = type === 'event' ? store.events[0] : store.stories[0];
  expect(await useDatabaseDelete().handleDelete(item, type)).toBe(true);
  expect(type === 'event' ? store.events : store.stories).toEqual([]);
  expect(store.periods).toEqual([parent, leaf]);
});
