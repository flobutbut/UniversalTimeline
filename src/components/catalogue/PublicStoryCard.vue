<template>
  <li ref="element" class="public-story-card">
    <div class="public-story-card__cover" aria-hidden="true">
      <div class="public-story-card__fallback">
        <StoryTimeline v-if="story.previewPeriods?.length || story.previewEvents?.length" :periods="story.previewPeriods" :events="story.previewEvents" compact />
        <Icon v-else icon="mdi:timeline-outline" width="48" height="48" />
      </div>
      <WikipediaImage :titles="story.title" :active="nearViewport" />
    </div>
    <div class="public-story-card__content">
      <div class="public-story-card__heading">
        <h2 class="public-story-card__title"><RouterLink class="public-story-card__open" :to="{ name: 'timeline', query: { story: story.id, entry: 'universe' } }">{{ title }}</RouterLink></h2>
        <p class="public-story-card__span">{{ formatStorySpan(story) }}</p>
      </div>
      <p v-if="description" class="public-story-card__description">{{ description }}</p>
      <div v-if="story.tags?.length" class="public-story-card__tags"><ThematicTags :tags="story.tags" /></div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon } from '@iconify/vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import WikipediaImage from '@/components/WikipediaImage.vue';
import ThematicTags from '@/components/ThematicTags.vue';
import { formatStorySpan } from '@/lib/storyListDates';
import type { StorySummary } from '@/types/database';

const props = defineProps<{ story: StorySummary }>();
const title = computed(() => props.story.title.fr || props.story.title.en || 'Sans titre');
const description = computed(() => props.story.description?.fr || props.story.description?.en || '');
const element = ref<HTMLElement>();
const nearViewport = ref(false);
let observer: IntersectionObserver | undefined;
onMounted(() => {
  if (!element.value) return;
  if (typeof IntersectionObserver === 'undefined') { nearViewport.value = true; return; }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { nearViewport.value = true; observer?.disconnect(); }
  }, { rootMargin: '160px' });
  observer.observe(element.value);
});
onScopeDispose(() => observer?.disconnect());
</script>

<style scoped>
.public-story-card { position: relative; display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-raised); transition: border-color var(--transition-fast); }
.public-story-card:hover { border-color: var(--color-border-strong); }
.public-story-card:has(.public-story-card__open:focus-visible) { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
.public-story-card__cover { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-surface-subtle); }
.public-story-card__fallback { display: flex; flex-direction: column; justify-content: center; height: 100%; padding: var(--spacing-lg); box-sizing: border-box; color: var(--color-text-secondary); --story-timeline-background: var(--color-surface-subtle); }
.public-story-card__fallback > svg { align-self: center; }
.public-story-card__cover :deep(.wikipedia-image) { position: absolute; inset: 0; width: 100%; height: 100%; min-width: 0; margin: 0; border-radius: 0; }
.public-story-card__cover :deep(.wikipedia-image:not(.is-loaded)) { visibility: hidden; }
.public-story-card__content { display: flex; flex: 1; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg); }
.public-story-card__heading { display: flex; flex-direction: column; }
.public-story-card__tags { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-top: auto; padding-top: var(--spacing-sm); }
.public-story-card__title { margin: 0; font-size: var(--font-size-lg); line-height: var(--line-height-control); font-weight: var(--font-weight-semibold); }
.public-story-card__open { color: var(--color-text-primary); text-decoration: none; }
.public-story-card__open::after { content: ''; position: absolute; inset: 0; }
.public-story-card__open:focus-visible { outline: none; }
.public-story-card__description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; margin: 0; color: var(--color-text-secondary); font: var(--type-body); }
.public-story-card__span { margin: 0; font-size: var(--font-size-sm); line-height: var(--line-height-small); color: var(--color-text-secondary); }
</style>
