import { computed, ref, watch, onScopeDispose } from 'vue';
import { SearchApiService } from '@/services/SearchApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useDataStore } from '@/stores/useDataStore';
import { localSearchHitToPeriod } from '@/lib/searchHitEntities';
import { useLatestRequest } from './useLatestRequest';
import { buildPeriodAncestorPathFromLeaf, listPeriodShowsDrillChevron, sortListPeriodsByLabel } from '@/lib/selectListPeriodHelpers';
import type { ListPeriod } from '@/types/database';

/** Domain navigation and reads; popup visibility and focus belong to PeriodSelect. */
export function usePeriodSelect(selectedId: () => string | null, options: { remote?: () => boolean; excludeId?: () => string | null } = {}) {
  const store = useDataStore();
  const requests = useLatestRequest();
  const searchRequests = useLatestRequest();
  const remoteRows = ref<ListPeriod[]>([]);
  const remoteLoading = ref(false);
  const remoteError = ref<string | null>(null);
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const remoteActive = computed(() => !!options.remote?.() && !!search.value.trim());
  const currentParentId = ref<string | null>(null);
  const search = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedPeriod = computed(() => store.periodById(selectedId() ?? ''));
  const currentParent = computed(() => store.periodById(currentParentId.value ?? ''));
  const periods = computed(() => {
    const rows = remoteActive.value ? remoteRows.value : currentParentId.value ? store.childrenOf(currentParentId.value) : store.rootPeriods;
    const query = search.value.trim().toLocaleLowerCase('fr');
    return sortListPeriodsByLabel(rows).filter(period => period.id !== options.excludeId?.() && (remoteActive.value || !query || period.label.fr.toLocaleLowerCase('fr').includes(query)));
  });
  const hasChildren = (period: ListPeriod) => listPeriodShowsDrillChevron(period, store.periods);
  let retry: () => Promise<boolean> = async () => false;

  async function run(action: (isCurrent: () => boolean) => Promise<void>): Promise<boolean> {
    const isCurrent = requests.begin();
    retry = () => run(action);
    loading.value = true;
    error.value = null;
    try {
      await action(isCurrent);
      return isCurrent();
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Erreur de chargement';
      return false;
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }

  async function searchRemote() {
    const query = search.value.trim();
    const isCurrent = searchRequests.begin();
    remoteLoading.value = true;
    remoteError.value = null;
    try {
      const hits = await SearchApiService.getInstance().searchLocal(query, { onlyPeriods: true });
      if (isCurrent()) remoteRows.value = hits.filter(hit => hit.type === 'period').map(localSearchHitToPeriod);
    } catch (cause) {
      if (isCurrent()) remoteError.value = cause instanceof Error ? cause.message : 'Erreur de recherche';
    } finally {
      if (isCurrent()) remoteLoading.value = false;
    }
  }
  watch(search, () => {
    searchRequests.cancel();
    clearTimeout(debounce);
    remoteRows.value = [];
    remoteError.value = null;
    remoteLoading.value = remoteActive.value;
    if (remoteActive.value) debounce = setTimeout(() => { void searchRemote(); }, 280);
  });
  onScopeDispose(() => clearTimeout(debounce));

  function cancel() {
    clearTimeout(debounce);
    searchRequests.cancel();
    remoteLoading.value = false;
    remoteError.value = null;
    requests.cancel();
    loading.value = false;
    error.value = null;
  }

  const initialize = () => run(async isCurrent => {
    await store.ensureRootsLoaded();
    if (!isCurrent()) return;
    if (selectedId() && !selectedPeriod.value) {
      const selected = await PeriodApiService.getInstance().getPeriod(selectedId()!);
      if (!isCurrent()) return;
      store.cachePeriod(selected);
    }
    const selected = selectedPeriod.value;
    if (selected) {
      const path = buildPeriodAncestorPathFromLeaf(selected.id, store.periodById);
      for (const id of path) {
        await store.ensureChildrenLoaded(id);
        if (!isCurrent()) return;
      }
    }
    currentParentId.value = selected?.parentId ?? null;
    search.value = '';
  });

  const drillDown = (period: ListPeriod) => run(async isCurrent => {
    if (!store.periodById(period.id)) store.cachePeriod(period);
    await store.ensureChildrenLoaded(period.id);
    if (!isCurrent() || !store.periodById(period.id)) return;
    currentParentId.value = period.id;
    search.value = '';
  });

  function goBack() {
    cancel();
    currentParentId.value = currentParent.value?.parentId ?? null;
    search.value = '';
  }

  function resetNavigation() {
    cancel();
    currentParentId.value = null;
    search.value = '';
  }

  return {
    periods, selectedPeriod, currentParent, currentParentId, search, loading: computed(() => loading.value || remoteLoading.value), error: computed(() => remoteError.value ?? error.value),
    rememberSelection: (id: string) => { const period = periods.value.find(period => period.id === id); if (period) store.cachePeriod(period); },
    hasChildren, initialize, drillDown, goBack, cancel, resetNavigation,
    retry: () => remoteActive.value ? searchRemote() : retry(),
  };
}
