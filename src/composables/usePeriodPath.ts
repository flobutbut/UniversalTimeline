import type { ListPeriod } from '@/types/database';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { buildPeriodIdAncestorChain } from '@/lib/periodAncestorChain';

/** Shared reads may finish, but an abandoned path must never be committed. */
export function usePeriodPath() {
  const store = useDataStore();
  return async (targetId: string, isCurrent: () => boolean, includeTargetChildren = false): Promise<string[] | null> => {
    const fetched = new Map<string, ListPeriod>();
    const path = await buildPeriodIdAncestorChain(targetId, {
      getPeriodFromStore: id => store.periodById(id) ?? undefined,
      fetchPeriodFromApi: async id => {
        const detail = await PeriodApiService.getInstance().getPeriod(id);
        fetched.set(id, detail);
        return detail;
      },
      isCurrent,
    });
    for (const id of includeTargetChildren ? path : path.slice(0, -1)) {
      if (!isCurrent()) return null;
      await store.ensureChildrenLoaded(id);
    }
    if (!isCurrent()) return null;
    for (const detail of fetched.values()) store.cachePeriod(detail);
    if (!path.length || path.some(id => !store.periodById(id))) throw new Error('Cette période a disparu du catalogue.');
    return path;
  };
}
