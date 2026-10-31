import { useUiStore } from '@/stores/useUiStore';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useGraphDragDrop } from '@/composables/useGraphDragDrop';

const fake = vi.hoisted(() => ({ updateParent: vi.fn(), toast: { show: vi.fn(), hide: vi.fn() } }));
vi.mock('@/services/PeriodApiService', () => ({ PeriodApiService: { getInstance: () => fake } }));
const period = { id: 'child', label: { fr: 'Période', en: 'Period' }, parentId: 'root', startDate: 'M65', endDate: 'NOW', categories: [] };
beforeEach(() => {
  vi.resetAllMocks(); setActivePinia(createPinia()); vi.spyOn(useUiStore(), 'notify').mockImplementation((fake.toast).show); vi.spyOn(useUiStore(), 'hideNotification').mockImplementation((fake.toast).hide);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useDataStore().updatePeriods([period]);
});
afterEach(() => vi.restoreAllMocks());

it.each(['child', 'grandchild'])('rejects a local self/descendant drop onto %s without making a request', async parentId => {
  await useGraphDragDrop().movePeriod('child', parentId, () => parentId === 'grandchild');
  expect(fake.updateParent).not.toHaveBeenCalled();
  expect(useDataStore().periods).toEqual([period]);
});

it('keeps the store unchanged and displays an API cycle rejection when ancestry was not loaded locally', async () => {
  fake.updateParent.mockRejectedValue({ response: { status: 409, data: { error: 'Cycle refusé par le serveur' } } });
  await useGraphDragDrop().movePeriod('child', 'unloaded-descendant', () => false);
  expect(useDataStore().periods).toEqual([period]);
  expect(fake.toast.show).toHaveBeenLastCalledWith('Cycle refusé par le serveur', 'error', undefined);
});

it('stores the canonical move response without overwriting concurrent changes to other rows', async () => {
  const store = useDataStore();
  fake.updateParent.mockImplementation(async () => {
    store.upsertSavedPeriod({ ...period, id: 'other', label: { fr: 'Modification concurrente', en: '' } });
    return { ...period, parentId: null, hasParent: false, hasChildren: true };
  });
  await useGraphDragDrop().movePeriod('child', null, () => false);
  expect(store.periods[0]).toMatchObject({ parentId: null, hasParent: false, hasChildren: true });
  expect(store.periods[1].label.fr).toBe('Modification concurrente');
});
