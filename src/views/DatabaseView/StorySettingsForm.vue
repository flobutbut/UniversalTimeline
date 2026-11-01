<template>
  <div class="story-settings-form">
    <h3>Paramètres de la frise</h3>
    <template v-if="editable">
      <p v-if="error" role="alert" class="story-settings-form__error">{{ error }}</p>
      <div v-if="editState.categoriesError" class="story-settings-form__error" role="alert">
        {{ editState.categoriesError }} <button type="button" :disabled="busy || editState.categoriesLoading" @click="loadCategories">Réessayer</button>
      </div>
      <p v-if="hiddenFieldErrors.length" role="alert" class="story-settings-form__error">{{ hiddenFieldErrors.join(' ') }}</p>
      <form class="story-settings-form__form" aria-label="Paramètres de la frise" @submit.prevent="save">
        <fieldset class="form-content" :disabled="busy">
          <div class="form-row">
            <div class="form-group">
              <Input v-model="form.title.fr" label="Titre" placeholder="Titre en français" :error="validation.fields['title.fr'] || ''" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <Input v-model="form.description.fr" label="Description" placeholder="Description en français" :error="validation.fields['description.fr'] || ''" type="textarea" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <BaseSelect
                v-model="form.categories"
                :error="validation.fields.categories || ''"
                :options="editState.categories.map(cat => ({ value: cat.id, label: cat.label }))"
                label="Catégories"
                placeholder="Sélectionner des catégories"
                :multiple="true"
                :loading="editState.categoriesLoading"
                :disabled="busy || editState.categoriesLoading"
              />
            </div>
          </div>
        </fieldset>
        <div v-if="dirty" class="story-settings-form__actions">
          <Button variant="secondary" size="sm" type="button" :disabled="busy" @click="cancel">Annuler</Button>
          <Button variant="primary" size="sm" type="submit" :disabled="busy || !validation.isValid || editState.categoriesLoading || !!editState.categoriesError">Enregistrer</Button>
        </div>
      </form>
      <section class="story-settings-form__danger" aria-labelledby="story-danger-zone-title">
        <h4 id="story-danger-zone-title">Danger zone</h4>
        <div class="story-settings-form__danger-row">
          <div>
            <p class="story-settings-form__danger-label">Visibilité : {{ story.isPublic ? 'publique' : 'privée' }}</p>
            <p class="story-settings-form__danger-hint">{{ story.isPublic ? 'Une frise privée n’est visible que par vous.' : 'Une frise publique est visible par tous dans la timeline.' }}</p>
          </div>
          <Button variant="danger" size="sm" type="button" :disabled="busy" @click="emit('toggle-visibility')">{{ story.isPublic ? 'Rendre privée' : 'Rendre publique' }}</Button>
        </div>
        <div class="story-settings-form__danger-row">
          <div>
            <p class="story-settings-form__danger-label">Supprimer la frise</p>
            <p class="story-settings-form__danger-hint">La frise est supprimée définitivement ; ses périodes et événements restent dans le catalogue.</p>
          </div>
          <Button variant="danger" size="sm" type="button" :disabled="busy" @click="emit('delete')">Supprimer la frise</Button>
        </div>
      </section>
    </template>
    <dl v-else class="story-settings-form__readonly">
      <dt>Titre</dt><dd>{{ story.title.fr || '—' }}</dd>
      <dt>Description</dt><dd class="story-settings-form__text">{{ story.description?.fr || '—' }}</dd>
      <dt>Visibilité</dt><dd>{{ story.isPublic ? 'Publique' : 'Privée' }}</dd>
      <dt>Catégories</dt>
      <dd>
        <span v-if="!story.categories.length">—</span>
        <span v-else class="story-settings-form__tags"><span v-for="tag in story.categories" :key="tag.id" class="story-settings-form__tag">{{ tag.label.fr }}</span></span>
      </dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import BaseSelect from '@/components/base/Select.vue';
import { useEditModal } from '@/composables/useEditModal';
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
  (e: 'delete'): void;
  (e: 'toggle-visibility'): void;
}>();

// Les textes anglais et l'auteur ne sont pas affichés : le brouillon conserve leurs valeurs enregistrées.
// La visibilité se change dans la danger zone, hors brouillon : l'enregistrement reprend toujours la valeur de la frise.
const { form, state: editState, validation, updateForm, prepareSubmitData, loadCategories } = useEditModal('story', 'edit', props.story);

/** Champs non affichés mais validés : leur erreur doit rester lisible, sinon l'enregistrement semble bloqué sans raison. */
const hiddenFieldErrors = computed(() => ['title.en', 'description.en', 'author'].map(field => validation.value.fields[field]).filter(Boolean));
type SettingsFields = { title: { fr: string; en: string }; description: { fr: string; en: string }; author: string; categories: string[] };
const snapshot = (fields: SettingsFields) => JSON.stringify([
  fields.title.fr, fields.title.en, fields.description.fr, fields.description.en, fields.author, [...fields.categories].sort(),
]);
const storySnapshot = computed(() => snapshot({
  title: props.story.title, description: { fr: props.story.description?.fr ?? '', en: props.story.description?.en ?? '' },
  author: props.story.author ?? '', categories: props.story.categories.map(category => category.id),
}));
const formSnapshot = computed(() => snapshot(form));
const dirty = computed(() => formSnapshot.value !== storySnapshot.value);

/** Draft sent with the last save: once the story reloads, an unchanged draft gives way to the saved values. */
const submittedSnapshot = ref<string | null>(null);
watch(storySnapshot, (next, previous) => {
  const untouched = formSnapshot.value === previous || formSnapshot.value === submittedSnapshot.value;
  submittedSnapshot.value = null;
  if (untouched) updateForm(props.story);
});
watch(() => props.error, error => { if (error) submittedSnapshot.value = null; });

function cancel() {
  if (props.busy) return;
  submittedSnapshot.value = null;
  updateForm(props.story);
}

function save() {
  if (props.busy || !dirty.value || !validation.value.isValid || editState.categoriesLoading || editState.categoriesError) return;
  submittedSnapshot.value = formSnapshot.value;
  emit('save', { ...prepareSubmitData(), isPublic: props.story.isPublic });
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
.story-settings-form__danger { margin-top: var(--spacing-lg); border: 1px solid var(--color-status-error-foreground); border-radius: var(--radius-md); }
.story-settings-form__danger h4 { margin: 0; padding: var(--spacing-lg); font-size: var(--font-size-base); color: var(--color-status-error-foreground); border-bottom: 1px solid var(--color-border); }
.story-settings-form__danger-row { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-md); padding: var(--spacing-lg); }
.story-settings-form__danger-row + .story-settings-form__danger-row { border-top: 1px solid var(--color-border); }
.story-settings-form__danger-label { margin-bottom: 0; font-weight: 600; }
.story-settings-form__danger-hint { margin-bottom: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.story-settings-form__readonly { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 8px 16px; }
.story-settings-form__readonly dt { color: var(--color-text-secondary); }
.story-settings-form__text { white-space: pre-wrap; }
.story-settings-form__tags { display: flex; flex-wrap: wrap; gap: 8px; }
.story-settings-form__tag { padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
@media (max-width: 640px) {
  .form-row { flex-direction: column; }
  .story-settings-form__readonly { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .story-settings-form__readonly dd { margin-bottom: 8px; }
}
</style>
