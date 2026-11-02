<template>
  <div class="anchored-story-row">
    <RouterLink :to="{ name: 'database', query: { story: story.id } }" class="anchored-story-row__link">
      <span class="anchored-story-row__title">{{ story.title.fr }}</span>
      <span v-if="summary" class="anchored-story-row__meta">{{ formatStoryListDateRangeSublabel(summary) }}<span v-if="summary.previewPeriods"> · {{ summary.previewPeriods.length }} périodes</span><span v-if="summary.previewEvents"> · {{ summary.previewEvents.length }} événements</span></span>
    </RouterLink>
    <button type="button" class="anchored-story-row__remove" :disabled="disabled" :aria-label="`Détacher ${story.title.fr}`" @click="$emit('remove')"><DesignIcon name="close" /></button>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DesignIcon from '@/components/base/DesignIcon.vue';
import { formatStoryListDateRangeSublabel } from '@/lib/formatTemporalBoundLabel';
import type { ChildStorySummary, StorySummary } from '@/types/database';
defineProps<{ story: ChildStorySummary; summary?: StorySummary; disabled?: boolean }>();
defineEmits<{ remove: [] }>();
</script>
<style scoped>
.anchored-story-row { display: flex; align-items: center; min-height: 56px; padding: var(--spacing-md); background: var(--color-interaction-selected); color: var(--color-status-success-foreground); }
.anchored-story-row__link { display: flex; flex: 1; min-width: 0; flex-direction: column; color: inherit; line-height: var(--line-height-small); }
.anchored-story-row__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anchored-story-row__meta { font-size: var(--font-size-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anchored-story-row__remove { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; opacity: 0; color: inherit; }
.anchored-story-row:hover .anchored-story-row__remove, .anchored-story-row:focus-within .anchored-story-row__remove { opacity: 1; }
.anchored-story-row__link:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
@media (hover: none) { .anchored-story-row__remove { opacity: 1; } }
</style>
