<template>
  <div class="story-tags-form">
    <h3>{{ uiText("Tags de la frise") }}</h3>
    <template v-if="editable">
      <p v-if="error" role="alert" class="story-tags-form__error">{{ uiText(error) }}</p>
      <div v-if="editState.tagsError" class="story-tags-form__error" role="alert">
        {{ uiText(editState.tagsError) }} <Button variant="tertiary" size="sm" type="button" :disabled="busy || editState.tagsLoading" @click="loadTags">{{ uiText("Réessayer") }}</Button>
      </div>
      <form class="story-tags-form__form" :aria-label="uiText('Tags de la frise')" @submit.prevent="save">
        <TagPicker v-model="form.tags" :options="editState.tags" :loading="editState.tagsLoading" :disabled="busy || !!editState.tagsError" :error="validation.fields.tags || ''" />
        <div v-if="dirty" class="story-tags-form__actions">
          <Button variant="secondary" size="sm" type="button" :disabled="busy" @click="cancel">{{ uiText("Annuler") }}</Button>
          <Button variant="primary" size="sm" type="submit" :disabled="!canSubmit">{{ uiText("Enregistrer") }}</Button>
        </div>
      </form>
    </template>
    <template v-else>
      <p v-if="story.tags?.length" class="story-tags-form__tags"><ThematicTags :tags="story.tags" /></p>
      <p v-else class="story-tags-form__empty">{{ uiText("Aucun tag associé à cette frise.") }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import Button from '@/components/base/Button.vue';
import TagPicker from '@/components/TagPicker.vue';
import ThematicTags from '@/components/ThematicTags.vue';
import { useStoryDraft } from '@/composables/useStoryDraft';
import type { EditFormSubmission } from '@/types/editForm';
import type { Story } from '@/types/database';

const props = defineProps<{ story: Story; editable: boolean; busy?: boolean; error?: string | null }>();
const emit = defineEmits<{ (e: 'save', submission: EditFormSubmission): void }>();

const { form, state: editState, validation, dirty, canSubmit, cancel, submit, loadTags } = useStoryDraft({
  story: () => props.story, busy: () => props.busy, error: () => props.error, fields: ['tags'],
});

function save() {
  const submission = submit();
  if (submission) emit('save', submission);
}
</script>

<style scoped>
.story-tags-form { display: flex; flex-direction: column; gap: var(--spacing-md); max-width: 960px; }
.story-tags-form h3 { font-size: var(--font-size-lg); }
.story-tags-form__form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.story-tags-form__error { color: var(--color-status-error-foreground); }
.story-tags-form__empty { margin-bottom: 0; color: var(--color-text-secondary); }
.story-tags-form__actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
.story-tags-form__tags { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin: 0; }
</style>
