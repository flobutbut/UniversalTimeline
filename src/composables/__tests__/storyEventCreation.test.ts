import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { useStoryEventCreation } from '../useStoryEventCreation';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story, Event } from '@/types/database';
import type { EditFormSubmission } from '@/types/editForm';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const saved: Event = { id: 'saved-event', wikidata_id: 'Q123', label: { fr: 'Débarquement', en: '' }, date: '1944-06-06', categories: [], createdAt: new Date(), updatedAt: new Date() };
const story = (id: string): Story => ({ id, title: { fr: id, en: '' }, author: '', isPublic: false, categories: [], periods: [], events: [] });
const form: EditFormSubmission = { qid: 'Q123', title: saved.label, description: { fr: '', en: '' }, date: saved.date, startDate: '', endDate: '', location: '', parentId: null, categories: [], author: '', isPublic: false };
const events = EventApiService.getInstance(); const stories = StoryApiService.getInstance();
let scope: EffectScope;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function start() {
  const activeStory = ref(story('original')); const onAdded = vi.fn(); scope = effectScope();
  const flow = scope.run(() => useStoryEventCreation(() => activeStory.value, onAdded))!;
  return { flow, activeStory, onAdded };
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(events, 'getEventById').mockResolvedValue(null);
  vi.spyOn(events, 'createEvent').mockResolvedValue(saved);
  vi.spyOn(stories, 'changeAssociations').mockResolvedValue(undefined);
});
afterEach(() => { scope?.stop(); vi.restoreAllMocks(); });

it('opens a blank event draft and creates before attaching only its saved ID', async () => {
  const { flow, onAdded } = start(); flow.open();
  expect(flow.draft.value).toEqual({}); expect(events.createEvent).not.toHaveBeenCalled();
  await flow.submit(form);
  expect(events.createEvent).toHaveBeenCalledExactlyOnceWith(form);
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'event', ['saved-event']);
  expect(onAdded).toHaveBeenCalledOnce(); expect(flow.draft.value).toBeNull();
});
it('associates an existing search selection without creating or rewriting its catalogue data', async () => {
  const { flow } = start(); flow.open(); await flow.selectExisting('existing-event');
  expect(events.createEvent).not.toHaveBeenCalled(); expect(events.getEventById).not.toHaveBeenCalled();
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'event', ['existing-event']);
});
it('retains a failed creation/association draft and retries without creating a duplicate', async () => {
  vi.mocked(stories.changeAssociations).mockRejectedValueOnce(new Error('Ajout refusé'));
  const { flow, onAdded } = start(); flow.open(); await flow.submit(form);
  expect(flow.error.value).toContain('L’événement est enregistré'); expect(flow.draft.value).not.toBeNull();
  vi.mocked(events.getEventById).mockResolvedValue(saved); await flow.submit(form);
  expect(events.createEvent).toHaveBeenCalledOnce(); expect(stories.changeAssociations).toHaveBeenCalledTimes(2);
  expect(flow.error.value).toBeNull(); expect(onAdded).toHaveBeenCalledOnce();
});
it('retries an existing selection after an association refusal', async () => {
  vi.mocked(stories.changeAssociations).mockRejectedValueOnce(new Error('Ajout refusé'));
  const { flow } = start(); flow.open(); await flow.selectExisting('existing-event');
  expect(flow.error.value).toContain('Ajout refusé'); expect(flow.draft.value).not.toBeNull();
  await flow.selectExisting('existing-event'); expect(flow.draft.value).toBeNull(); expect(events.createEvent).not.toHaveBeenCalled();
});
it('finishes a started creation in the original frise after navigation', async () => {
  const pending = deferred<Event>(); vi.mocked(events.createEvent).mockReturnValue(pending.promise);
  const { flow, activeStory, onAdded } = start(); flow.open(); const writing = flow.submit(form); await flushPromises();
  activeStory.value = story('other'); pending.resolve(saved); await writing;
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'event', ['saved-event']);
  expect(onAdded).not.toHaveBeenCalled(); expect(flow.draft.value).toBeNull();
});
it('does not create after navigating away during the duplicate lookup', async () => {
  const pending = deferred<Event | null>(); vi.mocked(events.getEventById).mockReturnValue(pending.promise);
  const { flow, activeStory } = start(); flow.open(); const writing = flow.submit(form);
  activeStory.value = story('other'); pending.resolve(null); await writing;
  expect(events.createEvent).not.toHaveBeenCalled(); expect(stories.changeAssociations).not.toHaveBeenCalled();
});
it('reuses the saved event on retry when its creation response was lost', async () => {
  vi.mocked(events.createEvent).mockRejectedValueOnce({ code: 'ERR_NETWORK' });
  const { flow } = start(); flow.open(); await flow.submit(form);
  expect(flow.error.value).toContain('n’a pas pu être confirmé'); expect(stories.changeAssociations).not.toHaveBeenCalled();
  vi.mocked(events.getEventById).mockResolvedValue(saved); await flow.submit(form);
  expect(events.createEvent).toHaveBeenCalledOnce();
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'event', ['saved-event']);
});

it('creates a manual event without a Wikidata lookup and retries its association without duplicates', async () => {
  vi.mocked(stories.changeAssociations).mockRejectedValueOnce(new Error('Ajout refusé'));
  const { flow, onAdded } = start(); flow.open();
  const manual = { ...form, qid: '' };
  await flow.submit(manual);
  expect(events.getEventById).not.toHaveBeenCalled();
  expect(flow.error.value).toContain('L’événement est enregistré');
  await flow.submit(manual);
  expect(events.createEvent).toHaveBeenCalledExactlyOnceWith(manual);
  expect(stories.changeAssociations).toHaveBeenCalledTimes(2);
  expect(onAdded).toHaveBeenCalledOnce();
});
