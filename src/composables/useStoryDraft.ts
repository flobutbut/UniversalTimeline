import { computed, ref, watch } from 'vue';
import { useEditModal } from './useEditModal';
import type { EditFormData, EditFormSubmission } from '@/types/editForm';
import type { Story } from '@/types/database';

/** Groupes de champs qu'un onglet édite : textes (titres, descriptions, auteur) ou tags. */
export type StoryDraftFields = 'text' | 'tags';

interface StoryDraftOptions {
  story: () => Story;
  busy: () => boolean | undefined;
  error: () => string | null | undefined;
  fields: StoryDraftFields[];
}

type DraftValues = Pick<EditFormData, 'title' | 'description' | 'author' | 'tags'>;

/**
 * Brouillon d'une frise éditée directement dans un onglet.
 * Seuls les champs de l'onglet font partie du brouillon ; les autres reprennent la frise enregistrée à l'envoi,
 * pour qu'un onglet ne réécrive jamais ce qu'un autre vient de changer.
 */
export function useStoryDraft({ story, busy, error, fields }: StoryDraftOptions) {
  const { form, state, validation, updateForm, prepareSubmitData, loadTags } = useEditModal('story', 'edit', story());
  const editsText = fields.includes('text');
  const editsTags = fields.includes('tags');

  const snapshot = (values: DraftValues) => JSON.stringify([
    editsText ? [values.title.fr, values.title.en, values.description.fr, values.description.en, values.author] : null,
    editsTags ? [...values.tags] : null,
  ]);
  const storySnapshot = computed(() => {
    const saved = story();
    return snapshot({
      title: { fr: saved.title.fr, en: saved.title.en }, description: { fr: saved.description?.fr ?? '', en: saved.description?.en ?? '' },
      author: saved.author ?? '', tags: saved.tags?.map(tag => tag.id) ?? [],
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

  // La grille des tags ne conditionne que les onglets qui les éditent.
  const canSubmit = computed(() => !busy() && dirty.value && validation.value.isValid
    && (!editsTags || (!state.tagsLoading && !state.tagsError)));

  function cancel() {
    if (busy()) return;
    submittedSnapshot.value = null;
    updateForm(story());
  }

  function submit(): EditFormSubmission | null {
    if (!canSubmit.value) return null;
    submittedSnapshot.value = formSnapshot.value;
    const edited = { title: { ...form.title }, description: { ...form.description }, author: form.author, tags: [...form.tags] };
    updateForm(story());
    if (editsText) Object.assign(form, { title: edited.title, description: edited.description, author: edited.author });
    if (editsTags) form.tags = edited.tags;
    return prepareSubmitData();
  }

  return { form, state, validation, dirty, canSubmit, cancel, submit, loadTags };
}
