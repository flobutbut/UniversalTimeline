import { getCurrentScope, onScopeDispose, ref } from 'vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDataStore } from '@/stores/useDataStore';
import { useLatestRequest } from './useLatestRequest';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';

/** Frises de chaque période ou événement, en lecture pour les listes et en écriture une frise à la fois. */
export function useStoryLinks(kind: 'period' | 'event') {
  const dataStore = useDataStore();
  const links = ref(new Map<string, string[]>());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pending = ref<string | null>(null);
  const changeError = ref<string | null>(null);
  const requests = useLatestRequest();
  let controller: AbortController | null = null;
  if (getCurrentScope()) onScopeDispose(() => controller?.abort());

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const isCurrent = requests.begin();
    loading.value = true;
    error.value = null;
    try {
      const [next] = await Promise.all([StoryApiService.getInstance().getMemberships(kind, { signal }), dataStore.ensureStoriesLoaded()]);
      if (isCurrent()) links.value = next;
    } catch (cause) {
      if (isCurrent() && !signal.aborted) error.value = cause instanceof Error ? cause.message : 'Frises indisponibles.';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }

  const storyIdsOf = (id: string) => links.value.get(id) ?? [];
  const sortKeyOf = (id: string) => storyIdsOf(id)
    .map(storyId => { const title = dataStore.storyById(storyId)?.title; return title?.fr || title?.en || `Frise ${storyId}`; })
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).join('\u0000');

  /** One transaction per change; a lost response is reported, never resent. */
  async function change(id: string, storyId: string, remove: boolean) {
    if (pending.value) return false;
    pending.value = storyId;
    changeError.value = null;
    try {
      await StoryApiService.getInstance().changeAssociations(storyId, kind, [id], remove);
      const current = storyIdsOf(id);
      const next = new Map(links.value);
      next.set(id, remove ? current.filter(other => other !== storyId) : [...new Set([...current, storyId])]);
      links.value = next;
      dataStore.invalidateStory(storyId);
      return true;
    } catch (cause) {
      changeError.value = mutationErrorMessage(cause, `Impossible de modifier les frises de ${kind === 'period' ? 'cette période' : 'cet événement'}.`);
      return false;
    } finally {
      pending.value = null;
    }
  }

  return { links, loading, error, pending, changeError, load, storyIdsOf, sortKeyOf, change };
}
