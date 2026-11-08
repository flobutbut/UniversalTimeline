<template>
  <div class="story-settings-form">
    <h3>Paramètres de la frise</h3>
    <template v-if="editable">
      <p v-if="error" role="alert" class="story-settings-form__error">{{ error }}</p>
      <p v-if="hiddenFieldErrors.length" role="alert" class="story-settings-form__error">{{ hiddenFieldErrors.join(' ') }}</p>
      <form class="story-settings-form__form" aria-label="Paramètres de la frise" @submit.prevent="save">
        <fieldset class="form-content" :disabled="busy">
          <div class="form-row">
            <div class="form-group">
              <Input v-model="form.title.fr" label="Titre" placeholder="Titre en français" size="sm" :error="validation.fields['title.fr'] || ''" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <Input v-model="form.description.fr" label="Description" placeholder="Description en français" size="sm" :error="validation.fields['description.fr'] || ''" type="textarea" textarea-size="lg" />
            </div>
          </div>
        </fieldset>
        <div v-if="dirty" class="story-settings-form__actions">
          <Button variant="secondary" size="sm" type="button" :disabled="busy" @click="cancel">Annuler</Button>
          <Button variant="primary" size="sm" type="submit" :disabled="!canSubmit">Enregistrer</Button>
        </div>
      </form>
    </template>
    <dl v-else class="story-settings-form__readonly">
      <dt>Titre</dt><dd>{{ story.title.fr || '—' }}</dd>
      <dt>Description</dt><dd class="story-settings-form__text">{{ story.description?.fr || '—' }}</dd>
      <dt>Visibilité</dt><dd>{{ story.isPublic ? 'Publique' : 'Privée' }}</dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { useStoryDraft } from '@/composables/useStoryDraft';
import type { EditFormSubmission } from '@/types/editForm';
import type { Story } from '@/types/database';

const props = defineProps<{
  story: Story;
  editable: boolean;
  busy?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'save', submission: EditFormSubmission): void;
}>();

// Les textes anglais et l'auteur ne sont pas affichés : le brouillon conserve leurs valeurs enregistrées.
// La visibilité (StoryDangerZone) et les tags (StoryTagsForm) reprennent toujours la frise enregistrée.
const { form, validation, dirty, canSubmit, cancel, submit } = useStoryDraft({
  story: () => props.story, busy: () => props.busy, error: () => props.error, fields: ['text'],
});

/** Champs non affichés mais validés : leur erreur doit rester lisible, sinon l'enregistrement semble bloqué sans raison. */
const hiddenFieldErrors = computed(() => ['title.en', 'description.en', 'author'].map(field => validation.value.fields[field]).filter(Boolean));

function save() {
  const submission = submit();
  if (submission) emit('save', submission);
}
</script>

<style scoped>
.story-settings-form { display: flex; flex-direction: column; gap: var(--spacing-md); max-width: 960px; }
.story-settings-form h3 { font-size: var(--font-size-lg); }
.story-settings-form__form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.story-settings-form__error { color: var(--color-status-error-foreground); }
.form-content { border: 0; padding: 0; margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-row { display: flex; gap: var(--spacing-md); width: 100%; }
.form-group { flex: 1; min-width: 0; }
.story-settings-form__actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
.story-settings-form__readonly { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: var(--spacing-sm) var(--spacing-lg); }
.story-settings-form__readonly dt { color: var(--color-text-secondary); }
.story-settings-form__text { white-space: pre-wrap; }
@media (max-width: 640px) {
  .form-row { flex-direction: column; }
  .story-settings-form__readonly { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-xs); }
  .story-settings-form__readonly dd { margin-bottom: var(--spacing-sm); }
}
</style>
