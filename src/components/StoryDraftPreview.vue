<script setup lang="ts">
import { uiText } from "@/i18n";
import Input from '@/components/base/Input.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import type { StoryTimelinePeriod, StoryTimelineEvent } from '@/types/storyTimeline';

const title = defineModel<string>('title', { required: true });
const description = defineModel<string>('description', { required: true });
withDefaults(defineProps<{
  periods?: StoryTimelinePeriod[];
  events?: StoryTimelineEvent[];
  disabled?: boolean;
  sourceUrl?: string;
  sourceLabel?: string;
}>(), { periods: () => [], events: () => [], disabled: false, sourceUrl: '', sourceLabel: 'Voir la source' });
const emit = defineEmits<{ 'select-period': [id: string]; 'select-event': [id: string] }>();
</script>

<template>
  <section class="story-draft-preview" :aria-label="uiText('Aperçu de la frise')">
    <Input v-model="title" :label="uiText('Titre de la frise')" :maxlength="255" :disabled="disabled" required />
    <Input v-model="description" :label="uiText('Description de la frise')" type="textarea" :maxlength="1000" :disabled="disabled" />
    <a v-if="sourceUrl" :href="sourceUrl" target="_blank" rel="noopener noreferrer">{{ uiText(sourceLabel) }}<span class="sr-only"> {{ uiText("(nouvel onglet)") }}</span></a>
    <div v-if="periods.length || events.length" class="story-draft-preview__timeline" role="region" :aria-label="uiText('Aperçu visuel de la frise')">
      <StoryTimeline compact collapsible :periods="periods" :events="events" @select-period="emit('select-period', $event)" @select-event="emit('select-event', $event)" />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.story-draft-preview { display: flex; flex-direction: column; gap: var(--spacing-md); min-width: 0; }
.story-draft-preview__timeline { min-width: 0; margin-top: var(--spacing-md); }
</style>
