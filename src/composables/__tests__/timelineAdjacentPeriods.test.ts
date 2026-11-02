import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';

const period = (id: string, parent: string | null, start: number, end: number) => ({
  id, label_fr: id, parent_id: parent, start_date: `M${start}`, end_date: `M${end}`,
});
let scope: EffectScope;
let nav: ReturnType<typeof useHomeNavigation>;
beforeEach(async () => {
  setActivePinia(createPinia());
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(storyFixture('1', [
    // Deliberately unsorted; navigation follows dates and frise placement.
    period('mesozoic', null, 252, 66),
    period('cretaceous', 'mesozoic', 145, 66),
    period('paleozoic', null, 541, 252),
    period('triassic', 'mesozoic', 252, 201),
    { ...period('jurassic', 'catalogue-parent', 201, 145), story_parent_id: 'mesozoic' },
    period('permian', 'paleozoic', 299, 252),
    period('cretaceous-child', 'cretaceous', 145, 100),
    { id: 'undated', label_fr: 'undated', parent_id: 'mesozoic' },
  ], [
    { id: 'jurassic-event', label_fr: 'Jurassic event', date: 'M180' },
    { id: 'cretaceous-event', label_fr: 'Cretaceous event', date: 'M100' },
  ]));
  scope = effectScope();
  nav = scope.run(useHomeNavigation)!;
  await nav.loadInitialData({ parentStackIds: ['mesozoic'], currentPeriodId: 'cretaceous' });
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('moves toward the past at the same depth, including leaves, without opening another story', () => {
  expect(nav.nextPeriod.value).toBeNull();
  expect(nav.previousPeriod.value?.id).toBe('jurassic');
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('jurassic');
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['mesozoic']);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['jurassic-event']);
  expect(nav.displayedPeriods.value).toEqual([]);
  expect(nav.breadcrumb.value.at(-1)?.title).toBe('jurassic');
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('triassic');
  expect(nav.currentStoryId.value).toBe('1');
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(1);
});

it('rebuilds the ancestor path when crossing a parent boundary and returns to that parent', async () => {
  nav.navigateAdjacentPeriod('previous');
  nav.navigateAdjacentPeriod('previous');
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('permian');
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['paleozoic']);
  expect(nav.previousPeriod.value).toBeNull();
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('permian');
  await nav.goBack();
  expect(nav.currentPeriod.value?.id).toBe('paleozoic');
});

it('moves forward, refreshes children and events, without following an associated frise', () => {
  nav.navigateAdjacentPeriod('previous');
  nav.navigateAdjacentPeriod('next');
  expect(nav.currentPeriod.value?.id).toBe('cretaceous');
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['cretaceous-child']);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['cretaceous-event']);
  nav.navigateAdjacentPeriod('next');
  expect(nav.currentPeriod.value?.id).toBe('cretaceous');
});

it('supports root periods and disables navigation from the overview or while loading', async () => {
  nav.loading.value = true;
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('cretaceous');
  nav.loading.value = false;
  await nav.goBack();
  expect(nav.previousPeriod.value?.id).toBe('paleozoic');
  nav.navigateAdjacentPeriod('previous');
  expect(nav.currentPeriod.value?.id).toBe('paleozoic');
  expect(nav.parentStack.value).toEqual([]);
  await nav.goBack();
  expect(nav.currentPeriod.value).toBeNull();
  expect(nav.previousPeriod.value).toBeNull();
  expect(nav.nextPeriod.value).toBeNull();
});
