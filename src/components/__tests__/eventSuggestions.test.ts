import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import EventCard from '@/views/HomeView/EventCard.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { createPinia, setActivePinia } from 'pinia';

const event = (id: string) => ({ id, label: { fr: id, en: '' }, date: 'M40', categories: [] });
const suggestion = (id: string) => ({ id, title: { fr: id, en: '' }, parentStoryId: 'one' });
const props = { periods: [{ id: 'p', label: { fr: 'p', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [] }], events: [event('a'), event('b')], currentStoryId: 'one', storySuggestions: [], parentPeriod: null, currentPeriod: null, loading: false };
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(StoryApiService.getInstance(), 'getMemberships').mockResolvedValue(new Map());
  vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
  vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ childStories: [] } as never); vi.useFakeTimers(); vi.spyOn(StoryApiService.getInstance(), 'getSuggestions').mockResolvedValue([]); });
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function select(index: number) { await view.findAllComponents(EventCard)[index].get('.event-dot').trigger('click'); await vi.advanceTimersByTimeAsync(0); await flushPromises(); }

it('distinguishes a suggestion failure from an empty result and retries for the selected event', async () => {
  const api = vi.mocked(StoryApiService.getInstance().getSuggestions).mockRejectedValueOnce(new Error('Frises indisponibles')).mockResolvedValueOnce([suggestion('child')]);
  view = mount(PeriodGrid, { props }); await select(0);
  expect(view.get('[role="alert"]').text()).toContain('Frises indisponibles');
  expect(view.getComponent(EventCard).text()).not.toContain('Aucune frise liée');
  await view.get('[role="alert"] button').trigger('click'); await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(false); expect(view.getComponent(EventCard).props('storySuggestions')).toEqual([suggestion('child')]);
  expect(api.mock.calls[1].slice(0, 3)).toEqual(['one', [], ['a']]);
});

it('does not reuse suggestions or loading from the previously selected event', async () => {
  const a = deferred<any[]>(); const b = deferred<any[]>(); const api = vi.mocked(StoryApiService.getInstance().getSuggestions).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  view = mount(PeriodGrid, { props }); await select(0); await select(1);
  expect(api.mock.calls[0][3]!.signal!.aborted).toBe(true);
  a.resolve([suggestion('old')]); await flushPromises(); expect(view.get('[role="status"]').text()).toContain('Chargement');
  b.resolve([]); await flushPromises(); expect(view.find('[role="status"]').exists()).toBe(false);
  expect(view.findAllComponents(EventCard)[1].text()).not.toContain('Aucune frise liée');
  expect(view.findAllComponents(EventCard)[1].find('.event-stories').exists()).toBe(false);
});

it.each(['story', 'period', 'removed', 'unmount'] as const)('ignores suggestions after %s changes the context', async context => {
  const pending = deferred<any[]>(); const api = vi.mocked(StoryApiService.getInstance().getSuggestions).mockReturnValue(pending.promise);
  view = mount(PeriodGrid, { props }); await select(0); const signal = api.mock.calls[0][3]!.signal!;
  if (context === 'story') await view.setProps({ currentStoryId: 'two' });
  if (context === 'period') await view.setProps({ currentPeriod: props.periods[0] });
  if (context === 'removed') await view.setProps({ events: [] });
  if (context === 'unmount') view.unmount();
  expect(signal.aborted).toBe(true); pending.resolve([suggestion('old')]); await flushPromises();
  if (context !== 'unmount') expect(view.find('.event-stories').exists()).toBe(false);
});

