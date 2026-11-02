<template>
  <ModalShell title="Créer une frise à partir de cette période" height="auto" :busy="busy" @close="$emit('close')">
    <form id="story-from-period-form" class="story-from-period" @submit.prevent="submit">
      <Input v-model="title" label="Titre de la nouvelle frise" required :disabled="busy" :error="titleError" />
      <div class="story-from-period__summary">
        <p class="story-from-period__heading">Sera copié dans la nouvelle frise</p>
        <ul>
          <li><strong>{{ preview.label }}</strong><template v-if="preview.rangeLabel"> · {{ preview.rangeLabel }}</template></li>
          <li>{{ subPeriodsLabel }}</li>
          <li v-if="preview.datesKnown">{{ eventsLabel }}</li>
          <li v-else>Aucun événement : les dates de la période ne sont pas connues.</li>
        </ul>
        <p class="story-from-period__hint">La frise actuelle n’est pas modifiée. La nouvelle frise lui est rattachée sur cette période, avec la même visibilité et les mêmes catégories.</p>
      </div>
      <p v-if="error" role="alert" class="story-from-period__error">{{ error }}</p>
    </form>
    <template #footer-right>
      <Button type="submit" form="story-from-period-form" :disabled="busy || !title.trim()">{{ busy ? 'Création…' : 'Créer la frise' }}</Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
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
const subPeriods = computed(() => props.preview.periodCount - 1);
const subPeriodsLabel = computed(() => subPeriods.value === 0 ? 'Aucune sous-période' : `${subPeriods.value} sous-période${subPeriods.value > 1 ? 's' : ''}`);
const eventsLabel = computed(() => props.preview.eventCount === 0
  ? 'Aucun événement de la frise dans cette plage'
  : `${props.preview.eventCount} événement${props.preview.eventCount > 1 ? 's' : ''} de la frise dans cette plage`);
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
