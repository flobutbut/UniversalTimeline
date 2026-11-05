import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, type EffectScope } from 'vue';
import { useCatalogueBulkActions } from '../useCatalogueBulkActions';
import { useUiStore } from '@/stores/useUiStore';
import { catalogueCsv } from '@/lib/exportCatalogueCsv';

const items = [{ id: 'one', name: 'Alpha' }, { id: 'two', name: 'Beta' }, { id: 'three', name: 'Gamma' }];
let scope: EffectScope;
const remove = vi.fn(); const associate = vi.fn(); const reload = vi.fn(); const invalidate = vi.fn();
let bulk: ReturnType<typeof create>;
function create() { return useCatalogueBulkActions({ items: () => items, label: 'Périodes', itemLabel: item => item.name,
  deleteItem: remove, associate, canEditStory: id => id === 'owned', reload, invalidate, csvRow: item => ({ Nom: item.name }),
  canSelect: item => item.id !== 'three',
}); }
beforeEach(() => { setActivePinia(createPinia()); scope = effectScope(); remove.mockResolvedValue(undefined); associate.mockResolvedValue(undefined); reload.mockResolvedValue(undefined); bulk = scope.run(create)!; });
afterEach(() => { scope.stop(); useUiStore().reset(); vi.resetAllMocks(); });
function accept(accepted = true) { const ui = useUiStore(); expect(ui.confirmation).not.toBeNull(); ui.settleConfirmation(ui.confirmation!.id, accepted); }

it('confirms one batch, excludes protected or stale IDs and never deletes before approval', async () => {
  bulk.selectedIds.value = ['one', 'two', 'three', 'missing'];
  const pending = bulk.run('delete'); expect(remove).not.toHaveBeenCalled();
  expect(useUiStore().confirmation?.message).toContain('Alpha, Beta');
  accept(); await pending;
  expect(remove.mock.calls.map(([item]) => item.id)).toEqual(['one', 'two']);
  expect(bulk.selectedIds.value).toEqual(['three', 'missing']);
  expect(bulk.message.value).toContain('2 élément(s) traité(s) sur 2');
});
it('cancels the whole batch and preserves the selection', async () => {
  bulk.selectedIds.value = ['one']; const pending = bulk.run('delete'); accept(false); await pending;
  expect(remove).not.toHaveBeenCalled(); expect(bulk.selectedIds.value).toEqual(['one']);
});
it('reports refused rows and continues distinct writes without retrying them', async () => {
  remove.mockRejectedValueOnce({ response: { status: 409, data: { error: 'Période utilisée' } } });
  bulk.selectedIds.value = ['one', 'two']; const pending = bulk.run('delete'); accept(); await pending;
  expect(remove).toHaveBeenCalledTimes(2); expect(bulk.selectedIds.value).toEqual(['one']);
  expect(bulk.failures.value[0]).toMatchObject({ id: 'one', message: 'Période utilisée' });
  expect(bulk.uncertain.value).toBe(false);
});
it('stops on an unknown write result, invalidates reads and requires a successful reload', async () => {
  remove.mockRejectedValueOnce({ code: 'ERR_NETWORK', request: {} });
  bulk.selectedIds.value = ['one', 'two']; const pending = bulk.run('delete'); accept(); await pending;
  expect(remove).toHaveBeenCalledTimes(1); expect(invalidate).toHaveBeenCalledTimes(1); expect(bulk.uncertain.value).toBe(true);
  await bulk.run('delete'); expect(remove).toHaveBeenCalledTimes(1);
  reload.mockRejectedValueOnce(new Error('Hors ligne')); await bulk.reload(); expect(bulk.uncertain.value).toBe(true);
  await bulk.reload(); expect(bulk.uncertain.value).toBe(false);
});
it('sends selected associations in a single transaction and refuses an unowned target', async () => {
  bulk.selectedIds.value = ['one', 'two']; await bulk.run('add-story', 'foreign'); expect(associate).not.toHaveBeenCalled();
  const pending = bulk.run('remove-story', 'owned'); accept(); await pending;
  expect(associate).toHaveBeenCalledExactlyOnceWith(['one', 'two'], 'owned', true); expect(bulk.selectedIds.value).toEqual([]);
});
it('does not start duplicate batches or continue after leaving the view', async () => {
  bulk.selectedIds.value = ['one', 'two']; const pending = bulk.run('delete'); await bulk.run('delete');
  scope.stop(); await pending; expect(remove).not.toHaveBeenCalled();
});
it('quotes CSV delimiters and quotes, preserving text and neutralizing spreadsheet formulas', () => {
  const csv = catalogueCsv([{ Nom: 'A; "B"', Valeur: '=IMPORTDATA("url")' }, { Nom: 'Suite\nligne', Valeur: '-3200' }]);
  expect(csv).toContain('"A; ""B"""'); expect(csv).toContain('"\'=IMPORTDATA(""url"")"'); expect(csv).toContain('"\'-3200"');
  expect(csv).toContain('"Suite\nligne"');
});
