import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, type EffectScope } from 'vue';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import { readTimelineReturnPath } from '@/router/storyTarget';
import type { ListPeriod, NavigationContext, Story } from '@/types/database';

const period = (id: string, startDate: string, endDate: string, storyParentId: string | null = null): ListPeriod => ({
  id, label: { fr: id, en: '' }, startDate, endDate, storyParentId, categories: [],
});
let scope: EffectScope, nav: ReturnType<typeof useHomeNavigation>, data: Map<string, Story>;
beforeEach(() => {
  setActivePinia(createPinia());
  data = new Map([
    ['1', storyFixture('1', [period('after', '1900', '2000'), period('before', '1500', '1600')], [], [
      { id: '3', title_fr: 'Troisième phase', anchors: [], atRoot: true, rootDisplayAsPeriod: true },
      { id: '2', title_fr: 'Deuxième phase', anchors: [], atRoot: true, rootDisplayAsPeriod: true },
      { id: '4', title_fr: 'Lien thématique', anchors: [], atRoot: true },
      { id: '5', title_fr: 'Sans dates', anchors: [], atRoot: true, rootDisplayAsPeriod: true },
    ])],
    ['2', storyFixture('2', [period('detail-2', '1620', '1680')])],
    ['3', storyFixture('3', [period('detail-3', '1720', '1780')])],
    ['4', storyFixture('4', [period('thematic', '1550', '1950')])],
    ['5', storyFixture('5')],
  ]);
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([...data.values()].map(story => ({
    ...story, startDate: story.id === '2' ? '1600' : story.id === '3' ? '1700' : story.id === '4' ? '1550' : '',
    endDate: story.id === '2' ? '1700' : story.id === '3' ? '1800' : story.id === '4' ? '1950' : '',
  })));
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async id => {
    const story = data.get(id); if (!story) throw new Error('Not found'); return story;
  });
  scope = effectScope(); nav = scope.run(() => useHomeNavigation())!;
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });
async function move(direction: 'previous' | 'next') {
  nav.navigateAdjacentPeriod(direction);
  await vi.waitFor(() => expect(nav.loading.value).toBe(false));
}

it('crosses native periods and displayed frises in both directions without adding memberships', async () => {
  await nav.openStory('1', { storyId: '1', periodId: 'before' });
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '2' });
  await move('next');
  expect(nav.currentStoryId.value).toBe('2');
  expect(nav.currentPeriod.value).toBeNull();
  expect(nav.currentStoryPeriods.value.map(period => period.id)).toEqual(['detail-2']);
  expect(nav.previousPeriod.value?.id).toBe('before');
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '3' });
  await move('next');
  expect(nav.currentStoryId.value).toBe('3');
  expect(nav.returnPath.value).toHaveLength(1);
  expect(nav.previousPeriod.value).toMatchObject({ linkedStoryId: '2' });
  expect(nav.nextPeriod.value?.id).toBe('after');
  await move('next');
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('after');
  expect(nav.returnPath.value).toEqual([]);
  await move('previous');
  expect(nav.currentStoryId.value).toBe('3');
  await move('previous');
  expect(nav.currentStoryId.value).toBe('2');
  await move('previous');
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('before');
  expect(nav.currentStoryPeriods.value.map(period => period.id).sort()).toEqual(['after', 'before']);
});

it('keeps the actual return position across associated peers and reconstructs their neighbors after reload', async () => {
  await nav.openStory('1', { storyId: '1', periodId: 'before' });
  await move('next'); await move('next');
  const state = { timelineReturnPath: JSON.parse(JSON.stringify(nav.returnPath.value)) };
  const reload = scope.run(() => useHomeNavigation())!;
  await reload.openStory('3', { storyId: '3', view: 'overview', returnPath: readTimelineReturnPath(state) });
  await vi.waitFor(() => expect(reload.previousPeriod.value).toMatchObject({ linkedStoryId: '2' }));
  expect(reload.nextPeriod.value?.id).toBe('after');
  await reload.goBack();
  expect(reload.currentStoryId.value).toBe('1');
  expect(reload.currentPeriod.value?.id).toBe('before');
});

it('also offers source peers after the frise is opened through its ordinary card navigation', async () => {
  await nav.openStory('1', { storyId: '1', view: 'overview' });
  await nav.selectStory('2');
  expect(nav.previousPeriod.value?.id).toBe('before');
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '3' });
  await move('previous');
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('before');
});

