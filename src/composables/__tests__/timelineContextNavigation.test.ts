import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import type { ListPeriod, NavigationContext } from '@/types/database';
import { contextPeriodNeighbors } from '@/lib/timelineNavigation';
import { useDataStore } from '@/stores/useDataStore';

const p = (id: string, start: string, end = 'TODAY'): ListPeriod => ({ id, label: { fr: id, en: '' }, startDate: start, endDate: end, categories: [], storyParentId: null });
const periods = [p('antiquity','-3200-01-01','0476-09-04'),p('medieval','0476-09-04','1492-10-12'),p('modern','1492-10-12','1789-01-01'),p('contemporary','1789-01-01')];
let context: NavigationContext;
let scope: EffectScope;
let nav: ReturnType<typeof useHomeNavigation>;
let getStory: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  setActivePinia(createPinia());
  context = { id: '50', title: { fr: 'Parcours historique', en: '' }, periods: [...periods], presentations: periods.map((p,i) => ({ periodId: p.id, storyId: ['10','15','16','16'][i], title: { fr: p.id, en: '' } })) };
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue(['10','15','16','50'].map(id => ({ id, title: {fr:id,en:''}, categories:[] })) as never);
  getStory = vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async id => {
    const content = id === '50' ? context.periods : id === '15' ? [periods[1],{...p('late','1301'),storyParentId:'medieval'}] : id === '10' ? [{...p('holocene','-9700-01-01')},{...periods[0],storyParentId:'holocene'}] : [periods[2],periods[3]];
    return { ...storyFixture(id), periods: content, navigationContexts: [context] } as never;
  });
  scope = effectScope(); nav = scope.run(() => useHomeNavigation())!;
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('finds external neighbors on a direct medieval link and opens a nested antiquity period', async () => {
  await nav.openStory('15');
  expect(nav.currentPeriod.value?.id).toBe('medieval');
  expect(nav.previousPeriod.value?.id).toBe('antiquity');
  expect(nav.nextPeriod.value?.id).toBe('modern');
  await nav.navigateAdjacentPeriod('previous');
  // No router callback: contextual navigation still performs the complete load.
  await vi.waitFor(() => expect(nav.currentPeriod.value?.id).toBe('antiquity'));
  expect(nav.currentStoryId.value).toBe('10');
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['holocene']);
  expect(nav.breadcrumb.value.map(c => c.title)).not.toContain('15');
});

it('opens modern and contemporary as two different periods inside the same frise, including leaves', async () => {
  await nav.openStory('15'); nav.navigateAdjacentPeriod('next');
  await vi.waitFor(() => expect(nav.currentPeriod.value?.id).toBe('modern'));
  nav.navigateAdjacentPeriod('next');
  await vi.waitFor(() => expect(nav.currentPeriod.value?.id).toBe('contemporary'));
  expect(nav.currentStoryId.value).toBe('16');
  expect(nav.nextPeriod.value).toBeNull();
});

it('recalculates neighbors after Renaissance is added without changing existing mappings', async () => {
  expect(contextPeriodNeighbors(context,'medieval').next?.period.id).toBe('modern');
  context.periods.push(p('renaissance','1400','1650'));
  expect(contextPeriodNeighbors(context,'medieval').next?.period.id).toBe('renaissance');
  expect(contextPeriodNeighbors(context,'renaissance').next?.period.id).toBe('modern');
  await nav.openStory('15'); nav.navigateAdjacentPeriod('next');
  await vi.waitFor(() => expect(nav.currentPeriod.value?.id).toBe('renaissance'));
  expect(nav.currentStoryId.value).toBe('50');
});

it('keeps subdivision navigation local, and revalidates a context after a cache invalidation', async () => {
  await nav.openStory('15',{storyId:'15',contextId:'50',periodId:'late'});
  expect(nav.currentPeriod.value?.id).toBe('late');
  expect(nav.previousPeriod.value).toBeNull();
  expect(nav.nextPeriod.value).toBeNull();
  context.periods.push(p('renaissance','1400','1650'));
  useDataStore().invalidateStories();
  await nav.openStory('15');
  expect(nav.nextPeriod.value?.id).toBe('renaissance');
});

it('asks for a presentation when several explicit views exist instead of choosing one arbitrarily', async () => {
  context.presentations.push({periodId:'modern',storyId:'10',title:{fr:'Autre vue',en:''}});
  await nav.openStory('15'); nav.navigateAdjacentPeriod('next');
  expect(nav.navigationChoices.value).toHaveLength(2);
  expect(nav.currentStoryId.value).toBe('15');
  expect(getStory).toHaveBeenCalledTimes(1);
});

it('rejects inaccessible contexts and periods missing from the requested view', async () => {
  await nav.openStory('15',{storyId:'15',contextId:'999',periodId:'medieval'});
  expect(nav.error.value).toMatch(/parcours/);
  await nav.openStory('15',{storyId:'15',contextId:'50',periodId:'missing'});
  expect(nav.error.value).toMatch(/période/);
});

it('returns from a detail root to its context without reopening the default subject in a loop', async () => {
  const navigate = vi.fn();
  const routed = scope.run(() => useHomeNavigation(navigate))!;
  await routed.openStory('10',{storyId:'10',contextId:'50',periodId:'holocene'});
  await routed.goBack();
  expect(navigate).toHaveBeenCalledWith({storyId:'50',contextId:'50',view:'overview'});
});

it('requires explicit frise selection for a leaf in the reference frise', async () => {
  const navigate = vi.fn();
  const routed = scope.run(() => useHomeNavigation(navigate))!;
  await routed.openStory('50');
  await routed.handlePeriodClick(periods[1]);
  expect(navigate).not.toHaveBeenCalled();
  await routed.selectStory('15',{type:'period',id:periods[1].id});
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({storyId:'15',periodId:'medieval',contextId:'50'}));
});
