import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { defineComponent, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import AssociatedStoriesBadge from '@/views/HomeView/AssociatedStoriesBadge.vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import HomeView from '@/views/HomeView.vue';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story, ChildStorySummary, StorySuggestion } from '@/types/database';

const suggestion = (id: string): StorySuggestion => ({ id, title: { fr: `Frise ${id}`, en: '' }, parentStoryId: 'one' });
const props = { storyId: 'one', periodId: 'leaf', periodLabel: 'Période enfant', stories: [suggestion('child')], loading: false, error: null, disabled: false };
const root = { id: 'parent', label: { fr: 'Période parente', en: '' }, hasChildren: true, startDate: 'M65', endDate: 'NOW', categories: [] };
const leaf = { ...root, id: 'leaf', label: { fr: 'Période enfant', en: '' }, hasChildren: false };
const linked = (id: string, periodId = 'leaf'): ChildStorySummary => ({ id, title: { fr: `Frise ${id}`, en: '' }, anchors: [{ type: 'period', id: periodId }] });
// Like the API, a frise detail contains the periods its children are anchored to.
const anchoredPeriods = (childStories: ChildStorySummary[]) => [...new Set(childStories.flatMap(child => child.anchors.filter(anchor => anchor.type === 'period').map(anchor => anchor.id)))]
  .map(periodId => ({ ...leaf, id: periodId })) as unknown as Story['periods'];
const detail = (id: string, childStories: ChildStorySummary[] = []): Story => ({ id, title: { fr: `Frise ${id}`, en: '' }, author: '', isPublic: true, categories: [], periods: anchoredPeriods(childStories), events: [], childStories });
const gridProps = { periods: [leaf, { ...leaf, id: 'other' }], events: [], currentStoryId: 'one', currentPeriod: root, parentPeriod: null, storySuggestions: [], loading: false };
let view: ReturnType<typeof mount>;
const body = () => new DOMWrapper(document.body);
const badge = () => view.get('.associated-stories__badge');
const settle = async () => { await vi.advanceTimersByTimeAsync(0); await flushPromises(); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(detail('one', [linked('child')]));
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

it('places a text badge only on linked child periods and reads associations once for the whole frise', async () => {
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(detail('one', [linked('child'), linked('child')]));
  view = mount(PeriodGrid, { props: gridProps, attachTo: document.body }); await settle();
  expect(api).toHaveBeenCalledExactlyOnceWith('one', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(view.get('.period-card--parent').find('.associated-stories__badge').exists()).toBe(false);
  expect(view.get('[data-period-id="other"]').find('.associated-stories__badge').exists()).toBe(false);
  expect(view.get('[data-period-id="leaf"]').get('.associated-stories__badge').text()).toBe('1 frise');
  expect(badge().find('svg').exists()).toBe(false);
  expect(badge().element.closest('[role="button"]')).toBeNull();
  await badge().trigger('click'); await flushPromises();
  expect(body().get('[role="dialog"]').text()).toContain('Frise child');
  expect(view.emitted('period-click')).toBeUndefined(); expect(view.emitted('go-back')).toBeUndefined();
  await body().get('.associated-stories__item').trigger('click');
  expect(view.emitted('story-select')).toEqual([['child']]); expect(body().find('[role="dialog"]').exists()).toBe(false);
  await view.get('button[aria-label="Période enfant"]').trigger('click');
  expect(view.emitted('period-click')).toEqual([[leaf]]);
  await view.setProps({ periods: [{ ...leaf, id: 'deeper' }] }); await settle();
  expect(api).toHaveBeenCalledOnce();
});

it('shows plural labels, and hides both zero-count and initially loading badges', async () => {
  view = mount(AssociatedStoriesBadge, { props: { ...props, stories: [] } });
  expect(view.find('.associated-stories').exists()).toBe(false);
  await view.setProps({ loading: true }); expect(view.find('button').exists()).toBe(false);
  await view.setProps({ loading: false, stories: [suggestion('a'), suggestion('b')] });
  expect(badge().text()).toBe('2 frises');
  await view.setProps({ stories: [] }); expect(view.find('button').exists()).toBe(false);
});

it('closes on Escape or outside click and restores focus to the badge', async () => {
  view = mount(AssociatedStoriesBadge, { props, attachTo: document.body });
  await badge().trigger('click'); await flushPromises();
  await body().get('[role="dialog"]').trigger('keydown', { key: 'Escape' }); await flushPromises();
  expect(body().find('[role="dialog"]').exists()).toBe(false); expect(document.activeElement).toBe(badge().element);
  await badge().trigger('click'); await flushPromises(); await body().get('.associated-stories__backdrop').trigger('click'); await flushPromises();
  expect(badge().attributes('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(badge().element);
});

it('distinguishes a metadata error from no associations and retries the shared read', async () => {
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockRejectedValueOnce(new Error('Frises indisponibles')).mockResolvedValueOnce(detail('one'));
  view = mount(PeriodGrid, { props: { ...gridProps, periods: [leaf] }, attachTo: document.body }); await settle();
  expect(badge().text()).toBe('Frises indisponibles');
  await badge().trigger('click'); await flushPromises();
  expect(body().get('[role="alert"]').text()).toContain('Frises indisponibles');
  await body().get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(api).toHaveBeenCalledTimes(2); expect(view.find('.associated-stories__badge').exists()).toBe(false);
  expect(body().find('[role="dialog"]').exists()).toBe(false);
});

it.each(['story', 'unmount'] as const)('aborts an obsolete metadata read after %s changes', async context => {
  const pending = deferred<Story>();
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise).mockResolvedValue(detail('two'));
  view = mount(PeriodGrid, { props: gridProps, attachTo: document.body }); await settle();
  const signal = api.mock.calls[0][1]!.signal!;
  if (context === 'story') await view.setProps({ currentStoryId: 'two' }); else view.unmount();
  expect(signal.aborted).toBe(true); pending.resolve(detail('one', [linked('old')])); await settle();
  expect(body().find('[role="dialog"]').exists()).toBe(false);
  if (context !== 'unmount') expect(view.find('.associated-stories__badge').exists()).toBe(false);
});

it('does not attach an event anchor or an unanchored child story to a period', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(detail('one', [{ ...linked('event'), anchors: [{ type: 'event', id: 'leaf' }] }, { ...linked('unanchored'), anchors: [] }]));
  view = mount(PeriodGrid, { props: gridProps }); await settle();
  expect(view.find('.associated-stories__badge').exists()).toBe(false);
});

it('opens a frise from a child card and restores the original exploration with the breadcrumb', async () => {
  const api = StoryApiService.getInstance();
  const sourcePeriod = (id: string, parentId: string | null, hasChildren: boolean) => ({ id, parent_id: parentId, label_fr: id, start_date: 'M65', end_date: 'NOW', has_children: hasChildren });
  vi.spyOn(api, 'getListStories').mockResolvedValue([detail('1'), detail('2')]);
  vi.spyOn(api, 'getStoryPeriods').mockImplementation(async id => [sourcePeriod(`root-${id}`, null, true), sourcePeriod(`leaf-${id}`, `root-${id}`, false)]);
  vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([]);
  vi.mocked(api.getStory).mockImplementation(async id => detail(id, id === '1' ? [linked('2', 'leaf-1')] : []));
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/timeline', name: 'timeline', component: HomeView }] });
  await router.push('/timeline'); await router.isReady();
  view = mount(HomeView, { attachTo: document.body, global: { plugins: [createPinia(), router] } });
  await flushPromises(); await settle();
  expect(view.getComponent(StoryBreadcrumb).text()).toContain('Frise 1'); expect(badge().text()).toBe('1 frise');
  await badge().trigger('click'); await flushPromises(); await body().get('.associated-stories__item').trigger('click'); await flushPromises(); await settle();
  expect(view.getComponent(StoryBreadcrumb).text()).toContain('Frise 2');
  expect(view.get('.period-card--parent').attributes('data-period-id')).toBe('root-2');
  await view.getComponent(StoryBreadcrumb).findAll('button')[0].trigger('click'); await flushPromises(); await settle();
  expect(view.get('.period-card--parent').attributes('data-period-id')).toBe('root-1'); expect(badge().text()).toBe('1 frise');
  router.options.history.destroy();
});


it('aborts the shared read when cached and closes child-card overlays on deactivation', async () => {
  const pending = deferred<Story>();
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise).mockResolvedValue(detail('one', [linked('new')]));
  view = mount(defineComponent({ components: { PeriodGrid }, setup: () => ({ visible: ref(true), props: gridProps }), template: '<button class="toggle" @click="visible = !visible">Changer</button><KeepAlive><PeriodGrid v-if="visible" v-bind="props" /></KeepAlive>' }), { attachTo: document.body });
  await settle(); const signal = api.mock.calls[0][1]!.signal!;
  await view.get('.toggle').trigger('click'); expect(signal.aborted).toBe(true);
  pending.resolve(detail('one', [linked('old')])); await settle();
  await view.get('.toggle').trigger('click'); await settle();
  expect(badge().text()).toBe('1 frise');
  await badge().trigger('click'); await flushPromises(); expect(body().find('[role="dialog"]').exists()).toBe(true);
  await view.get('.toggle').trigger('click'); await flushPromises(); expect(body().find('[role="dialog"]').exists()).toBe(false);
});


it.each([true, false])('offers direct root associations on the mother period (children displayed: %s)', async showChildren => {
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(detail('one', [linked('root-link', root.id)]));
  view = mount(PeriodGrid, { props: { ...gridProps, periods: showChildren ? [leaf] : [] }, attachTo: document.body }); await settle();
  const parent = view.get('.period-card--parent');
  expect(parent.get('.associated-stories__badge').text()).toBe('1 frise');
  await parent.get('.associated-stories__badge').trigger('click'); await flushPromises();
  expect(body().get('[role="dialog"]').text()).toContain('Frise root-link');
  expect(view.emitted('go-back')).toBeUndefined(); expect(view.emitted('period-click')).toBeUndefined();
  await body().get('.associated-stories__item').trigger('click');
  expect(view.emitted('story-select')).toEqual([['root-link']]);
  expect(api).toHaveBeenCalledOnce();
});

it('offers unanchored frise-level links at the frise root without attaching them to descendants or mixing event links', async () => {
  const source = detail('one', [{ ...linked('global'), anchors: [] }, { ...linked('event-link'), anchors: [{ type: 'event', id: root.id }] }]);
  source.periods = [
    { ...root, parentId: 'outside-frise', hasParent: true, children: [leaf.id], temporalLocation: '' },
    { ...leaf, parentId: root.id, hasParent: true, children: [], temporalLocation: '' },
  ];
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(source);
  view = mount(PeriodGrid, { props: gridProps, attachTo: document.body }); await settle();
  expect(view.get('.period-card--parent').get('.associated-stories__badge').text()).toBe('1 frise');
  expect(view.get('[data-period-id="leaf"]').find('.associated-stories__badge').exists()).toBe(false);
  await badge().trigger('click'); await flushPromises();
  expect(body().get('[role="dialog"]').text()).toContain('Frise global');
  expect(body().get('[role="dialog"]').text()).not.toContain('Frise event-link');
});

it('shows a child anchored on a period that left the frise at frise level instead of hiding it', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue({ ...detail('one'), periods: [root] as unknown as Story['periods'], childStories: [linked('stale', 'removed-period')] });
  view = mount(PeriodGrid, { props: { ...gridProps, periods: [] }, attachTo: document.body }); await settle();
  expect(view.get('.period-card--parent .associated-stories__badge').text()).toBe('1 frise');
});
