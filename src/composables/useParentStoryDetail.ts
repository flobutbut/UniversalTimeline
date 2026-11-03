import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story } from '@/types/database';

/** Détail de la frise choisie comme parente ou source ; une lecture obsolète est annulée. */
export function useParentStoryDetail(parentId: Ref<string | null>) {
  const parent = ref<Story | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let controller: AbortController | null = null;
  onScopeDispose(() => controller?.abort());
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const id = parentId.value;
    parent.value = null;
    error.value = null;
    loading.value = !!id;
    if (!id) return;
    try {
      const detail = await StoryApiService.getInstance().getStory(id, { signal });
      if (!signal.aborted) parent.value = detail;
    } catch {
      if (!signal.aborted) error.value = 'Impossible de charger les périodes de cette frise.';
    } finally {
      if (!signal.aborted) loading.value = false;
    }
  }
  watch(parentId, load);
  return { parent, loading, error, load };
}
