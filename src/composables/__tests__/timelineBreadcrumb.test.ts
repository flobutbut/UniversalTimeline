import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';

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
    { id: '3', title: { fr: 'Troisième frise', en: '' }, categories: [] },
  ]);
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async id => storyFixture(id,
    id === '1' ? source : [apiPeriod('other-root', null, 300), apiPeriod('other-leaf', 'other-root', 0, false)]
  , id === '1' ? [event(750), event(250), event(50)] : [event(250), event(50)]));
  nav = scope.run(useHomeNavigation)!;
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

it('opens a leaf in the same frise and restores its parent on return', async () => {
  await descend();
  expect(ids()).toEqual(['story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
  expect(nav.storyBreadcrumb.value[0].title).toBe('Univers Moderne');
  vi.spyOn(StoryApiService.getInstance(), 'getSuggestions').mockResolvedValue([]);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(StoryApiService.getInstance().getSuggestions).not.toHaveBeenCalled();
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledOnce();
  expect(ids()).toEqual(['story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild', 'story:1/period:leaf']);
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('leaf');
  expect(nav.displayedPeriods.value).toEqual([]);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['e50']);
  await nav.goBack();
  expect(ids()).toEqual(['story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
});

it('jumps several levels without duplicating history, restoring scoped children and events', async () => {
  await descend();
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['e50']);
  await nav.navigateToBreadcrumb(0);
  expect(nav.currentPeriod.value?.id).toBe('root'); expect(nav.parentStack.value).toEqual([]);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['child']);
  expect(nav.storyEvents.value.map(e => e.id)).toEqual(['e750', 'e250', 'e50']);
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(nav.parentStack.value.map(p => p.id)).toEqual(['root']);
  await nav.goBack(); expect(nav.currentPeriod.value?.id).toBe('root');
});

it('resets the current frise from its breadcrumb even when it is the only frise visited', async () => {
  await descend();
  await nav.navigateToStoryBreadcrumb(0);
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value).toBeNull();
  expect(nav.parentStack.value).toEqual([]);
  expect(nav.displayedPeriods.value.map(period => period.id)).toEqual(['root']);
  expect(nav.storyEvents.value.map(event => event.id)).toEqual(['e750', 'e250', 'e50']);
  expect(nav.breadcrumb.value).toEqual([]);
  expect(nav.storyBreadcrumb.value.map(story => story.id)).toEqual(['story:1']);
  await nav.navigateToStoryBreadcrumb(0);
  expect(nav.currentPeriod.value).toBeNull();
});

it('keeps the period breadcrumb local and returns to the overview through the parent action', async () => {
  await descend();
  const store = useDataStore();
  store.updatePeriods([...store.periods, { ...store.periods[0], id: 'outside', parentId: 'root' }]);
  await nextTick();
  await nav.navigateToBreadcrumb(0);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['child']);
  await nav.goBack();
  expect(nav.currentPeriod.value).toBeNull(); expect(nav.parentStack.value).toEqual([]);
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['root']);
  expect(ids()).toEqual([]);
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(1);
});

it('discards an associated destination that finishes after a new URL is opened', async () => {
  await descend();
  let resolve!: (value: ReturnType<typeof storyFixture>) => void;
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const pending = nav.selectStory('2');
  expect(nav.loading.value).toBe(true);
  await nav.openStory('1', {storyId:'1',periodId:'root'});
  resolve(storyFixture('2', [apiPeriod('other', null, 100)])); await pending;
  expect(nav.currentStoryId.value).toBe('1'); expect(nav.currentPeriod.value?.id).toBe('root');
  expect(nav.loading.value).toBe(false); expect(nav.error.value).toBeNull();
});

it('describes only the current frise after following an association', async () => {
  await descend(); await nav.selectStory('2');
  expect(ids()).toEqual(['story:2/period:other-root']);
  expect(nav.breadcrumb.value.map(item => item.kind)).toEqual(['period']);
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:2']);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.currentPeriod.value).toBeNull();
  expect(ids()).toEqual([]);
});

it('returns from a root to the frise overview without reopening its default root', async () => {
  await nav.openStory('2'); await nav.goBack();
  expect(nav.currentStoryId.value).toBe('2'); expect(nav.currentPeriod.value).toBeNull();
  expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['other-root']);
  await nav.loadInitialData(undefined,true);
  expect(nav.currentPeriod.value).toBeNull();
});

it('ignores invalid indices and the current position', async () => {
  await descend();
  for (const index of [-1, NaN, 0.5, 3, 999]) await nav.navigateToBreadcrumb(index);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(ids()).toEqual(['story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
});

it('updates path labels after a canonical period edit', async () => {
  await descend(); const store = useDataStore();
  store.updatePeriods(store.periods.map(p => p.id === 'child' ? { ...p, label: { fr: 'Nouveau nom', en: '' } } : p));
  await nextTick();
  expect(nav.breadcrumb.value[1].title).toBe('Nouveau nom');
});

it('keeps a period visible even when its label matches the frise title', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: '1', title: { fr: 'Univers Moderne', en: '' }, categories: [] },
    { id: '2', title: { fr: 'Other-root', en: '' }, categories: [] },
  ] as never);
  await descend(); await nav.selectStory('2');
  expect(ids()).toEqual(['story:2/period:other-root']);
  expect(nav.currentPeriod.value?.id).toBe('other-root');
  await nav.goBack();
  expect(nav.currentPeriod.value).toBeNull();
});

