import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { useStoryWikidataPeriodImport } from '../useStoryWikidataPeriodImport';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import type { Period, Story } from '@/types/database';
import type { EditFormSubmission } from '@/types/editForm';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn() } }));
const parent: Period = { id: 'root', label: { fr: 'Racine', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], hasParent: false, children: [], temporalLocation: 'Globale', wikidata_id: 'Q100' };
const candidate: Period = { ...parent, id: 'wikidata:Q200', wikidata_id: 'Q200', parentId: 'root', hasParent: true, label: { fr: 'Suggestion', en: '' }, startDate: 'M60', endDate: 'TODAY' };
const saved: Period = { ...candidate, id: 'saved-period' };
const story = (id: string): Story => ({ id, title: { fr: id, en: '' }, author: '', isPublic: false, categories: [], periods: [parent], events: [] });
const form: EditFormSubmission = { qid: 'Q200', title: candidate.label, description: { fr: '', en: '' }, startDate: 'M60', endDate: 'NOW', date: '', location: 'Globale', parentId: 'root', categories: [], author: '', isPublic: false };
const periods = PeriodApiService.getInstance();
const stories = StoryApiService.getInstance();
let scope: EffectScope;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function start() {
  const activeStory = ref(story('original'));
  const onImported = vi.fn(); scope = effectScope();
  const flow = scope.run(() => useStoryWikidataPeriodImport(() => activeStory.value, onImported))!;
  return { flow, activeStory, onImported };
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(periods, 'getPeriodByWikidataId').mockResolvedValue(null);
  vi.spyOn(periods, 'createPeriod').mockResolvedValue(saved);
  vi.spyOn(stories, 'changeAssociations').mockResolvedValue(undefined);
});
afterEach(() => { scope?.stop(); vi.restoreAllMocks(); });

it('waits for confirmation, saves under the real parent, then associates only the saved ID', async () => {
  const { flow, onImported } = start();
  await flow.open(candidate);
  expect(flow.draft.value).toMatchObject({ wikidata_id: 'Q200', parent_id: 'root', endDate: '' });
  expect(periods.createPeriod).not.toHaveBeenCalled(); expect(stories.changeAssociations).not.toHaveBeenCalled();
  await flow.submit(form);
  expect(periods.createPeriod).toHaveBeenCalledExactlyOnceWith(form);
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'period', ['saved-period'], false, 'root');
  expect(onImported).toHaveBeenCalledOnce(); expect(flow.draft.value).toBeNull();
  expect(useDataStore().periodById('saved-period')).toEqual(saved);
});

it('reuses an existing Wikidata period without modifying its catalogue data', async () => {
  vi.mocked(periods.getPeriodByWikidataId).mockResolvedValue(saved);
  const { flow, onImported } = start(); await flow.open(candidate);
  expect(periods.createPeriod).not.toHaveBeenCalled();
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'period', ['saved-period'], false, 'root');
  expect(flow.draft.value).toBeNull(); expect(onImported).toHaveBeenCalledOnce();
});

it('keeps the draft on an association failure and retries without creating a duplicate', async () => {
  vi.mocked(stories.changeAssociations).mockRejectedValueOnce(new Error('Ajout refusé'));
  const { flow, onImported } = start(); await flow.open(candidate); await flow.submit(form);
  expect(flow.error.value).toContain('La période est enregistrée'); expect(flow.draft.value).not.toBeNull();
  expect(onImported).not.toHaveBeenCalled();
  vi.mocked(periods.getPeriodByWikidataId).mockResolvedValue(saved);
  await flow.submit(form);
  expect(periods.createPeriod).toHaveBeenCalledOnce(); expect(stories.changeAssociations).toHaveBeenCalledTimes(2);
  expect(flow.error.value).toBeNull(); expect(flow.draft.value).toBeNull(); expect(onImported).toHaveBeenCalledOnce();
});

