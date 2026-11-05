import { ref, watch } from 'vue';
import type { Story, Event } from '@/types/database';
import type { EditInitialData, EditFormSubmission } from '@/types/editForm';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { EditFormValidator } from '@/validators/editFormValidators';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { useDataStore } from '@/stores/useDataStore';
import { useLatestRequest } from './useLatestRequest';
import { useToast } from './useToast';

/** Reuse the shared event form, then attach the saved/existing event in its original frise. */
export function useStoryEventCreation(story: () => Story | null | undefined, onAdded: () => void) {
  const store = useDataStore();
  const toast = useToast();
  const requests = useLatestRequest();
  const draft = ref<EditInitialData | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);
  let savedDraft: Event | null = null;
  let targetStoryId: string | null = null;

  function reset() {
    savedDraft = null;
    requests.cancel(); draft.value = null; targetStoryId = null;
    busy.value = false; error.value = null;
  }
  watch(() => story()?.id, reset, { flush: 'sync' });
  function open() {
    const storyId = story()?.id;
    if (!storyId || busy.value) return;
    reset(); targetStoryId = storyId; draft.value = {};
  }
  function close() { if (!busy.value) reset(); }
  async function associate(id: string, storyId: string, isCurrent: () => boolean) {
    await StoryApiService.getInstance().changeAssociations(storyId, 'event', [id]);
    store.invalidateStory(storyId); store.invalidateStories();
    if (!isCurrent()) return;
    draft.value = null; targetStoryId = null;
    onAdded(); toast.show('Événement ajouté à la frise', 'success');
  }
  async function selectExisting(id: string) {
    if (!draft.value || !targetStoryId || busy.value) return;
    const storyId = targetStoryId;
    const isCurrent = requests.begin(); busy.value = true; error.value = null;
    try { await associate(id, storyId, isCurrent); }
    catch (cause) { if (isCurrent()) error.value = mutationErrorMessage(cause, 'Impossible d’ajouter cet événement à la frise.'); }
    finally { if (isCurrent()) busy.value = false; }
  }
  async function submit(formData: EditFormSubmission) {
    if (!draft.value || !targetStoryId || busy.value) return;
    const validation = EditFormValidator.validateForm(formData, 'event');
    if (!validation.isValid) { error.value = validation.errors.join(', '); return; }
    const storyId = targetStoryId;
    const isCurrent = requests.begin(); busy.value = true; error.value = null;
    let saved: Event | null = null;
    try {
      const service = EventApiService.getInstance();
      const qid = formData.qid.trim().toUpperCase();
      // Resolve again on retry if the creation response was lost after COMMIT.
      const existing = savedDraft ?? (qid ? await service.getEventById(qid) : null);
      if (!isCurrent()) return;
      saved = existing ?? await service.createEvent({ ...formData, qid });
      if (isCurrent()) savedDraft = saved;
      store.upsertSavedEvent(saved);
      await associate(saved.id, storyId, isCurrent);
    } catch (cause) {
      if (isCurrent()) error.value = saved
        ? `L’événement est enregistré, mais son ajout à la frise a échoué. ${mutationErrorMessage(cause, 'Réessayez.')}`
        : mutationErrorMessage(cause, 'Impossible d’enregistrer cet événement.');
    } finally { if (isCurrent()) busy.value = false; }
  }
  return { draft, busy, error, open, close, selectExisting, submit };
}
