<template>
  <ModalShell :title="uiText('Créer une frise à partir de cette période')" height="auto" :busy="busy" @close="$emit('close')">
    <form id="story-from-period-form" class="story-from-period" @submit.prevent="submit">
      <Input v-model="title" :label="uiText('Titre de la nouvelle frise')" required :disabled="busy" :error="titleError" />
      <div class="story-from-period__summary">
        <p class="story-from-period__heading">{{ uiText("La nouvelle frise contiendra") }}</p>
        <ul>
          <li><strong>{{ uiText(preview.label) }}</strong><template v-if="preview.rangeLabel"> · {{ uiText(preview.rangeLabel) }}</template></li>
          <li>{{ uiText(subPeriodsLabel) }}</li>
          <li v-if="preview.datesKnown">{{ uiText(eventsLabel) }}</li>
          <li v-else>{{ uiText("Aucun événement : les dates de la période ne sont pas connues.") }}</li>
          <li v-if="preview.linkedStoryCount">{{ uiText(linkedLabel) }}</li>
        </ul>
        <p class="story-from-period__hint">{{ uiText("La période reste dans la frise actuelle et y ouvre la nouvelle frise, qui lui est rattachée avec la même visibilité et les mêmes catégories.") }}<template v-if="preview.movedPeriodCount"> {{ uiText("Les sous-périodes quittent la frise actuelle pour éviter une structure en double.") }}</template></p>
      </div>
      <p v-if="error" role="alert" class="story-from-period__error">{{ uiText(error) }}</p>
    </form>
    <template #footer-right>
      <Button type="submit" form="story-from-period-form" :disabled="busy || !title.trim()">{{ uiText(busy ? 'Création…' : 'Créer la frise') }}</Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, ref } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import type { StoryFromPeriodPreview } from '@/lib/storyFromPeriod';

const props = defineProps<{ preview: StoryFromPeriodPreview; busy?: boolean; error?: string | null }>();
const emit = defineEmits<{ close: []; confirm: [title: string] }>();
const title = ref(props.preview.label);
const touched = ref(false);
const titleError = computed(() => touched.value && !title.value.trim() ? 'Le titre est obligatoire.' : '');
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;
const subPeriodsLabel = computed(() => props.preview.movedPeriodCount === 0 ? 'Aucune sous-période'
  : uiFormat`${plural(props.preview.movedPeriodCount, 'sous-période')}, déplacée${props.preview.movedPeriodCount > 1 ? 's' : ''} depuis la frise actuelle`);
const eventsLabel = computed(() => props.preview.eventCount === 0
  ? 'Aucun événement de la frise dans cette plage'
  : uiFormat`${plural(props.preview.eventCount, 'événement')} de la frise dans cette plage, copié${props.preview.eventCount > 1 ? 's' : ''}`);
const linkedLabel = computed(() => uiFormat`${plural(props.preview.linkedStoryCount, 'frise')} reliée${props.preview.linkedStoryCount > 1 ? 's' : ''} à ces sous-périodes, rattachée${props.preview.linkedStoryCount > 1 ? 's' : ''} à la nouvelle frise`);
function submit() {
  touched.value = true;
  if (!props.busy && title.value.trim()) emit('confirm', title.value.trim());
}
</script>

<style scoped>
.story-from-period { display: flex; flex-direction: column; gap: var(--spacing-md); }
.story-from-period__summary { display: flex; flex-direction: column; gap: var(--spacing-xs); font-size: var(--font-size-sm); line-height: var(--line-height-body); }
.story-from-period__heading { margin: 0; color: var(--color-text-secondary); }
.story-from-period__summary ul { margin: 0; padding-left: var(--spacing-lg); color: var(--color-text-primary); }
.story-from-period__hint { margin: var(--spacing-xs) 0 0; color: var(--color-text-secondary); }
.story-from-period__error { margin: 0; color: var(--color-status-error-foreground); font-size: var(--font-size-sm); }
</style>
