<template>
  <div class="anchored-story-row" :draggable="!!draggable && !disabled">
    <RouterLink :to="{ name: 'database', query: { story: story.id } }" :draggable="false" class="anchored-story-row__link">
      <span class="anchored-story-row__title">{{ story.title.fr }}</span>
      <span v-if="summary" class="anchored-story-row__meta">{{ formatStoryListDateRangeSublabel(summary) }}<span v-if="summary.previewPeriods"> · {{ summary.previewPeriods.length }} périodes</span><span v-if="summary.previewEvents"> · {{ summary.previewEvents.length }} événements</span></span>
    </RouterLink>
    <StoryItemActionsMenu v-if="columnActions" :label="story.title.fr || story.title.en" :view-to="{ name: 'database', query: { story: story.id } }"
      movable :disabled="disabled" :read-only="readOnly" :display-as-period="displayAsPeriod" @move="$emit('move')" @display="$emit('display')" @remove="$emit('remove')" />
    <button v-else-if="!readOnly" type="button" class="anchored-story-row__remove" :disabled="disabled" :aria-label="`Détacher ${story.title.fr}`" @click="$emit('remove')"><DesignIcon name="close" /></button>
    <button v-if="explorable" type="button" class="anchored-story-row__explore" :aria-label="`Explorer ${story.title.fr || story.title.en} en lecture seule`"
      :aria-expanded="explored" :disabled="disabled" @click.stop="$emit('explore')"><ChevronIcon :width="16" :height="16" /></button>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DesignIcon from '@/components/base/DesignIcon.vue';
import ChevronIcon from '@/components/icons/ChevronIcon.vue';
import StoryItemActionsMenu from './StoryItemActionsMenu.vue';
import { formatStoryListDateRangeSublabel } from '@/lib/formatTemporalBoundLabel';
import type { ChildStorySummary, StorySummary } from '@/types/database';
defineProps<{ story: ChildStorySummary; summary?: StorySummary; disabled?: boolean; draggable?: boolean;
  columnActions?: boolean; readOnly?: boolean; displayAsPeriod?: boolean; explorable?: boolean; explored?: boolean }>();
defineEmits<{ remove: []; move: []; display: []; explore: [] }>();
</script>
<style scoped>
.anchored-story-row { display: flex; align-items: center; min-height: 56px; padding: var(--spacing-md); background: var(--color-interaction-selected); color: var(--color-status-success-foreground); }
.anchored-story-row__link { display: flex; flex: 1; min-width: 0; flex-direction: column; color: inherit; line-height: var(--line-height-small); }
.anchored-story-row__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anchored-story-row__meta { font-size: var(--font-size-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anchored-story-row__remove { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; opacity: 0; color: inherit; }
.anchored-story-row:hover .anchored-story-row__remove, .anchored-story-row:focus-within .anchored-story-row__remove { opacity: 1; }
.anchored-story-row__link:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
.anchored-story-row__explore { display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: var(--spacing-xs); border: 0; background: transparent; color: inherit; cursor: pointer; }
.anchored-story-row__explore:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
@media (hover: none) { .anchored-story-row__remove { opacity: 1; } }
</style>
