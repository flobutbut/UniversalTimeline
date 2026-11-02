import { computed } from 'vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story } from '@/types/database';
import { storyNavigationLinks, indexStoryNavigationLinks } from '@/lib/storyNavigationLinks';
import { useDebouncedSearch } from './useDebouncedSearch';

/** Read the anchors once per frise, then distribute direct associations to its period cards. */
export function useTimelineAssociatedStories(storyId: () => string, enabled: () => boolean, loadStory?: (id: string, signal: AbortSignal) => Promise<Story>) {
  const { results, loading, error, retry } = useDebouncedSearch(
    storyId,
    async (id, signal) => storyNavigationLinks(await (loadStory ? loadStory(id, signal) : StoryApiService.getInstance().getStory(id, { signal }))),
    { delayMs: 0, minLength: 1, enabled },
  );
  const byPeriod = computed(() => indexStoryNavigationLinks(results.value, 'period'));
  const byEvent = computed(() => indexStoryNavigationLinks(results.value, 'event'));
  return { byPeriod, byEvent, loading, error, retry };
}
