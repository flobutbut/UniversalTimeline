import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { adminApi } from '@/services/AdminApiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import type { RelationsContent, RelationsNetwork } from '@/types/adminRelations';

/** Bounded reads through the existing admin endpoints, including private frises. */
export function useAdminTimelines() {
  const auth = useAuthStore();
  const network = shallowRef<RelationsNetwork | null>(null);
  const contents = shallowRef(new Map<string, RelationsContent>());
  const failures = shallowRef(new Set<string>());
  const loading = ref(false);
  const error = ref('');
  const completed = ref(0);
  let controller: AbortController | undefined;
  let request = 0;

  function clear() {
    request++;
    controller?.abort();
    network.value = null;
    contents.value = new Map();
    failures.value = new Set();
    completed.value = 0;
    loading.value = false;
    error.value = '';
  }

  async function load() {
    clear();
    if (!auth.isAdmin) return;
    controller = new AbortController();
    const { signal } = controller;
    const current = request;
    const active = () => current === request && !signal.aborted;
    loading.value = true;
    try {
      const result = await adminApi.relations(signal);
      if (!active()) return;
      network.value = result;
      const read = new Map<string, RelationsContent>();
      const failed = new Set<string>();
      let index = 0;
      async function worker() {
        while (active() && index < result.stories.length) {
          const story = result.stories[index++];
          try { read.set(story.id, await adminApi.relationStory(story.id, signal)); }
          catch { if (active()) failed.add(story.id); }
          if (active()) completed.value++;
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, result.stories.length) }, worker));
      if (active()) { contents.value = read; failures.value = failed; }
    } catch (cause) {
      if (active()) error.value = mutationErrorMessage(cause, 'Lecture des frises impossible.');
    } finally { if (active()) loading.value = false; }
  }

  watch(() => auth.identityVersion, () => { void load(); });
  onBeforeUnmount(clear);
  return { network, contents, failures, loading, error, completed, load };
}