it('keeps only local period ancestors when the associated frise shares the current period', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockImplementation(async id => storyFixture(id,
    id === '1' ? source : [apiPeriod('grandchild', null, 100), apiPeriod('sub', 'grandchild', 80), apiPeriod('sub-leaf', 'sub', 0, false)]
  ));
  await descend(); await nav.selectStory('2', {type:'period',id:'grandchild'});
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);
  expect(ids()).toEqual(['story:2/period:grandchild', 'story:2/period:sub']);
  await nav.navigateToBreadcrumb(0);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(nav.parentStack.value).toEqual([]);
});

it('does not present the editorial parent chain as temporal ancestors on a direct link', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: '1', title: { fr: 'Univers Moderne', en: '' }, categories: [], parentStoryId: null },
    { id: '2', title: { fr: 'Autre frise', en: '' }, categories: [], parentStoryId: '3' },
    { id: '3', title: { fr: 'Parente', en: '' }, categories: [], parentStoryId: null },
  ] as never);
  await nav.openStory('2');
  expect(ids()).toEqual(['story:2/period:other-root']);
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:2']);
  await nav.goBack();
  expect(nav.currentStoryId.value).toBe('2');
  expect(nav.currentPeriod.value).toBeNull();
});

it('keeps the Universe first after a search or a redirect, without reading other frises', async () => {
  await nav.openStory('3', { storyId: '3' });
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:3']);
  expect(StoryApiService.getInstance().getStory).toHaveBeenCalledExactlyOnceWith('3', { signal: expect.any(AbortSignal) });
  expect(nav.returnPath.value).toEqual([]);
  await nav.openStory('2', { storyId: '2' });
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:3', 'story:2']);
  await nav.navigateToStoryBreadcrumb(0);
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
});

it('does not add an Universe the reader cannot open', async () => {
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([{ id: '2', title: { fr: 'Autre frise', en: '' }, categories: [] }] as never);
  await nav.openStory('2', { storyId: '2' });
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:2']);
});

it('returns through the visited-frise breadcrumb to the exact period left behind', async () => {
  await descend(); await nav.selectStory('2');
  await nav.navigateToStoryBreadcrumb(0);
  expect(nav.currentStoryId.value).toBe('1');
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
  expect(ids()).toEqual(['story:1/period:root', 'story:1/period:child', 'story:1/period:grandchild']);
});

it('treats reopening an associated frise as a return, truncating rather than duplicating it', async () => {
  await descend(); await nav.selectStory('2'); await nav.selectStory('3');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:2', 'story:3']);
  await nav.selectStory('2', { type: 'period', id: 'leaf' });
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:2']);
  expect(nav.currentPeriod.value?.id).toBe('other-root');
  await nav.selectStory('1');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
  expect(nav.currentPeriod.value?.id).toBe('grandchild');
});

it('remembers a frise overview without reopening its single root', async () => {
  await nav.openStory('1', { storyId: '1', view: 'overview' });
  await nav.selectStory('2'); await nav.selectStory('1');
  expect(nav.currentPeriod.value).toBeNull();
  expect(nav.breadcrumb.value).toEqual([]);
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
});

it('records same-frise movements only once and truncates on a browser-history destination', async () => {
  await descend(); await nav.goBack(); await nav.selectStory('2');
  await nav.openStory('1', { storyId: '1', periodId: 'root' });
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
  expect(nav.currentPeriod.value?.id).toBe('root');
  await nav.selectStory('2'); await nav.navigateToStoryBreadcrumb(0);
  expect(nav.currentPeriod.value?.id).toBe('root');
});

it('never adds failed or superseded loads to the visited path', async () => {
  await descend();
  vi.mocked(StoryApiService.getInstance().getStory).mockRejectedValueOnce(new Error('Indisponible'));
  await nav.selectStory('2');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
  let resolve!: (value: ReturnType<typeof storyFixture>) => void;
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const pending = nav.openStory('3');
  await nav.openStory('1', { storyId: '1', periodId: 'root' });
  resolve(storyFixture('3')); await pending;
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1']);
});

it('ignores invalid visited-path indices and the current frise', async () => {
  await descend(); await nav.selectStory('2');
  for (const index of [-1, NaN, 0.5, 1, 99]) await nav.navigateToStoryBreadcrumb(index);
  expect(nav.currentStoryId.value).toBe('2');
  expect(nav.storyBreadcrumb.value.map(item => item.id)).toEqual(['story:1', 'story:2']);
});

it('keeps root redirects first, then visible period anchors, excluding event-only links', async () => {
  const story = storyFixture('1', source, [event(750)]);
  story.childStories = [
    { id: '2', title: { fr: 'Période visible', en: '' }, anchors: [{ type: 'period', id: 'root' }] },
    { id: '3', title: { fr: 'Événement', en: '' }, anchors: [{ type: 'event', id: 'e750' }] },
    { id: '4', title: { fr: 'Racine', en: '' }, anchors: [], atRoot: true },
    { id: '5', title: { fr: 'Période masquée', en: '' }, anchors: [{ type: 'period', id: 'leaf' }] },
    { id: '6', title: { fr: 'Racine affichée comme période', en: '' }, anchors: [], atRoot: true, rootDisplayAsPeriod: true },
    { id: '7', title: { fr: 'Frise affichée comme période', en: '' }, anchors: [{ type: 'period', id: 'root', displayAsPeriod: true }] },
  ];
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(story);
  await nav.loadInitialData(undefined, true);
  expect(nav.headerStories.value.map(link => ({ id: link.id, anchor: link.anchor }))).toEqual([
    { id: '4', anchor: undefined },
    { id: '6', anchor: undefined },
    { id: '2', anchor: { type: 'period', id: 'root' } },
    { id: '7', anchor: { type: 'period', id: 'root' } },
  ]);
});
