import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import EventCard from '@/views/HomeView/EventCard.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';

const event = (id: string) => ({ id, label: { fr: id, en: '' }, date: 'M40', categories: [] });
const props = { periods: [{ id: 'p', label: { fr: 'p', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [] }], events: [event('a'), event('b')], currentStoryId: 'one', parentPeriod: null, currentPeriod: null, loading: false };
const snapshot = () => storyFixture('one', props.periods, props.events);
const withChild = (eventId = 'a') => ({ ...snapshot(), events: [...props.events, event(eventId)], childStories: [{ id: 'child', title: { fr: 'child', en: '' }, anchors: [{ type: 'event' as const, id: eventId }] }] });
const related = (id: string, title = id, eventIds = ['a']) => ({ id, title: { fr: title, en: '' }, periodIds: [], eventIds });
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(snapshot());
  vi.spyOn(StoryApiService.getInstance(), 'getMemberships');
  vi.spyOn(StoryApiService.getInstance(), 'getSuggestions');
});
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function settle() { await vi.advanceTimersByTimeAsync(0); await flushPromises(); }
async function select(index: number) { await view.findAllComponents(EventCard)[index].get('.event-dot').trigger('click'); await settle(); }

it('distinguishes a snapshot failure from no links and retries for the selected event', async () => {
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockRejectedValueOnce(new Error('Frises indisponibles')).mockResolvedValueOnce(withChild());
  view = mount(PeriodGrid, { props }); await select(0);
  const card = view.getComponent(EventCard);
  expect(card.get('[role="alert"]').text()).toContain('Frises indisponibles');
  await card.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(card.find('[role="alert"]').exists()).toBe(false);
  expect(card.props('storySuggestions').map((story: { id: string }) => story.id)).toEqual(['child']);
  expect(api).toHaveBeenCalledTimes(2);
});

it('shares the pending snapshot across selections without event API calls', async () => {
  const pending = deferred<ReturnType<typeof snapshot>>();
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise);
  view = mount(PeriodGrid, { props }); await select(0); await select(1);
  expect(api).toHaveBeenCalledOnce();
  pending.resolve(withChild()); await flushPromises();
  expect(view.findAllComponents(EventCard)[1].props('storySuggestions')).toEqual([]);
  expect(view.find('[role="status"]').exists()).toBe(false);
  expect(StoryApiService.getInstance().getSuggestions).not.toHaveBeenCalled();
  expect(StoryApiService.getInstance().getMemberships).not.toHaveBeenCalled();
});

it.each(['story', 'period', 'removed', 'unmount'] as const)('does not reopen event links after %s changes the context', async context => {
  const pending = deferred<ReturnType<typeof snapshot>>();
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise);
  view = mount(PeriodGrid, { props }); await select(0);
  const signal = api.mock.calls[0][1]!.signal!;
  if (context === 'story') await view.setProps({ currentStoryId: 'two' });
  if (context === 'period') await view.setProps({ currentPeriod: props.periods[0] });
  if (context === 'removed') await view.setProps({ events: [] });
  if (context === 'unmount') view.unmount();
  if (context === 'story' || context === 'unmount') expect(signal.aborted).toBe(true);
  pending.resolve(withChild()); await settle();
  if (context !== 'unmount') expect(view.find('.event-stories').exists()).toBe(false);
});

it('closes a selected event when cached and ignores the obsolete response', async () => {
  const pending = deferred<ReturnType<typeof snapshot>>();
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise);
  view = mount(defineComponent({ components: { PeriodGrid }, setup: () => ({ visible: ref(true), props }), template: '<button @click="visible = !visible">Changer</button><KeepAlive><PeriodGrid v-if="visible" v-bind="props" /></KeepAlive>' }));
  await select(0); await view.get('button').trigger('click');
  expect(api.mock.calls[0][1]!.signal!.aborted).toBe(true);
  pending.resolve(withChild()); await flushPromises(); await view.get('button').trigger('click'); await settle();
  expect(view.find('.event-stories').exists()).toBe(false);
});

it('keeps undated event details, retry and child links accessible outside the dated axis', async () => {
  const api = vi.mocked(StoryApiService.getInstance().getStory).mockRejectedValueOnce(new Error('Indisponible')).mockResolvedValueOnce(withChild('undated'));
  view = mount(PeriodGrid, { props: { ...props, events: [{ ...event('undated'), date: 'unknown' }] } });
  expect(view.text()).toContain('Événements sans date déterminée');
  const card = view.getComponent(EventCard); await card.get('.event-undated-trigger').trigger('click'); await settle();
  expect(card.get('[role="alert"]').text()).toContain('Indisponible');
  await card.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(api).toHaveBeenCalledTimes(2);
  expect(card.props('storySuggestions').map((story: { id: string }) => story.id)).toEqual(['child']);
  expect(card.attributes('style') ?? '').not.toContain('left:');
});

