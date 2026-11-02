import { useUiStore } from '@/stores/useUiStore';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDatabaseSave } from '@/composables/useDatabaseSave';
import { useDataStore } from '@/stores/useDataStore';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
import { EventApiService } from '@/services/EventApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { nextTick } from 'vue';
import { apiClient } from '@/services/ApiClient';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('@/validators/editFormValidators', () => ({ EditFormValidator: { validateForm: () => ({ isValid: true }), validateQid: () => ({ isValid: true }) } }));
const categories = [{ id: 'cat', label: { fr: 'Libellé serveur', en: 'Server label' } }];
const form = { title: { fr: 'Formulaire', en: 'Form' }, description: { fr: 'Description', en: '' }, qid: 'Q123', startDate: 'M54', endDate: 'NOW', date: 'M54', categories: [] };
const periodRow = { id: 'p1', label_fr: 'Normalisé', label_en: 'Normalized', description_fr: 'Serveur', start_date: 'M65', end_date: 'M8', start_years_bp: '65000000', end_years_bp: '8000000', parent_id: 'parent', has_children: true, categories, updated_at: '2026-10-28T12:00:00Z' };

beforeEach(() => {
  vi.resetAllMocks(); setActivePinia(createPinia());
  vi.spyOn(useUiStore(), 'notify').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation(({ show: vi.fn(), hide: vi.fn() }).hide);
  vi.spyOn(ConflictResolutionService.getInstance(), 'detectConflict').mockResolvedValue({ hasConflict: false, existingItem: null, conflictType: 'period', message: '' });
});
afterEach(() => vi.restoreAllMocks());

it.each(['period', 'event', 'story'] as const)('does not resend a %s creation after a lost response and asks for reconciliation', async type => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(apiClient.get).mockResolvedValue(null);
  vi.mocked(apiClient.post).mockRejectedValue({ code: 'ECONNRESET', request: {} });
  const save = useDatabaseSave();
  expect(await save.handleSave(form, type, 'create', null)).toBe(false);
  expect(apiClient.post).toHaveBeenCalledOnce();
  expect(save.error.value).toContain('n’a pas pu être confirmé');
  expect(save.error.value).toContain('Rechargez les données');
  expect(useDataStore().periods).toEqual([]);
  expect(useDataStore().events).toEqual([]);
  expect(useDataStore().stories).toEqual([]);
});

it('blocks a second submission while the first creation is still pending', async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(apiClient.post).mockReturnValue(new Promise(yes => { resolve = yes; }));
  const save = useDatabaseSave();
  const first = save.handleSave(form, 'story', 'create', null);
  expect(await save.handleSave(form, 'story', 'create', null)).toBe(false);
  resolve({ id: 7, title_fr: 'Saved', categories: [] });
  expect(await first).toBe(true); expect(apiClient.post).toHaveBeenCalledOnce();
});

it('saves shared metadata without a catalogue parent', async () => {
  vi.mocked(apiClient.put).mockResolvedValue({ ...periodRow, parent_id: null });
  expect(await useDatabaseSave().handleSave({ ...form, parentId: null }, 'period', 'edit', {id:'p1'})).toBe(true);
  expect(apiClient.put).toHaveBeenCalledOnce(); expect(vi.mocked(apiClient.put).mock.calls[0][1]).not.toHaveProperty('parent_id');
});

it.each(['edit', 'create'] as const)('stores the mapped period response on %s rather than reconstructing it from the form', async mode => {
  const store = useDataStore(); store.updatePeriods([{ ...PeriodApiService.mapPeriod(periodRow), startYearsBP: 1 }]);
  vi.mocked(apiClient.get).mockResolvedValue(null);
  vi.mocked(apiClient.put).mockResolvedValue(periodRow); vi.mocked(apiClient.post).mockResolvedValue(periodRow);
  expect(await useDatabaseSave().handleSave(form, 'period', mode, { id: 'p1' })).toBe(true);
  expect(store.periods).toHaveLength(1);
  expect(store.periods[0]).toMatchObject({ label: { fr: 'Normalisé' }, description: { fr: 'Serveur' }, startDate: 'M65', startYearsBP: 65000000, endYearsBP: 8000000, hasChildren: true, parentId: 'parent', categories, updatedAt: new Date(periodRow.updated_at) });
});

