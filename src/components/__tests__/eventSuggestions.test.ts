import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import EventCard from '@/views/HomeView/EventCard.vue';
import { StoryApiService } from '@/services/StoryApiService';

const event = (id: string) => ({ id, label: { fr: id, en: '' }, date: 'M40', categories: [] });
const suggestion = (id: string) => ({ id, title: { fr: id, en: '' }, parentStoryId: 'one' });
const props = { periods: [{ id: 'p', label: { fr: 'p', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [] }], events: [event('a'), event('b')], currentStoryId: 'one', storySuggestions: [], parentPeriod: null, currentPeriod: null, loading: false };
let view: ReturnType<typeof mount>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { resolve, promise }; }
beforeEach(() => {
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
  expect(view.findAllComponents(EventCard)[1].text()).toContain('Aucune frise liée');
});

it.each(['story', 'period', 'removed', 'unmount'] as const)('ignores suggestions after %s changes the context', async context => {
  const pending = deferred<any[]>(); const api = vi.mocked(StoryApiService.getInstance().getSuggestions).mockReturnValue(pending.promise);
  view = mount(PeriodGrid, { props }); await select(0); const signal = api.mock.calls[0][3]!.signal!;
  if (context === 'story') await view.setProps({ currentStoryId: 'two' });
  if (context === 'period') await view.setProps({ currentPeriod: props.periods[0] });
  if (context === 'removed') await view.setProps({ events: [] });
  if (context === 'unmount') view.unmount();
  expect(signal.aborted).toBe(true); pending.resolve([suggestion('old')]); await flushPromises();
  if (context !== 'unmount') expect(view.text()).not.toContain('Explorer en détail');
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