it('resolves a period on explicit retry after its creation response was lost', async () => {
  vi.mocked(periods.createPeriod).mockRejectedValueOnce({ code: 'ERR_NETWORK' });
  const { flow } = start(); await flow.open(candidate); await flow.submit(form);
  expect(flow.error.value).toContain('n’a pas pu être confirmé'); expect(stories.changeAssociations).not.toHaveBeenCalled();
  vi.mocked(periods.getPeriodByWikidataId).mockResolvedValue(saved);
  await flow.submit(form);
  expect(periods.createPeriod).toHaveBeenCalledOnce();
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'period', ['saved-period'], false, 'root');
});

it('finishes an already started import on its original frise after navigation', async () => {
  const saving = deferred<Period>(); vi.mocked(periods.createPeriod).mockReturnValue(saving.promise);
  const { flow, activeStory, onImported } = start(); await flow.open(candidate);
  const writing = flow.submit(form); await flushPromises();
  activeStory.value = story('new-frise'); saving.resolve(saved); await writing;
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'period', ['saved-period'], false, 'root');
  expect(onImported).not.toHaveBeenCalled(); expect(flow.draft.value).toBeNull(); expect(flow.error.value).toBeNull();
});

it('does not open a stale draft or associate a stale lookup after navigation', async () => {
  const pending = deferred<Period | null>(); vi.mocked(periods.getPeriodByWikidataId).mockReturnValue(pending.promise);
  const { flow, activeStory } = start(); const opening = flow.open(candidate);
  activeStory.value = story('new-frise'); pending.resolve(saved); await opening;
  expect(flow.draft.value).toBeNull(); expect(stories.changeAssociations).not.toHaveBeenCalled();
});

it('requires a persisted parent before importing a deeper Wikidata suggestion', async () => {
  const { flow } = start(); await flow.open({ ...candidate, parentId: 'wikidata:Q300' });
  expect(flow.error.value).toContain('période parente'); expect(periods.getPeriodByWikidataId).not.toHaveBeenCalled();
});

it('creates from a blank draft and preserves the column parent when Wikidata proposes a different catalogue parent', async () => {
  const { flow, onImported } = start(); flow.openCreate('root');
  expect(flow.draft.value).toEqual({ parent_id: 'root' }); expect(periods.createPeriod).not.toHaveBeenCalled();
  await flow.submit({ ...form, parentId: 'another-catalogue-parent' });
  expect(periods.createPeriod).toHaveBeenCalledOnce();
  expect(stories.changeAssociations).toHaveBeenCalledExactlyOnceWith('original', 'period', ['saved-period'], false, 'root');
  expect(onImported).toHaveBeenCalledOnce();
});

it('adds an existing period at the root without creating it and retains selection on a failed association', async () => {
  vi.spyOn(periods, 'getPeriod').mockResolvedValue(saved);
  vi.mocked(stories.changeAssociations).mockRejectedValueOnce(new Error('Ajout refusé'));
  const { flow, onImported } = start(); flow.openCreate(null);
  await flow.selectExisting('saved-period');
  expect(flow.draft.value).not.toBeNull(); expect(flow.error.value).toContain('Ajout refusé');
  await flow.selectExisting('saved-period');
  expect(periods.createPeriod).not.toHaveBeenCalled();
  expect(stories.changeAssociations).toHaveBeenLastCalledWith('original', 'period', ['saved-period'], false, null);
  expect(onImported).toHaveBeenCalledOnce(); expect(flow.draft.value).toBeNull();
});

it('ignores an existing-period lookup after the user switches frises', async () => {
  const pending = deferred<Period>(); vi.spyOn(periods, 'getPeriod').mockReturnValue(pending.promise);
  const { flow, activeStory } = start(); flow.openCreate('root');
  const choosing = flow.selectExisting('saved-period'); activeStory.value = story('elsewhere');
  pending.resolve(saved); await choosing;
  expect(stories.changeAssociations).not.toHaveBeenCalled(); expect(flow.draft.value).toBeNull();
});