it.each(['edit', 'create'] as const)('replaces all event data, including dateYearsBP and categories, on %s', async mode => {
  const store = useDataStore(); store.updateEvents([{ id: 'e1', label: form.title, date: 'M54', dateYearsBP: 1, categories: [] }]);
  const row = { id: 'e1', label_fr: 'Événement serveur', date: 'M65', date_years_bp: '65000000', categories, updated_at: periodRow.updated_at };
  vi.mocked(apiClient.put).mockResolvedValue(row); vi.mocked(apiClient.post).mockResolvedValue(row);
  expect(await useDatabaseSave().handleSave(form, 'event', mode, { id: 'e1' })).toBe(true);
  expect(store.events).toHaveLength(1);
  expect(store.events[0]).toMatchObject({ label: { fr: 'Événement serveur' }, date: 'M65', dateYearsBP: 65000000, categories, updatedAt: new Date(periodRow.updated_at) });
});

it('normalizes a numeric story ID and preserves its derived interval on metadata edits', async () => {
  const store = useDataStore(); store.updateStories([{ id: '7', title: form.title, categories: [], startDate: 'G4.6', endDate: 'NOW' }]);
  vi.mocked(apiClient.put).mockResolvedValue({ id: 7, title_fr: 'Frise serveur', author: 'Author', categories });
  expect(await useDatabaseSave().handleSave(form, 'story', 'edit', { id: '7' })).toBe(true);
  expect(store.stories).toHaveLength(1);
  expect(store.stories[0]).toMatchObject({ id: '7', title: { fr: 'Frise serveur' }, categories, startDate: 'G4.6', endDate: 'NOW' });
});

it('invalidates cached story snapshots after a period edit', async () => {
  const store = useDataStore(); const read = vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([periodRow] as any);
  await store.ensureStoryPeriodsLoaded('7'); await store.ensureStoryPeriodsLoaded('7');
  expect(read).toHaveBeenCalledTimes(1);
  store.upsertSavedPeriod(PeriodApiService.mapPeriod(periodRow));
  await store.ensureStoryPeriodsLoaded('7'); expect(read).toHaveBeenCalledTimes(2);
});

it('refreshes a displayed timeline card after saving without clearing its navigation snapshot', async () => {
  const store = useDataStore(); const original = PeriodApiService.mapPeriod({ ...periodRow, label_fr: 'Ancien' });
  const child = { ...original, id: 'child', parentId: original.id };
  const parent = { ...original, id: 'parent', parentId: null, hasParent: false };
  store.updatePeriods([parent, original, child]);
  vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue({ id: '1', title: { fr: 'Frise', en: '' }, author: '', isPublic: true, categories: [], periods: [parent,original,child], events: [] } as any);
  vi.spyOn(StoryApiService.getInstance(),'getListStories').mockResolvedValue([]);
  vi.spyOn(EventApiService.getInstance(),'getStoryListEvents').mockResolvedValue([]);
  const nav = useHomeNavigation(); await nav.loadInitialData(); nav.displayedPeriods.value = [child]; nav.currentPeriod.value = original; nav.parentStack.value = [parent];
  store.upsertSavedPeriod({ ...child, label: { fr: 'Normalisé', en: '' } });
  store.upsertSavedPeriod(PeriodApiService.mapPeriod(periodRow)); await nextTick();
  expect(nav.displayedPeriods.value[0].label.fr).toBe('Normalisé');
  expect(nav.currentPeriod.value?.label.fr).toBe('Normalisé'); expect(nav.parentStack.value.map(p => p.id)).toEqual(['parent']);
});

it('keeps the previous data intact when the API rejects a save', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const store = useDataStore(); const original = PeriodApiService.mapPeriod(periodRow); store.updatePeriods([original]);
  vi.mocked(apiClient.put).mockRejectedValue(new Error('Save refused'));
  expect(await useDatabaseSave().handleSave(form, 'period', 'edit', { id: 'p1' })).toBe(false);
  expect(store.periods[0]).toEqual(original);
});

it('keeps the previous data intact when a success response lacks its saved identifier', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const store = useDataStore(); const original = PeriodApiService.mapPeriod(periodRow); store.updatePeriods([original]);
  vi.mocked(apiClient.put).mockResolvedValue({ label_fr: 'Malformed response' });
  expect(await useDatabaseSave().handleSave(form, 'period', 'edit', { id: 'p1' })).toBe(false);
  expect(store.periods[0]).toEqual(original);
});


it('keeps the order of existing rows when an entity is saved', () => {
  const store = useDataStore();
  store.updatePeriods([PeriodApiService.mapPeriod(periodRow), PeriodApiService.mapPeriod({ ...periodRow, id: 'p2' })]);
  store.upsertSavedPeriod(PeriodApiService.mapPeriod({ ...periodRow, label_fr: 'Updated' }));
  expect(store.periods.map(period => period.id)).toEqual(['p1', 'p2']);
  expect(store.periods[0].label.fr).toBe('Updated');
});
