import { computed, onScopeDispose, ref } from 'vue';
import { useConfirm } from './useConfirm';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { downloadCatalogueCsv } from '@/lib/exportCatalogueCsv';

export type CatalogueBulkAction = 'delete' | 'add-story' | 'remove-story' | 'export' | 'suspend' | 'reactivate';
export function useCatalogueBulkActions<T extends { id: string }>(options: {
  items: () => T[];
  label: string;
  itemLabel: (item: T) => string;
  canSelect?: (item: T) => boolean;
  deleteItem: (item: T) => Promise<void>;
  reload: () => Promise<void>;
  invalidate?: () => void;
  associate?: (ids: string[], storyId: string, remove: boolean) => Promise<void>;
  canEditStory?: (id: string) => boolean;
  suspend?: (item: T, suspended: boolean) => Promise<void>;
  csvRow: (item: T) => Record<string, string | number | null | undefined>;
}) {
  const selectedIds = ref<string[]>([]);
  const busy = ref(false);
  const message = ref('');
  const failures = ref<Array<{ id: string; label: string; message: string }>>([]);
  const uncertain = ref(false);
  const confirm = useConfirm();
  let disposed = false;
  onScopeDispose(() => { disposed = true; });
  const selected = computed(() => options.items().filter(item => selectedIds.value.includes(item.id) && (options.canSelect?.(item) ?? true)));
  const isUncertain = (error: unknown) => !(error as { response?: unknown } | null)?.response;
  async function reload() {
    if (busy.value) return;
    busy.value = true;
    try { await options.reload(); if (!disposed) { uncertain.value = false; failures.value = []; message.value = 'Données rechargées.'; } }
    catch (error) { message.value = mutationErrorMessage(error, 'Rechargement impossible.'); }
    finally { busy.value = false; }
  }
  async function run(action: CatalogueBulkAction, storyId?: string) {
    if (busy.value || uncertain.value || disposed) return;
    const items = [...selected.value];
    if (!items.length) return;
    if (action === 'export') { downloadCatalogueCsv(`${options.label.toLowerCase()}.csv`, items.map(options.csvRow)); return; }
    if ((action === 'add-story' || action === 'remove-story') && (!storyId || !options.associate || !options.canEditStory?.(storyId))) return;
    if ((action === 'add-story' || action === 'remove-story') && items.length > 500) {
      message.value = 'Sélectionnez au maximum 500 éléments pour une association à une frise.';
      return;
    }
    if ((action === 'suspend' || action === 'reactivate') && !options.suspend) return;
    busy.value = true;
    try {
      const verb = action === 'delete' ? 'Supprimer' : action === 'suspend' ? 'Suspendre' : action === 'reactivate' ? 'Réactiver' : action === 'remove-story' ? 'Retirer de la frise' : 'Ajouter à la frise';
      const consequences = action === 'delete'
        ? options.label === 'Périodes' ? 'Suppression définitive du catalogue. Les périodes avec sous-périodes ou liens vers des frises seront refusées.'
          : options.label === 'Utilisateurs' ? 'Suppression définitive des comptes et de leurs données associées, y compris leurs frises.'
            : 'Suppression définitive du catalogue et retrait de toutes les frises qui utilisent ces événements.'
        : action === 'remove-story' ? 'Les fiches restent dans le catalogue. Les liens de cette frise seront retirés.' : '';
      const names = items.slice(0, 10).map(options.itemLabel).join(', ') + (items.length > 10 ? ` et ${items.length - 10} autre(s)` : '');
      if (!await confirm(`${verb} ${items.length} élément(s)`, `${consequences}\n\nSélection : ${names}`) || disposed) return;
      failures.value = []; message.value = '';
      const succeeded = new Set<string>();
      if (action === 'add-story' || action === 'remove-story') {
        try { await options.associate!(items.map(item => item.id), storyId!, action === 'remove-story'); items.forEach(item => succeeded.add(item.id)); }
        catch (error) { uncertain.value = isUncertain(error); if (uncertain.value) options.invalidate?.(); failures.value = [{ id: 'association', label: 'Association à la frise', message: mutationErrorMessage(error, 'Action refusée.') }]; }
      } else {
        for (const item of items) {
          if (disposed) break;
          try {
            if (action === 'delete') await options.deleteItem(item);
            else await options.suspend!(item, action === 'suspend');
            succeeded.add(item.id);
          } catch (error) {
            failures.value.push({ id: item.id, label: options.itemLabel(item), message: mutationErrorMessage(error, 'Action refusée.') });
            if (isUncertain(error)) { uncertain.value = true; options.invalidate?.(); break; }
          }
          message.value = `${succeeded.size} élément(s) traité(s) sur ${items.length}…`;
        }
      }
      selectedIds.value = selectedIds.value.filter(id => !succeeded.has(id));
      const failedCount = action === 'add-story' || action === 'remove-story' ? (failures.value.length ? items.length : 0) : failures.value.length;
      const pending = items.length - succeeded.size - failedCount;
      message.value = `${succeeded.size} élément(s) traité(s) sur ${items.length}.${failures.value.length ? ` ${failures.value.length} échec(s).` : ''}${pending > 0 ? ` ${pending} non traité(s).` : ''}`;
    } finally { busy.value = false; }
  }
  return { selectedIds, selected, busy, message, failures, uncertain, run, reload };
}
