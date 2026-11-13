import { localizedText, uiText, language } from '@/i18n';
import { watchEffect } from 'vue';
import type { Router } from 'vue-router';
import type { useDataStore } from '@/stores/useDataStore';
import { applyMetadata, pageMetadata, SITE_ORIGIN, timelineStoryId } from './metadata';

/** Use the already-loaded catalogue: navigation must not gain an additional API request. */
export function installSeo(router: Router, data: ReturnType<typeof useDataStore>, allowIndexing: boolean) {
  return watchEffect(() => {
    const route = router.currentRoute.value;
    if (!route.name) return;
    const url = new URL(route.fullPath, SITE_ORIGIN);
    const id = timelineStoryId(url.searchParams);
    const story = route.name === 'timeline' && id ? data.storyById(id) : null;
    // Preserve the initial HTML head while the first catalogue read is pending.
    if (route.name === 'timeline' && !story && (!data.requests.stories || data.requests.stories.loading)) return;
    const publicStory = story?.isPublic === true ? {
      id: story.id, title: localizedText(story.title),
      description: localizedText(story.description),
    } : null;
    const metadata = pageMetadata(url, publicStory, allowIndexing);
    if (language.value === 'en') {
      metadata.title = metadata.title.split(' — ').map(part => publicStory && part === publicStory.title ? part : uiText(part)).join(' — ');
      if (!publicStory?.description) metadata.description = uiText(metadata.description);
    }
    applyMetadata(metadata);
  });
}
