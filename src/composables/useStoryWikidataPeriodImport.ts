import { ref, watch } from 'vue';
import type { ListPeriod, Period, Story } from '@/types/database';
import type { EditInitialData, EditFormSubmission } from '@/types/editForm';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { EditFormValidator } from '@/validators/editFormValidators';
import { normalizeWikidataQId } from '@/lib/wikidataPeriodSuggestions';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { useDataStore } from '@/stores/useDataStore';
import { useLatestRequest } from './useLatestRequest';
import { useToast } from './useToast';

/** Create/import or reuse a period, then attach it in the captured frise. */
export function useStoryWikidataPeriodImport(story: () => Story | null | undefined, onImported: () => void) {
  const store = useDataStore();
  const toast = useToast();
  const requests = useLatestRequest();
  const draft = ref<EditInitialData | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);
  let savedDraft: Period | null = null;
  let targetStoryId: string | null = null;
  let targetParentId: string | null | undefined;
  let retryTask: (() => Promise<void>) | null = null;

  function reset() {
    savedDraft = null;
    requests.cancel(); draft.value = null; targetStoryId = null; targetParentId = undefined;
    error.value = null; busy.value = false; retryTask = null;
  }
  const close = () => { if (!busy.value) reset(); };
  const retry = () => retryTask?.();
  watch(() => story()?.id, reset, { flush: 'sync' });

  async function associate(period: Period, storyId: string, isCurrent: () => boolean, parentId: string | null) {
    store.upsertSavedPeriod(period);
    await StoryApiService.getInstance().changeAssociations(storyId, 'period', [period.id], false, parentId);
    store.invalidateStory(storyId); store.invalidateStories();
    if (!isCurrent()) return;
    draft.value = null; targetStoryId = null; retryTask = null;
    onImported();
    toast.show('Période ajoutée à la frise', 'success');
  }

  async function open(period: ListPeriod) {
    const storyId = story()?.id;
    if (!storyId || busy.value) return;
    const qid = normalizeWikidataQId(period.wikidata_id);
    if (!qid || !period.parentId || period.parentId.startsWith('wikidata:')) {
      error.value = 'Ajoutez d’abord la période parente à la frise.';
      return;
    }
    const isCurrent = requests.begin();
    busy.value = true; error.value = null;
    retryTask = () => open(period);
    try {
      const existing = await PeriodApiService.getInstance().getPeriodByWikidataId(qid);
      if (!isCurrent()) return;
      if (existing) await associate(existing, storyId, isCurrent, period.parentId);
      else {
        targetStoryId = storyId; targetParentId = period.parentId;
        draft.value = {
          wikidata_id: qid, label: period.label, description: period.description,
          startDate: period.startDate,
          endDate: /^(?:NOW|TODAY)$/i.test(period.endDate.trim()) ? '' : period.endDate,
          parent_id: period.parentId, temporalLocation: period.temporalLocation,
        };
      }
    } catch (cause) {
      if (isCurrent()) error.value = mutationErrorMessage(cause, 'Impossible de préparer l’import de la période.');
    } finally { if (isCurrent()) busy.value = false; }
  }

  function openCreate(parentId: string | null) {
    const storyId = story()?.id;
    if (!storyId || busy.value) return;
    reset(); targetStoryId = storyId; targetParentId = parentId;
    draft.value = { parent_id: parentId };
  }

  async function selectExisting(id: string) {
    if (!draft.value || !targetStoryId || busy.value) return;
    const storyId = targetStoryId; const parentId = targetParentId ?? null;
    const isCurrent = requests.begin(); busy.value = true; error.value = null;
    try {
      const period = await PeriodApiService.getInstance().getPeriod(id);
      if (!isCurrent()) return;
      await associate(period, storyId, isCurrent, parentId);
    } catch (cause) { if (isCurrent()) error.value = mutationErrorMessage(cause, 'Impossible d’ajouter cette période à la frise.'); }
    finally { if (isCurrent()) busy.value = false; }
  }

  async function submit(formData: EditFormSubmission) {
    if (!draft.value || !targetStoryId || busy.value) return;
    const validation = EditFormValidator.validateForm(formData, 'period');
    if (!validation.isValid) { error.value = validation.errors.join(', '); return; }
    const storyId = targetStoryId;
    const parentId = targetParentId !== undefined ? targetParentId : formData.parentId || null;
    const isCurrent = requests.begin();
    busy.value = true; error.value = null;
    let saved: Period | null = null;
    try {
      const service = PeriodApiService.getInstance();
      const qid = formData.qid.trim().toUpperCase();
      // Resolve again on an explicit retry: a previous response may have been lost after COMMIT.
      const existing = savedDraft ?? (qid ? await service.getPeriodByWikidataId(qid) : null);
      if (!isCurrent()) return;
      saved = existing ?? await service.createPeriod({ ...formData, qid });
      if (isCurrent()) savedDraft = saved;
      await associate(saved, storyId, isCurrent, parentId);
    } catch (cause) {
      if (isCurrent()) error.value = saved
        ? `La période est enregistrée, mais son ajout à la frise a échoué. ${mutationErrorMessage(cause, 'Réessayez.')}`
        : mutationErrorMessage(cause, 'Impossible d’enregistrer cette période.');
    } finally { if (isCurrent()) busy.value = false; }
  }

  return { draft, busy, error, open, openCreate, selectExisting, close, submit, retry };
}
