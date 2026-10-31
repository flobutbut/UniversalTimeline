import { inject, onScopeDispose, ref, watch } from 'vue';
import { routeLocationKey } from 'vue-router';
import { readSearchTarget, type SearchTarget } from '@/router/searchTarget';
import { useLatestRequest } from './useLatestRequest';

/** A query destination is consumed only after its view has loaded successfully. */
export function useSearchTarget(
  type: 'period' | 'event',
  ready: () => boolean,
  open: (target: SearchTarget, isCurrent: () => boolean) => Promise<void> | void,
  cancelOpening: () => void,
) {
  const route = inject(routeLocationKey, undefined);
  const requests = useLatestRequest();
  const loading = ref(false);
  const error = ref<string | null>(null);
  let ownsOpening = false;
  function cancel() {
    requests.cancel();
    loading.value = false;
    error.value = null;
    if (ownsOpening) cancelOpening();
    ownsOpening = false;
  }
  async function retry() {
    cancel();
    if (!ready() || !route) return;
    const isCurrent = requests.begin();
    try {
      const target = readSearchTarget(route.query, type);
      if (!target) return;
      ownsOpening = true;
      loading.value = true;
      await open(target, isCurrent);
    } catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible d’ouvrir ce résultat.';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }
  watch([ready, () => route?.query[type], () => route?.query.wikidata], () => { void retry(); }, { immediate: true, flush: 'post' });
  onScopeDispose(cancel);
  return { loading, error, retry, cancel };
}
