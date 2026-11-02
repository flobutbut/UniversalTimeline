import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import { storyAncestorIds } from '@/lib/homeStoryPeriodNav';

const apiPeriod = (id: string, parent: string | null, start: number, hasChildren = true) => ({
  id, label_fr: id, parent_id: parent, start_date: '', end_date: '',
  start_years_bp: start, end_years_bp: 0, has_children: hasChildren,
});
const source = [apiPeriod('root', null, 1000), apiPeriod('child', 'root', 500), apiPeriod('grandchild', 'child', 100), apiPeriod('leaf', 'grandchild', 50, false)];
const event = (bp: number) => ({ id: `e${bp}`, label: { fr: `${bp}`, en: '' }, date: `M${bp / 1000000}`, dateYearsBP: bp, categories: [] });
let scope: EffectScope;
let nav: ReturnType<typeof useHomeNavigation>;
const ids = () => nav.breadcrumb.value.map(item => item.id);
async function descend() {
  await nav.loadInitialData(undefined, true);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
}
beforeEach(() => {
  setActivePinia(createPinia()); scope = effectScope();
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([
    { id: '1', title: { fr: 'Univers Moderne', en: '' }, categories: [] },
    { id: '2', title: { fr: 'Autre frise', en: '' }, categories: [] },
  ]);
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async id => storyFixture(id,
    id === '1' ? source : [apiPeriod('other-root', null, 300), apiPeriod('other-leaf', 'other-root', 0, false)]
  , [event(750), event(250), event(50)]));
  nav = scope.run(useHomeNavigation)!;
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('builds the path from the story and all committed ancestors, excluding a merely clicked leaf', async () => {
  await descend();
  expect(ids()).toEqual(['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
  expect(nav.breadcrumb.value[0].title).toBe('Univers Moderne');
  vi.spyOn(StoryApiService.getInstance(), 'getSuggestions').mockResolvedValue([]);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  // Only frises anchored on the clicked period: an ancestor's frises stay on its own card.
  expect(StoryApiService.getInstance().getSuggestions).not.toHaveBeenCalled();
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledOnce();
  expect(ids()).toEqual(['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
});

it('jumps several levels without duplicating history, restoring scoped children and events', async () => {
  await descend();
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['e50']);
  await nav.navigateToBreadcrumb(1);
  expect(nav.currentPeriod.value?.id).toBe('root'); expect(nav.parentStack.value).toEqual([]);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['child']);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['e750', 'e250', 'e50']);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['root']);
  await nav.goBack(); expect(nav.currentPeriod.value?.id).toBe('root');
});

it('opens the story overview from its own crumb without reloading or exposing unrelated catalog periods', async () => {
  await descend();
  const store = useDataStore();
  store.updatePeriods([...store.periods, { ...store.periods[0], id: 'outside', parentId: 'root' }]);
  await nextTick();
  await nav.navigateToBreadcrumb(1);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['child']);
  await nav.navigateToBreadcrumb(0);
  expect(nav.currentPeriod.value).toBeNull(); expect(nav.parentStack.value).toEqual([]);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['root']);
  expect(ids()).toEqual(['story:1']);
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(1);
});

it('cancels a pending leaf request when an ancestor is chosen', async () => {
  await descend();
  let resolve!: (value: ReturnType<typeof storyFixture>) => void;
  useDataStore().invalidateStory('1');
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const pending = nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(nav.loading.value).toBe(true);
  await nav.navigateToBreadcrumb(1);
  resolve(storyFixture('1', source, [], [{ id: '2', title_fr: 'Autre frise', anchors: [{ type: 'period', id: 'leaf' }] }])); await pending;
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('root');
  expect(nav.loading.value).toBe(false); expect(nav.storySuggestions.value).toEqual([]);
});

it('keeps the ancestor story’s periods in one continuous path and reopens any of them', async () => {
  await descend(); await nav.selectStory('2');
  expect(ids()).toEqual([...['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild'], 'story:2', 'story:2/period:other-root']);
  expect(nav.breadcrumb.value.map(item => item.kind)).toEqual(['story', 'period', 'period', 'period', 'story', 'period']);
  await nav.navigateToBreadcrumb(3);
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['root', 'child']);
  expect(ids()).toEqual(['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
});

it('can reset only the current story overview while keeping its ancestor story', async () => {
  await descend(); await nav.selectStory('2'); await nav.navigateToBreadcrumb(4);
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.currentPeriod.value).toBeNull();
  expect(ids()).toEqual([...['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild'], 'story:2']);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('grandchild');
});

it('ignores invalid indices and the current position', async () => {
  await descend();
  for (const index of [-1, NaN, 0.5, 3, 999]) await nav.navigateToBreadcrumb(index);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(ids()).toEqual(['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
});

it('updates path labels after a canonical period edit', async () => {
  await descend(); const store = useDataStore();
  store.updatePeriods(store.periods.map(p => p.id === 'child' ? { ...p, label: { fr: 'Nouveau nom', en: '' } } : p));
  await nextTick();
  expect(nav.breadcrumb.value[2].title).toBe('Nouveau nom');
});

it('opens the overview of an ancestor story from its own crumb', async () => {
  await descend(); await nav.selectStory('2'); await nav.navigateToBreadcrumb(0);
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value).toBeNull();
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['root']);
  expect(ids()).toEqual(['story:1']);
});

it('merges a child story with the root period that bears its name', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: '1', title: { fr: 'Univers Moderne', en: '' }, categories: [] },
    { id: '2', title: { fr: 'Other-root', en: '' }, categories: [] },
  ] as never);
  await descend(); await nav.selectStory('2');
  expect(ids()).toEqual([...['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild'], 'story:2']);
  expect(nav.breadcrumb.value.at(-1)).toMatchObject({ title: 'Other-root', kind: 'story' });
  expect(nav.currentPeriod.value?.id).toBe('other-root');
});

it('does not repeat the period a child story hangs from', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => storyFixture(id,
    id === '1' ? source : [apiPeriod('grandchild', null, 100), apiPeriod('sub', 'grandchild', 80), apiPeriod('sub-leaf', 'sub', 0, false)]
  ));
  await descend(); await nav.selectStory('2');
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(ids()).toEqual([...['story:1', 'story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild'], 'story:2', 'story:2/period:sub']);
  expect(nav.breadcrumb.value[4].title).toBe('Autre frise');
  await nav.navigateToBreadcrumb(4);
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(nav.parentStack.value).toEqual([]);
});

it('opens a story under its real accessible lineage instead of the entry story', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: '1', title: { fr: 'Univers Moderne', en: '' }, categories: [], parentStoryId: null },
    { id: '2', title: { fr: 'Autre frise', en: '' }, categories: [], parentStoryId: '3' },
    { id: '3', title: { fr: 'Parente', en: '' }, categories: [], parentStoryId: null },
  ] as never);
  await nav.openStory('2');
  expect(ids()).toEqual(['story:3', 'story:2', 'story:2/period:other-root']);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('3');
  await nav.openStory('3');
  expect(ids()[0]).toBe('story:3');
});

it('stops a lineage at an inaccessible parent and drops a cyclic one', () => {
  const rows: Record<string, { parentStoryId?: string | null }> = { a: { parentStoryId: 'b' }, b: { parentStoryId: 'hidden' }, c: { parentStoryId: 'd' }, d: { parentStoryId: 'c' }, e: {} };
  const byId = (id: string) => rows[id] ?? null;
  expect(storyAncestorIds('a', byId)).toEqual(['b']);
  expect(storyAncestorIds('c', byId)).toEqual([]);
  expect(storyAncestorIds('e', byId)).toEqual([]);
});
