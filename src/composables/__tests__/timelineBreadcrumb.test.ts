import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { EventApiService } from '@/services/EventApiService';
import type { StorySuggestion } from '@/types/database';

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
  vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockImplementation(async id => (
    id === '1' ? source : [apiPeriod('other-root', null, 300), apiPeriod('other-leaf', 'other-root', 0, false)]
  ) as never[]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([event(750), event(250), event(50)]);
  nav = scope.run(useHomeNavigation)!;
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('builds the path from the story and all committed ancestors, excluding a merely clicked leaf', async () => {
  await descend();
  expect(ids()).toEqual(['story:1', 'period:root', 'period:child', 'period:grandchild']);
  expect(nav.breadcrumb.value[0].title).toBe('Univers Moderne');
  vi.spyOn(StoryApiService.getInstance(), 'getSuggestions').mockResolvedValue([]);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(ids()).toEqual(['story:1', 'period:root', 'period:child', 'period:grandchild']);
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
  expect(StoryApiService.getInstance().getStoryPeriods).toHaveBeenCalledTimes(1);
});

it('cancels a pending leaf request when an ancestor is chosen', async () => {
  await descend();
  let resolve!: (value: StorySuggestion[]) => void;
  vi.spyOn(StoryApiService.getInstance(), 'getSuggestions').mockReturnValue(new Promise(yes => { resolve = yes; }));
  const pending = nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(nav.loading.value).toBe(true);
  await nav.navigateToBreadcrumb(1);
  resolve([{ id: '2', title: { fr: 'Autre frise', en: '' } }]); await pending;
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('root');
  expect(nav.loading.value).toBe(false); expect(nav.storySuggestions.value).toEqual([]);
});

it('preserves nested story navigation and restores the ancestor story’s period snapshot', async () => {
  await descend(); await nav.selectStory('2');
  expect(ids()).toEqual(['story:1', 'story:2', 'period:other-root']);
  await nav.navigateToBreadcrumb(0);
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['root', 'child']);
  expect(ids()).toEqual(['story:1', 'period:root', 'period:child', 'period:grandchild']);
});

it('can reset only the current story overview while keeping its ancestor story', async () => {
  await descend(); await nav.selectStory('2'); await nav.navigateToBreadcrumb(1);
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.currentPeriod.value).toBeNull();
  expect(ids()).toEqual(['story:1', 'story:2']);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('grandchild');
});

it('ignores invalid indices and the current position', async () => {
  await descend();
  for (const index of [-1, NaN, 0.5, 3, 999]) await nav.navigateToBreadcrumb(index);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(ids()).toEqual(['story:1', 'period:root', 'period:child', 'period:grandchild']);
});

it('updates path labels after a canonical period edit', async () => {
  await descend(); const store = useDataStore();
  store.updatePeriods(store.periods.map(p => p.id === 'child' ? { ...p, label: { fr: 'Nouveau nom', en: '' } } : p));
  await nextTick();
  expect(nav.breadcrumb.value[2].title).toBe('Nouveau nom');
});
