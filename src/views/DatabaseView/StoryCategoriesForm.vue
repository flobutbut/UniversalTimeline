<template>
  <div class="story-categories-form">
    <h3>Catégories de la frise</h3>
    <template v-if="editable">
      <p v-if="error" role="alert" class="story-categories-form__error">{{ error }}</p>
      <div v-if="editState.categoriesError" class="story-categories-form__error" role="alert">
        {{ editState.categoriesError }} <button type="button" :disabled="busy || editState.categoriesLoading" @click="loadCategories">Réessayer</button>
      </div>
      <form class="story-categories-form__form" aria-label="Catégories de la frise" @submit.prevent="save">
        <fieldset class="story-categories-form__fields" :disabled="busy">
          <BaseSelect
            :model-value="null"
            compact
            :error="validation.fields.categories || ''"
            :options="addableOptions"
            label="Ajouter une catégorie"
            placeholder="Rechercher une catégorie"
            search-placeholder="Rechercher une catégorie…"
            :no-results-text="editState.categories.length ? 'Toutes les catégories sont déjà ajoutées' : 'Aucune catégorie disponible'"
            :loading="editState.categoriesLoading"
            :disabled="busy || editState.categoriesLoading || !!editState.categoriesError"
            @update:model-value="add"
          />
        </fieldset>
        <ul v-if="selected.length" class="story-categories-form__tags" aria-label="Catégories sélectionnées">
          <li v-for="item in selected" :key="item.id" class="story-categories-form__tag">
            {{ item.label }}
            <button type="button" class="story-categories-form__remove" :disabled="busy" :aria-label="`Retirer ${item.label}`" @click="remove(item.id)">
              <Icon icon="mdi:close" width="14" height="14" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-else class="story-categories-form__empty">Aucune catégorie associée à cette frise.</p>
        <div v-if="dirty" class="story-categories-form__actions">
          <Button variant="secondary" size="sm" type="button" :disabled="busy" @click="cancel">Annuler</Button>
          <Button variant="primary" size="sm" type="submit" :disabled="!canSubmit">Enregistrer</Button>
        </div>
      </form>
    </template>
    <template v-else>
      <ul v-if="story.categories.length" class="story-categories-form__tags" aria-label="Catégories">
        <li v-for="tag in story.categories" :key="tag.id" class="story-categories-form__tag">{{ tag.label.fr }}</li>
      </ul>
      <p v-else class="story-categories-form__empty">Aucune catégorie associée à cette frise.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import BaseSelect from '@/components/base/Select.vue';
import { useStoryDraft } from '@/composables/useStoryDraft';
import type { SelectValue } from '@/lib/selectOptions';
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

const { form, state: editState, validation, dirty, canSubmit, cancel, submit, loadCategories } = useStoryDraft({
  story: () => props.story, busy: () => props.busy, error: () => props.error, fields: ['categories'],
});

/** Les catégories choisies restent hors du champ, qui ne sert qu'à en chercher une à ajouter. */
const selected = computed(() => form.categories.map(id => ({
  id,
  label: editState.categories.find(category => category.id === id)?.label
    ?? props.story.categories.find(category => category.id === id)?.label.fr ?? id,
})));
const addableOptions = computed(() => editState.categories
  .filter(category => !form.categories.includes(category.id))
  .map(category => ({ value: category.id, label: category.label })));

function add(value: SelectValue) {
  if (typeof value !== 'string' || form.categories.includes(value)) return;
  form.categories = [...form.categories, value];
}

function remove(id: string) {
  if (props.busy) return;
  form.categories = form.categories.filter(category => category !== id);
}

function save() {
  const submission = submit();
  if (submission) emit('save', submission);
}
</script>

<style scoped>
.story-categories-form { display: flex; flex-direction: column; gap: var(--spacing-md); max-width: 960px; }
.story-categories-form h3 { font-size: var(--font-size-lg); }
.story-categories-form__form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.story-categories-form__fields { border: 0; padding: 0; margin: 0; min-width: 0; max-width: 480px; }
.story-categories-form__error { color: var(--color-status-error-foreground); }
.story-categories-form__empty { margin-bottom: 0; color: var(--color-text-secondary); }
.story-categories-form__actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
.story-categories-form__tags { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin: 0; padding: 0; list-style: none; }
.story-categories-form__tag { display: inline-flex; align-items: center; gap: var(--spacing-xs); height: var(--field-height-md); padding: 0 var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
.story-categories-form__remove { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: none; color: var(--color-text-secondary); cursor: pointer; }
.story-categories-form__remove:hover:not(:disabled), .story-categories-form__remove:focus-visible { color: var(--color-text); }
.story-categories-form__remove:disabled { cursor: not-allowed; opacity: .5; }
</style>
