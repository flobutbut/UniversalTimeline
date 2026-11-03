import { ref, watch } from 'vue';
import type { ListEvent, ListPeriod } from '@/types/database';
import type { EditInitialData, EditFormSubmission } from '@/types/editForm';
import { EventApiService } from '@/services/EventApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EditFormValidator } from '@/validators/editFormValidators';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { useDataStore } from '@/stores/useDataStore';
import { useLatestRequest } from './useLatestRequest';
import { useToast } from './useToast';

type Source = { kind: 'period' | 'event'; id: string };

/**
 * Converts a catalogue period into an event or the reverse, through the shared form prefilled with the
 * source record. The server replaces the record in every frise; a lost response is never resent automatically.
 */
export function useCatalogueConversion(storyId: () => string | null | undefined, onConverted: () => void) {
  const store = useDataStore();
  const toast = useToast();
  const requests = useLatestRequest();
  const draft = ref<EditInitialData | null>(null);
  const source = ref<Source | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);

  function reset() {
    requests.cancel(); draft.value = null; source.value = null;
    busy.value = false; error.value = null;
  }
  watch(storyId, reset, { flush: 'sync' });

  const common = (item: ListPeriod | ListEvent): EditInitialData => ({
    qid: item.wikidata_id ?? '', label: { ...item.label }, description: item.description ? { ...item.description } : null,
    categories: item.categories.map(category => ({ id: category.id })),
  });
  /** An event keeps the start of the period; its duration is deliberately not carried over. */
  function fromPeriod(period: ListPeriod) {
    if (busy.value || period.id.startsWith('wikidata:')) return;
    reset(); source.value = { kind: 'period', id: period.id };
    draft.value = { ...common(period), date: period.startDate };
  }
  /** A period starts at the event; its end is left for the user to set. */
  function fromEvent(event: ListEvent) {
    if (busy.value) return;
    reset(); source.value = { kind: 'event', id: event.id };
    draft.value = { ...common(event), startDate: event.date, endDate: '' };
  }
  function close() { if (!busy.value) reset(); }

  async function submit(formData: EditFormSubmission) {
    const from = source.value;
    if (!from || busy.value) return;
    const target = from.kind === 'period' ? 'event' : 'period';
    const validation = EditFormValidator.validateForm(formData, target);
    if (!validation.isValid) { error.value = validation.errors.join(', '); return; }
    const isCurrent = requests.begin(); busy.value = true; error.value = null;
    const qid = formData.qid.trim().toUpperCase();
    try {
      if (from.kind === 'period') {
        const event = await PeriodApiService.getInstance().convertToEvent(from.id, { ...formData, qid });
        store.removeDeletedPeriod({ id: from.id, parent: null });
        store.upsertSavedEvent(event);
      } else {
        const period = await EventApiService.getInstance().convertToPeriod(from.id, { ...formData, qid });
        store.updateEvents(store.events.filter(event => event.id !== from.id));
        store.upsertSavedPeriod(period);
      }
      store.invalidateStories();
      if (!isCurrent()) return;
      reset();
      onConverted();
      toast.show(target === 'event' ? 'Période convertie en événement' : 'Événement converti en période', 'success');
    } catch (cause) {
      if (isCurrent()) error.value = mutationErrorMessage(cause, 'Impossible de convertir cette fiche. Rechargez la frise avant de réessayer.');
    } finally { if (isCurrent()) busy.value = false; }
  }
  return { draft, source, busy, error, fromPeriod, fromEvent, close, submit };
}