it('aborts a pending event read when the timeline enters KeepAlive and does not restore its old suggestion panel', async () => {
  const pending = deferred<any[]>(); const api = vi.mocked(StoryApiService.getInstance().getSuggestions).mockReturnValue(pending.promise);
  view = mount(defineComponent({ components: { PeriodGrid }, setup: () => ({ visible: ref(true), props }), template: '<button @click="visible = !visible">Changer</button><KeepAlive><PeriodGrid v-if="visible" v-bind="props" /></KeepAlive>' }));
  await select(0); await view.get('button').trigger('click'); expect(api.mock.calls[0][3]!.signal!.aborted).toBe(true);
  pending.resolve([suggestion('old')]); await flushPromises(); await view.get('button').trigger('click');
  expect(view.findAllComponents(EventCard).every(card => card.props('storySuggestions').length === 0)).toBe(true);
});
it('keeps undated event details, retry and child-story navigation accessible outside the dated axis',async()=>{
  const api=vi.mocked(StoryApiService.getInstance().getSuggestions).mockRejectedValueOnce(new Error('Indisponible')).mockResolvedValueOnce([suggestion('child')]);
  view=mount(PeriodGrid,{props:{...props,events:[{...event('undated'),date:'unknown'}]}});
  expect(view.text()).toContain('Événements sans date déterminée');
  const card=view.getComponent(EventCard);expect(card.props('undated')).toBe(true);
  await card.get('.event-undated-trigger').trigger('click');await vi.advanceTimersByTimeAsync(0);await flushPromises();
  expect(card.get('[role="alert"]').text()).toContain('Indisponible');
  await card.get('[role="alert"] button').trigger('click');await flushPromises();
  expect(api.mock.calls[1].slice(0,3)).toEqual(['one',[],['undated']]);
  expect(card.props('storySuggestions')).toEqual([suggestion('child')]);
  expect(card.attributes('style') ?? '').not.toContain('left:');
});

it('offers the other readable frises containing the event, after anchored child stories and never the current one', async () => {
  vi.mocked(StoryApiService.getInstance().getSuggestions).mockResolvedValue([suggestion('child')]);
  vi.mocked(StoryApiService.getInstance().getMemberships).mockResolvedValue(new Map([['a', ['one', 'child', 'z', 'b']], ['b', ['x']]]));
  vi.mocked(StoryApiService.getInstance().getListStories).mockResolvedValue([
    { id: 'one', title: { fr: 'Courante', en: '' } }, { id: 'z', title: { fr: 'Zèbre', en: '' } }, { id: 'b', title: { fr: 'Biologie', en: '' } },
  ] as never);
  view = mount(PeriodGrid, { props }); await select(0);
  const card = view.findAllComponents(EventCard)[0];
  expect(card.props('storySuggestions').map((story: { id: string }) => story.id)).toEqual(['child', 'b', 'z']);
  expect(card.text()).not.toContain('Aussi dans');
  expect(card.findAll('.event-story-item').map(item => item.text())).toEqual(['child', 'Biologie', 'Zèbre']);
  await card.findAll('.event-story-item')[1].trigger('click');
  expect(view.emitted('story-select')).toEqual([['b']]);
});
it('shows nothing when the event belongs to no other frise', async () => {
  vi.mocked(StoryApiService.getInstance().getMemberships).mockResolvedValue(new Map([['a', ['one']]]));
  view = mount(PeriodGrid, { props }); await select(0);
  const card = view.findAllComponents(EventCard)[0];
  expect(card.find('.event-stories').exists()).toBe(false);
  expect(card.text()).not.toMatch(/Aucune frise|Chargement des frises/);
});
it('shows on hover only how many other readable frises contain the event, never the current one', async () => {
  const pending = deferred<Map<string, string[]>>();
  vi.mocked(StoryApiService.getInstance().getMemberships).mockReturnValueOnce(pending.promise);
  view = mount(PeriodGrid, { props }); await vi.advanceTimersByTimeAsync(0);
  const [a, b] = view.findAllComponents(EventCard);
  expect(a.props('otherStoryCount')).toBeNull(); expect(a.find('.event-meta').exists()).toBe(false);
  pending.resolve(new Map([['a', ['one', 'two', 'three']], ['b', ['one']]])); await flushPromises();
  expect(a.get('.event-meta').text()).toBe('Présent dans 2 autres frises');
  expect(b.props('otherStoryCount')).toBe(0); expect(b.find('.event-meta').exists()).toBe(false);
  await select(0);
  expect(view.findAllComponents(EventCard)[0].text()).not.toContain('Présent dans');
});
it('uses the singular and keeps the count unknown after a failed read', async () => {
  vi.mocked(StoryApiService.getInstance().getMemberships).mockResolvedValueOnce(new Map([['a', ['one', 'two']]]));
  view = mount(PeriodGrid, { props }); await vi.advanceTimersByTimeAsync(0); await flushPromises();
  expect(view.findAllComponents(EventCard)[0].get('.event-meta').text()).toBe('Présent dans 1 autre frise');
  view.unmount();
  vi.mocked(StoryApiService.getInstance().getMemberships).mockRejectedValueOnce(new Error('Indisponible'));
  view = mount(PeriodGrid, { props }); await vi.advanceTimersByTimeAsync(0); await flushPromises();
  expect(view.findAllComponents(EventCard).map(card => card.props('otherStoryCount'))).toEqual([null, null]);
});
