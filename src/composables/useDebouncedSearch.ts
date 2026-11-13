import { language } from '@/i18n';
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useLatestRequest } from './useLatestRequest';

/** Independent search state: a failed request never becomes a successful empty list. */
export function useDebouncedSearch<T>(
  query: () => string,
  fetch: (query: string, signal: AbortSignal) => Promise<T[]>,
  options: { delayMs?: number; minLength?: number; enabled?: () => boolean; timeoutMs?: number; criteria?: () => unknown } = {},
) {
  const results = shallowRef<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const requests = useLatestRequest();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const eligible = () => (options.enabled?.() ?? true) && query().trim().length >= (options.minLength ?? 2);

  function cancel() {
    clearTimeout(timer);
    clearTimeout(deadline);
    requests.cancel();
    controller?.abort();
    loading.value = false;
    error.value = null;
    results.value = [];
  }

  async function run() {
    cancel();
    if (!eligible()) return;
    const value = query().trim();
    const isCurrent = requests.begin();
    controller = new AbortController();
    const signal = controller.signal;
    loading.value = true;
    const timeout = setTimeout(() => {
      if (!isCurrent()) return;
      requests.cancel();
      controller?.abort();
      loading.value = false;
      error.value = 'La recherche met trop de temps. Réessayez.';
    }, options.timeoutMs ?? 15000);
    deadline = timeout;
    try {
      const rows = await fetch(value, signal);
      if (isCurrent()) results.value = rows;
    } catch (cause) {
      if (isCurrent() && !signal.aborted) error.value = cause instanceof Error ? cause.message : 'Recherche indisponible. Réessayez.';
    } finally {
      clearTimeout(timeout);
      if (deadline === timeout) deadline = undefined;
      if (isCurrent()) loading.value = false;
    }
  }

  watch([query, language, () => options.enabled?.() ?? true, () => options.criteria?.()], () => {
    cancel();
    if (!eligible()) return;
    loading.value = true;
    timer = setTimeout(() => { void run(); }, options.delayMs ?? 280);
  }, { immediate: true, flush: 'sync' });
  onScopeDispose(cancel);
  return { results, loading, error, retry: run, cancel };
}