it('uses the anchored occurrence at the correct depth and rebuilds ancestors across parent boundaries', async () => {
  const source = data.get('1')!;
  source.periods = [period('parent-a', '1500', '1800'), period('parent-b', '1800', '2100'),
    period('before', '1500', '1600', 'parent-a'), period('after', '1900', '2000', 'parent-b')];
  source.childStories = [source.childStories[1]];
  source.childStories[0].anchors = [{ type: 'period', id: 'parent-a', displayAsPeriod: true }];
  // The same frise is also shown at the root. Its anchored occurrence must be retained.
  await nav.openStory('1', { storyId: '1', periodId: 'before' });
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '2', storyParentId: 'parent-a' });
  await move('next');
  expect(nav.returnPath.value.at(-1)?.anchor).toEqual({ type: 'period', id: 'parent-a' });
  expect(nav.previousPeriod.value?.id).toBe('before');
  expect(nav.nextPeriod.value?.id).toBe('after');
  await move('next');
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('after');
  expect(nav.parentStack.value.map(period => period.id)).toEqual(['parent-b']);
  expect(nav.nextPeriod.value).toBeNull();
  await move('previous');
  expect(nav.currentStoryId.value).toBe('2');
  await nav.goBack();
  expect(nav.currentPeriod.value?.id).toBe('after');
  expect(nav.parentStack.value.map(period => period.id)).toEqual(['parent-b']);
});

it('includes displayed cards in an explicit chronological context without following ordinary links', async () => {
  const source = data.get('1')!;
  const context: NavigationContext = { id: '1', title: source.title, periods: source.periods, presentations: [] };
  source.navigationContexts = [context];
  await nav.openStory('1', { storyId: '1', periodId: 'before', contextId: '1' });
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '2' });
  await move('next'); await move('next'); await move('next');
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('after');
  expect(nav.contextId.value).toBe('1');
});

it('keeps the destination subdivisions local and does not turn a badge-only association into a peer', async () => {
  await nav.openStory('1', { storyId: '1', periodId: 'before' });
  await move('next');
  await nav.handlePeriodClick(nav.currentStoryPeriods.value[0]);
  expect(nav.previousPeriod.value).toBeNull();
  expect(nav.nextPeriod.value).toBeNull();
  await nav.goBack();
  expect(nav.previousPeriod.value?.id).toBe('before');
  expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '3' });
});

it('includes displayed cards when entering directly through another presentation of the source context', async () => {
  const source = data.get('1')!;
  const context: NavigationContext = { id: '1', title: source.title, periods: source.periods,
    presentations: [{ periodId: 'before', storyId: '4', title: { fr: 'Autre vue', en: '' } }] };
  source.navigationContexts = [context];
  data.set('4', { ...storyFixture('4', [period('before', '1500', '1600'),
    period('before-child', '1520', '1550', 'before')]), navigationContexts: [context] });
  let resolveSource!: (source: Story) => void;
  const sourceResponse = new Promise<Story>(resolve => { resolveSource = resolve; });
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(id => id === '1'
    ? sourceResponse : Promise.resolve(data.get(id)!));
  const opening = nav.openStory('4');
  await vi.waitFor(() => expect(StoryApiService.getInstance().getStory).toHaveBeenCalledWith('1', { signal: expect.any(AbortSignal) }));
  expect(nav.loading.value).toBe(true);
  resolveSource(source); await opening;
  expect(nav.currentPeriod.value?.id).toBe('before');
  await vi.waitFor(() => expect(nav.nextPeriod.value).toMatchObject({ linkedStoryId: '2' }));
  await move('next');
  expect(nav.currentStoryId.value).toBe('2');
  expect(nav.previousPeriod.value?.id).toBe('before');
  await move('previous');
  expect(nav.currentStoryId.value).toBe('4');
  expect(nav.currentPeriod.value?.id).toBe('before');
  expect(nav.returnPath.value).toEqual([]);
});

it('preserves outer visits without embedding their histories in the source frame', async () => {
  await nav.openStory('1', { storyId: '1', periodId: 'before', returnPath: [{ storyId: '4', view: 'overview' }] });
  await move('next'); await move('next');
  expect(nav.returnPath.value).toEqual([
    { storyId: '4', view: 'overview' },
    { storyId: '1', periodId: 'before', anchorStoryId: '1' },
  ]);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('before');
  expect(nav.returnPath.value).toEqual([{ storyId: '4', view: 'overview' }]);
});
