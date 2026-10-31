import { onScopeDispose, ref } from 'vue';
import type { ListPeriod } from '@/types/database';
import type { SelectionState } from './useGraphView';
import { useDataStore } from '@/stores/useDataStore';
import { usePeriodPath } from './usePeriodPath';
import { useLatestRequest } from './useLatestRequest';

/** Resolve a whole catalogue path before replacing the visible finder selection. */
export function useFinderNavigation(
  selection: SelectionState,
  select: (period: ListPeriod, column: number) => Promise<void>,
) {
  const store = useDataStore();
  const loadPath = usePeriodPath();
  const requests = useLatestRequest();
  const loading = ref(false);
  const error = ref<string | null>(null);
  let retryTarget: Pick<ListPeriod, 'id'> | null = null;

  function cancel() {
    requests.cancel();
    loading.value = false;
    error.value = null;
    retryTarget = null;
  }

  async function navigate(period: Pick<ListPeriod, 'id'>): Promise<boolean> {
    const isCurrent = requests.begin();
    retryTarget = period;
    loading.value = true;
    error.value = null;
    try {
      const path = await loadPath(period.id, isCurrent);
      if (!path || !isCurrent()) return false;
      const destination = store.periodById(period.id)!;
      selection.selectedIds = path.slice(0, -1);
      // Selection is synchronous. Child loading continues with its own status.
      void select(destination, path.length - 1);
      return true;
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible de rejoindre cette période.';
      return false;
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }

  const retry = () => retryTarget ? navigate(retryTarget) : Promise.resolve(false);
  onScopeDispose(cancel);
  return { navigate, loading, error, retry, cancel };
}
