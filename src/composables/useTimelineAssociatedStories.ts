import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { computed } from 'vue';
import { StoryApiService } from '@/services/StoryApiService';
import { useDebouncedSearch } from './useDebouncedSearch';
import type { StoryAnchor, StorySuggestion } from '@/types/database';

/** Read the anchors once per frise, then distribute direct associations to its period cards. */
export function useTimelineAssociatedStories(storyId: () => string, enabled: () => boolean) {
  const { results, loading, error, retry } = useDebouncedSearch(
    storyId,
    async (id, signal) => {
      const story = await StoryApiService.getInstance().getStory(id, { signal });
      const ids = new Set(story.periods.map(period => period.id));
      // Anchors on periods no longer in this frise are ignored: the child falls back to frise level.
      const children = (story.childStories ?? []).map(child => ({ ...child, anchors: child.anchors.filter(anchor => anchor.type !== 'period' || ids.has(anchor.id)) }));
      if (!children.some(child => !child.anchors.length)) return children;
      // A frise-level attachment is offered at the roots of that frise, never at deeper periods.
      const rootAnchors: StoryAnchor[] = story.periods
        .filter(period => { const parent = getStoryPeriodParentId(period); return !parent || !ids.has(parent); })
        .map(period => ({ type: 'period', id: period.id }));
      return children.map(child => child.anchors.length ? child : { ...child, anchors: rootAnchors });
    },
    { delayMs: 0, minLength: 1, enabled },
  );
  const byPeriod = computed(() => {
    const indexed = new Map<string, Map<string, StorySuggestion>>();
    for (const child of results.value) {
      if (child.id === storyId()) continue;
      for (const anchor of child.anchors) {
        if (anchor.type !== 'period') continue;
        const bucket = indexed.get(anchor.id) ?? new Map<string, StorySuggestion>();
        bucket.set(child.id, { id: child.id, title: child.title, parentStoryId: storyId() });
        indexed.set(anchor.id, bucket);
      }
    }
    return new Map([...indexed].map(([id, children]) => [id, [...children.values()]]));
  });
  return { byPeriod, loading, error, retry };
}
