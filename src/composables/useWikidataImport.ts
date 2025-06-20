import { ref } from 'vue';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import type { TemporalLocation } from '@/types/geological';

export interface WikidataImportState {
  loading: boolean;
  error: string | null;
}

export interface WikidataData {
  label: string | { fr?: string; en?: string };
  description?: { fr: string; en: string };
  date?: string;
  temporalData?: TemporalLocation[];
  children?: any[];
}

export function useWikidataImport() {
  const state = ref<WikidataImportState>({
    loading: false,
    error: null
  });

  const wikidataService = WikidataQueryService.getInstance();

  // Import d'une période depuis Wikidata
  const importPeriod = async (qid: string): Promise<WikidataData | null> => {
    if (!qid) {
      throw new Error('Q-id requis pour l\'import');
    }

    state.value.loading = true;
    state.value.error = null;

    try {
      console.log('[useWikidataImport] Début du chargement Wikidata pour Q-id:', qid);
      
      const data = await wikidataService.loadPeriod(qid);
      console.log('[useWikidataImport] Données période reçues:', data);

      if (!data) {
        throw new Error('Aucune donnée trouvée pour ce Q-id');
      }

      return data;
    } catch (error: any) {
      console.error('[useWikidataImport] Erreur lors du chargement depuis Wikidata:', error);
      state.value.error = error.message || 'Erreur lors du chargement depuis Wikidata';
      throw error;
    } finally {
      state.value.loading = false;
    }
  };

  // Import d'un événement depuis Wikidata
  const importEvent = async (qid: string): Promise<WikidataData | null> => {
    if (!qid) {
      throw new Error('Q-id requis pour l\'import');
    }

    state.value.loading = true;
    state.value.error = null;

    try {
      console.log('[useWikidataImport] Début du chargement Wikidata pour événement Q-id:', qid);
      
      const data = await wikidataService.loadEvent(qid);
      console.log('[useWikidataImport] Données événement reçues:', data);

      if (!data) {
        throw new Error('Aucune donnée trouvée pour ce Q-id');
      }

      return data;
    } catch (error: any) {
      console.error('[useWikidataImport] Erreur lors du chargement depuis Wikidata:', error);
      state.value.error = error.message || 'Erreur lors du chargement depuis Wikidata';
      throw error;
    } finally {
      state.value.loading = false;
    }
  };

  // Transformation des données Wikidata pour le formulaire
  const transformWikidataData = (data: WikidataData, type: 'period' | 'event') => {
    const transformed: any = {};

    // Gestion des labels
    if (typeof data.label === 'string') {
      console.log('[useWikidataImport] Label unique reçu:', data.label);
      transformed.title = {
        fr: data.label,
        en: data.label
      };
    } else if (typeof data.label === 'object' && data.label !== null) {
      console.log('[useWikidataImport] Labels reçus:', data.label);
      transformed.title = {
        fr: data.label.fr || '',
        en: data.label.en || ''
      };
    }

    // Gestion des descriptions
    if (data.description) {
      console.log('[useWikidataImport] Descriptions reçues:', data.description);
      transformed.description = {
        fr: data.description.fr || '',
        en: data.description.en || ''
      };
    }

    // Gestion des dates selon le type
    if (type === 'event') {
      if (data.date) {
        console.log('[useWikidataImport] Date reçue:', data.date);
        transformed.date = data.date;
      }
    } else if (type === 'period' && data.temporalData && Array.isArray(data.temporalData) && data.temporalData.length > 0) {
      console.log('[useWikidataImport] Données temporelles reçues:', data.temporalData);
      const temporalData = data.temporalData[0];
      if (temporalData.startDate) {
        transformed.startDate = temporalData.startDate;
      }
      if (temporalData.endDate) {
        transformed.endDate = temporalData.endDate;
      }
      if (temporalData.location) {
        transformed.location = temporalData.location;
      }
    }

    // Gestion des enfants pour les périodes
    if (type === 'period' && data.children) {
      transformed.childrenCount = data.children.length.toString();
    }

    console.log('[useWikidataImport] Données transformées:', transformed);
    return transformed;
  };

  // Import et transformation complète
  const importAndTransform = async (qid: string, type: 'period' | 'event'): Promise<any> => {
    let data: WikidataData | null = null;

    if (type === 'period') {
      data = await importPeriod(qid);
    } else if (type === 'event') {
      data = await importEvent(qid);
    } else {
      throw new Error('Type non supporté pour Wikidata');
    }

    if (!data) {
      throw new Error('Aucune donnée trouvée');
    }

    return transformWikidataData(data, type);
  };

  // Réinitialisation de l'état
  const resetState = () => {
    state.value.loading = false;
    state.value.error = null;
  };

  return {
    state: state.value,
    importPeriod,
    importEvent,
    transformWikidataData,
    importAndTransform,
    resetState
  };
} 