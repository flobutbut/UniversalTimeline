import { WikidataQueryService } from '@/services/WikidataQueryService';
import { mapWikidataClassesToCategories } from '@/services/WikidataCategoryMapper';
import type { TemporalLocation } from '@/types/geological';
import { useLoadingState } from './useLoadingState';

export interface WikidataData {
  label: string | { fr?: string; en?: string };
  description?: { fr: string; en: string };
  date?: string;
  temporalData?: TemporalLocation[];
  children?: any[];
}

export function useWikidataImport() {
  const { isLoading, error, execute } = useLoadingState();
  const wikidataService = WikidataQueryService.getInstance();

  const importPeriod = async (qid: string): Promise<WikidataData | null> => {
    if (!qid) throw new Error('Q-id requis pour l\'import');
    return execute(async () => {
      const data = await wikidataService.loadPeriod(qid);
      if (!data) throw new Error('Aucune donnée trouvée pour ce Q-id');
      return data;
    });
  };

  const importEvent = async (qid: string): Promise<WikidataData | null> => {
    if (!qid) throw new Error('Q-id requis pour l\'import');
    return execute(async () => {
      const data = await wikidataService.loadEvent(qid);
      if (!data) throw new Error('Aucune donnée trouvée pour ce Q-id');
      return data;
    });
  };

  const transformWikidataData = (data: WikidataData, type: 'period' | 'event') => {
    const transformed: any = {};

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

    if (type === 'period' && data.children) {
      transformed.childrenCount = data.children.length.toString();
    }

    return transformed;
  };

  const importAndTransform = async (qid: string, type: 'period' | 'event'): Promise<any> => {
    const importFn = type === 'period' ? importPeriod : type === 'event' ? importEvent : null;
    if (!importFn) throw new Error('Type non supporté pour Wikidata');

    // Requêtes en parallèle : données + classes pour catégories
    const [data, wikidataClasses] = await Promise.all([
      importFn(qid),
      wikidataService.getEntityClasses(qid),
    ]);

    if (!data) throw new Error('Aucune donnée trouvée');

    const transformed = transformWikidataData(data, type);

    // Catégories suggérées — format attendu par EditModal (objects {id, label})
    // On ne fournit que les IDs ici ; EditModal les réconciliera avec la liste complète
    const suggestedCategoryIds = mapWikidataClassesToCategories(wikidataClasses);
    if (suggestedCategoryIds.length > 0) {
      transformed.suggestedCategoryIds = suggestedCategoryIds;
    }

    return transformed;
  };

  return {
    isLoading,
    error,
    importPeriod,
    importEvent,
    transformWikidataData,
    importAndTransform,
  };
}
