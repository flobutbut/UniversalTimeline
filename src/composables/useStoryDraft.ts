import { computed, ref, watch } from 'vue';
import { useEditModal } from './useEditModal';
import type { EditFormData, EditFormSubmission } from '@/types/editForm';
import type { Story } from '@/types/database';

/** Groupes de champs qu'un onglet édite : textes (titres, descriptions, auteur) ou catégories. */
export type StoryDraftFields = 'text' | 'categories';

interface StoryDraftOptions {
  story: () => Story;
  busy: () => boolean | undefined;
  error: () => string | null | undefined;
  fields: StoryDraftFields[];
}

type DraftValues = Pick<EditFormData, 'title' | 'description' | 'author' | 'categories'>;

/**
 * Brouillon d'une frise éditée directement dans un onglet.
 * Seuls les champs de l'onglet font partie du brouillon ; les autres reprennent la frise enregistrée à l'envoi,
 * pour qu'un onglet ne réécrive jamais ce qu'un autre vient de changer.
 */
export function useStoryDraft({ story, busy, error, fields }: StoryDraftOptions) {
  const { form, state, validation, updateForm, prepareSubmitData, loadCategories } = useEditModal('story', 'edit', story());
  const editsText = fields.includes('text');
  const editsCategories = fields.includes('categories');

  const snapshot = (values: DraftValues) => JSON.stringify([
    editsText ? [values.title.fr, values.title.en, values.description.fr, values.description.en, values.author] : null,
    editsCategories ? [...values.categories].sort() : null,
  ]);
  const storySnapshot = computed(() => {
    const saved = story();
    return snapshot({
      title: { fr: saved.title.fr, en: saved.title.en }, description: { fr: saved.description?.fr ?? '', en: saved.description?.en ?? '' },
      author: saved.author ?? '', categories: saved.categories.map(category => category.id),
    });
  });
  const formSnapshot = computed(() => snapshot(form));
  const dirty = computed(() => formSnapshot.value !== storySnapshot.value);

  /** Draft sent with the last save: once the story reloads, an unchanged draft gives way to the saved values. */
  const submittedSnapshot = ref<string | null>(null);
  watch(storySnapshot, (_next, previous) => {
    const untouched = formSnapshot.value === previous || formSnapshot.value === submittedSnapshot.value;
    submittedSnapshot.value = null;
    if (untouched) updateForm(story());
  });
  watch(error, value => { if (value) submittedSnapshot.value = null; });

  // Le catalogue des catégories ne conditionne que les onglets qui les éditent.
  const canSubmit = computed(() => !busy() && dirty.value && validation.value.isValid
    && (!editsCategories || (!state.categoriesLoading && !state.categoriesError)));

  function cancel() {
    if (busy()) return;
    submittedSnapshot.value = null;
    updateForm(story());
  }

  function submit(): EditFormSubmission | null {
    if (!canSubmit.value) return null;
    submittedSnapshot.value = formSnapshot.value;
    const edited = { title: { ...form.title }, description: { ...form.description }, author: form.author, categories: [...form.categories] };
    updateForm(story());
    if (editsText) Object.assign(form, { title: edited.title, description: edited.description, author: edited.author });
    if (editsCategories) form.categories = edited.categories;
    return prepareSubmitData();
  }

  return { form, state, validation, dirty, canSubmit, cancel, submit, loadCategories };
}
