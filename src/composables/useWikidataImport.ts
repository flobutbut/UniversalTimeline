import { WikidataQueryService } from '@/services/WikidataQueryService';
import { mapWikidataClassesToCategories } from '@/services/WikidataCategoryMapper';
import type { TemporalLocation } from '@/types/geological';
import { ref, onScopeDispose } from 'vue';
import { useLatestRequest } from './useLatestRequest';
import { normalizeWikidataId, type WikidataReadOptions } from '@/services/wikidataTransport';
import type { WikidataImportPayload } from '@/lib/wikidataImportFormMerge';

export interface WikidataData {
  label: string | { fr?: string; en?: string };
  description?: { fr: string; en: string };
  date?: string;
  temporalData?: TemporalLocation[];
  children?: unknown[];
  childrenPreloaded?: boolean;
  warnings?: string[];
}

export function useWikidataImport() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const requests = useLatestRequest();
  const wikidataService = WikidataQueryService.getInstance();
  let controller: AbortController | undefined;
  const cancel = () => { requests.cancel(); controller?.abort(); isLoading.value = false; error.value = null; };
  onScopeDispose(cancel);
  async function execute<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    controller?.abort();
    const active = new AbortController(); controller = active;
    const isCurrent = requests.begin();
    isLoading.value = true;
    error.value = null;
    try {
      const result = await operation(active.signal);
      if (active.signal.aborted) throw new DOMException('Import annulé', 'AbortError');
      return result;
    }
    catch (cause) {
      if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Import Wikidata indisponible';
      throw cause;
    } finally { active.abort(); if (isCurrent()) isLoading.value = false; }
  }
  const importPeriod = (qid: string): Promise<WikidataData> => execute(signal => wikidataService.loadPeriod(normalizeWikidataId(qid), { signal }));
  const importEvent = (qid: string): Promise<WikidataData> => execute(signal => wikidataService.loadEvent(normalizeWikidataId(qid), { signal }));

  const transformWikidataData = (data: WikidataData, type: 'period' | 'event') => {
    const transformed: WikidataImportPayload = {};

    if (typeof data.label === 'string') {
      transformed.title = { fr: data.label, en: data.label };
    } else if (typeof data.label === 'object' && data.label !== null) {
      transformed.title = { fr: data.label.fr || '', en: data.label.en || '' };
    }

    if (data.description) {
      transformed.description = { fr: data.description.fr || '', en: data.description.en || '' };
    }

    if (type === 'event') {
      if (data.date) transformed.date = data.date;
    } else if (type === 'period' && data.temporalData?.length) {
      const temporalData = data.temporalData[0];
      if (temporalData.startDate) transformed.startDate = temporalData.startDate;
      if (temporalData.endDate) transformed.endDate = temporalData.endDate;
      if (temporalData.location) transformed.location = temporalData.location;
    }

    if (type === 'period') {
      transformed.childrenCount = data.childrenPreloaded === false ? null : data.children?.length;
    }

    return transformed;
  };

  const importAndTransform = (qid: string, type: 'period' | 'event', options: Pick<WikidataReadOptions, 'force'> = {}): Promise<WikidataImportPayload> => execute(async signal => {
    const read = { ...options, signal };
    const id = normalizeWikidataId(qid);
    if (type !== 'period' && type !== 'event') throw new Error('Type non supporté pour Wikidata');
    const warnings: string[] = [];
    // Optional enrichments must not discard the main data or masquerade as empty results.
    const classes = wikidataService.getEntityClasses(id, read).catch(() => {
      warnings.push('Les catégories suggérées n’ont pas pu être chargées. Vos catégories sont conservées.');
      return [];
    });
    const parent = type === 'period' ? wikidataService.getPartOfParentQid(id, read).catch(() => {
      warnings.push('Le parent Wikidata n’a pas pu être chargé. Choisissez-le manuellement.');
      return null;
    }) : Promise.resolve(null);
    const [data, wikidataClasses, parentQid] = await Promise.all([
      type === 'period' ? wikidataService.loadPeriod(id, read) : wikidataService.loadEvent(id, read), classes, parent,
    ]);
    if (data && 'warnings' in data && Array.isArray(data.warnings)) warnings.push(...data.warnings);
    if (!data) throw new Error('Aucune donnée trouvée pour ce Q-id');
    const transformed = transformWikidataData(data, type);
    if (parentQid) transformed.parentWikidataId = parentQid;
    const suggestedCategoryIds = mapWikidataClassesToCategories(wikidataClasses);
    if (suggestedCategoryIds.length) transformed.suggestedCategoryIds = suggestedCategoryIds;
    if (warnings.length) transformed.warnings = warnings;
    return transformed;
  });

  return {
    isLoading,
    error,
    cancel,
    importPeriod,
    importEvent,
    transformWikidataData,
    importAndTransform,
  };
}
