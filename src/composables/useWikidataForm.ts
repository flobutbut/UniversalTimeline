import { ref, watch, onScopeDispose } from 'vue';
import type { EditFormData } from './useEditModal';
import { useLatestRequest } from './useLatestRequest';
import { useDebouncedSearch } from './useDebouncedSearch';
import { useWikidataImport } from './useWikidataImport';
import { SearchApiService, type WikidataEntityLabelHit } from '@/services/SearchApiService';
import { applyWikidataImportPayloadToFormDraft } from '@/lib/wikidataImportFormMerge';
import { normalizeWikidataId } from '@/services/wikidataTransport';

/** Form import lifecycle; presentation and popup positioning stay in EditModal. */
export function useWikidataForm(options: {
  form: EditFormData;
  context: () => { open: boolean; mode: string; type: 'period' | 'event' | 'story'; data: unknown; busy?: boolean };
  categoryIds: () => ReadonlySet<string>;
  onChildrenCount: (count: number | null) => void;
  onImported?: () => void;
}) {
  const { form } = options;
  const query = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);
  const retryAvailable = ref(false);
  let lookup: AbortController | undefined;
  const requests = useLatestRequest();
  const importer = useWikidataImport();
  let applying = false;
  let retryTarget: string | null = null;
  const search = useDebouncedSearch(
    () => query.value,
    (q, signal) => SearchApiService.getInstance().searchWikidataEntityLabels(q, { restrictToEventConcepts: options.context().type === 'event', signal }),
    { enabled: () => options.context().open && options.context().mode === 'create' && options.context().type !== 'story' && !options.context().busy && !loading.value },
  );

  function cancel() {
    requests.cancel(); importer.cancel(); lookup?.abort(); loading.value = false; retryAvailable.value = false;
    error.value = null; notice.value = null; retryTarget = null;
  }
  // A new draft, a manual edit or dismissal invalidates every remaining import step.
  watch(form, () => { if (!applying) cancel(); }, { deep: true, flush: 'sync' });
  watch(() => options.context(), () => { cancel(); query.value = ''; }, { flush: 'sync' });
  onScopeDispose(cancel);

  async function importQid(qid: string, force = false) {
    const context = options.context();
    if (!context.open || context.busy || context.type === 'story') return;
    lookup?.abort(); const active = new AbortController(); lookup = active;
    const isCurrent = requests.begin();
    retryTarget = qid;
    loading.value = true; error.value = null; notice.value = null; retryAvailable.value = false;
    try {
      const payload = await importer.importAndTransform(qid, context.type, { force });
      if (!isCurrent()) return;
      const warnings = [...payload.warnings ?? []];
      applying = true;
      try {
        applyWikidataImportPayloadToFormDraft(form, payload, { availableCategoryIds: options.categoryIds(), onChildrenCount: options.onChildrenCount });
        form.qid = normalizeWikidataId(qid);
      } finally { applying = false; }
      retryAvailable.value = warnings.length > 0;
      notice.value = warnings.join(' ') || 'Données chargées depuis Wikidata.';
      query.value = '';
      options.onImported?.();
    } catch (cause) {
      if (isCurrent()) { error.value = cause instanceof Error ? cause.message : 'Import Wikidata indisponible. Réessayez.'; retryAvailable.value = true; }
    } finally { active.abort(); if (isCurrent()) loading.value = false; }
  }
  return {
    query, search, loading, error, notice, retryAvailable, cancel,
    importCurrent: () => importQid(form.qid),
    pick: (hit: WikidataEntityLabelHit) => importQid(hit.id),
    retry: () => retryTarget ? importQid(retryTarget, true) : Promise.resolve(),
  };
}