it('offers shared frises after anchored children, without duplicates or the current one', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue({ ...withChild(), relatedStories: [related('one'), related('child'), related('z', 'Zèbre'), related('b', 'Biologie')] });
  view = mount(PeriodGrid, { props }); await select(0);
  const card = view.getComponent(EventCard);
  expect(card.props('storySuggestions').map((story: { id: string }) => story.id)).toEqual(['child', 'b', 'z']);
  expect(card.findAll('.event-story-item').map(item => item.text())).toEqual(['child', 'Biologie', 'Zèbre']);
  await card.findAll('.event-story-item')[1].trigger('click'); expect(view.emitted('story-select')).toEqual([['b', {type:'event', id:'a'}]]);
});

it('shows nothing for an event with no other associated frise', async () => {
  view = mount(PeriodGrid, { props }); await select(0);
  expect(view.getComponent(EventCard).find('.event-stories').exists()).toBe(false);
  expect(view.getComponent(EventCard).text()).not.toMatch(/Aucune frise|Chargement des frises/);
});

it('loads event links even in a frise with no periods', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValue(withChild());
  view = mount(PeriodGrid, { props: { ...props, periods: [] } }); await select(0);
  expect(view.getComponent(EventCard).find('.event-stories').exists()).toBe(true);
});

it('keeps counts unknown until the snapshot completes, then uses plural labels', async () => {
  const pending = deferred<ReturnType<typeof snapshot>>();
  vi.mocked(StoryApiService.getInstance().getStory).mockReturnValueOnce(pending.promise);
  view = mount(PeriodGrid, { props }); await settle();
  const [a, b] = view.findAllComponents(EventCard); expect(a.props('otherStoryCount')).toBeNull();
  pending.resolve({ ...snapshot(), relatedStories: [related('two'), related('three')] }); await flushPromises();
  expect(a.get('.event-meta').text()).toBe('2 autres frises associées'); expect(b.props('otherStoryCount')).toBe(0);
  await select(0); expect(view.getComponent(EventCard).text()).not.toContain('2 autres frises associées');
});

it('uses the singular and keeps counts unknown after a failed snapshot', async () => {
  vi.mocked(StoryApiService.getInstance().getStory).mockResolvedValueOnce({ ...snapshot(), relatedStories: [related('two')] });
  view = mount(PeriodGrid, { props }); await settle();
  expect(view.getComponent(EventCard).get('.event-meta').text()).toBe('1 autre frise associée'); view.unmount();
  vi.mocked(StoryApiService.getInstance().getStory).mockRejectedValueOnce(new Error('Indisponible'));
  view = mount(PeriodGrid, { props }); await settle();
  expect(view.findAllComponents(EventCard).map(card => card.props('otherStoryCount'))).toEqual([null, null]);
});

it('shows a short description on hover and the full text once selected', async () => {
  const card = mount(EventCard, { props: {
    event: { ...event('a'), description: { fr: '  Longue description  ', en: '' } },
    isSelected: false, isCategoryActive: false, cardStyle: { width: '0', left: '0' },
  } });
  expect(card.get('.event-description').text()).toBe('Longue description');
  expect(card.get('.event-description').classes()).toContain('event-description--clamped');
  await card.setProps({ isSelected: true });
  expect(card.get('.event-description').classes()).not.toContain('event-description--clamped');
  await card.setProps({ event: { ...event('a'), description: { fr: ' ', en: '' } } });
  expect(card.find('.event-description').exists()).toBe(false);
  card.unmount();
});

it('opens by default only the compact tooltips that fit side by side', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 20));
  view = mount(PeriodGrid, { props: { ...props, events: [event('a'), event('b'), { ...event('c'), date: 'M10' }] } });
  await settle();
  const open = view.findAllComponents(EventCard).filter(card => card.classes('is-default-open')).map(card => card.props('event').id);
  expect(open).toEqual(['a', 'c']);
  expect(view.findAllComponents(EventCard)).toHaveLength(3);
});

it('closes the pinned tooltip next to a hovered event, and reopens it afterwards', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 20));
  view = mount(PeriodGrid, { props: { ...props, events: [event('a'), { ...event('b'), date: 'M39' }, { ...event('c'), date: 'M10' }] } });
  await settle();
  const open = () => view.findAllComponents(EventCard).filter(card => card.classes('is-default-open')).map(card => card.props('event').id);
  expect(open()).toEqual(['a', 'c']);
  await view.findAllComponents(EventCard)[1].get('.event-dot').trigger('mouseenter');
  expect(open()).toEqual(['c']);
  await view.findAllComponents(EventCard)[1].get('.event-dot').trigger('mouseleave');
  // Réouverture différée : passer à un point voisin ne fait pas clignoter le tooltip figé.
  await vi.advanceTimersByTimeAsync(100);
  expect(open()).toEqual(['c']);
  await view.findAllComponents(EventCard)[0].get('.event-dot').trigger('mouseenter');
  await vi.advanceTimersByTimeAsync(300);
  expect(open()).toEqual(['a', 'c']);
  await view.findAllComponents(EventCard)[0].get('.event-dot').trigger('mouseleave');
  await vi.advanceTimersByTimeAsync(200);
  expect(open()).toEqual(['a', 'c']);
});
