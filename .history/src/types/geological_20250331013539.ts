// Types pour les éons principaux
export const MAIN_EONS = {
  HADEAN: 'Q104460',
  ARCHEAN: 'Q104168',
  PROTEROZOIC: 'Q104162',
  PHANEROZOIC: 'Q101313'
} as const;

// Types pour les catégories de périodes
export const PERIOD_CATEGORIES = {
  EON: 'Q23387',           // éon
  ERA: 'Q3253162',         // ère
  PERIOD: 'Q186081',       // période
  EPOCH: 'Q11514315',      // époque
  AGE: 'Q47018901'         // âge
} as const;

// Version complète d'une période
export interface Period {
  id: string;
  label: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  categoryIds: string[];            // IDs des catégories pour filtrage
  categoryLabels: string[];         // Labels des catégories pour affichage
  location?: string;                // Localisation principale (simplifiée)
  childrenPreloaded: boolean;       // Indique si les enfants sont préchargés
  children: SimplePeriod[];         // Liste des périodes enfants simplifiées
  loading: boolean;                 // État de chargement
  isMainEon: boolean;              // Indique si c'est un éon principal
}

// Version simplifiée d'une période pour l'affichage dans la liste des enfants
export interface SimplePeriod {
  id: string;
  label: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  hasChildren: boolean;
  isMainEon: boolean;
  childCount?: number;
}

// Types pour les réponses Wikidata
export interface WikidataBinding {
  value: string;
  type: string;
  'xml:lang'?: string;
}

export interface WikidataResult {
  bindings: {
    item: WikidataBinding;
    itemLabel: WikidataBinding;
    startDate?: WikidataBinding;
    endDate?: WikidataBinding;
    categoryId?: WikidataBinding;
    categoryLabel?: WikidataBinding;
    location?: WikidataBinding;
    locationLabel?: WikidataBinding;
    hasChildren?: WikidataBinding;
  }[];
}

export interface WikidataResponse {
  results: {
    bindings: WikidataBinding[];
  };
  boolean?: boolean;
}

// Options pour les requêtes
export interface QueryOptions {
  language?: string;
  parentId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

// Type pour le cache
export interface CacheEntry {
  data: Period[] | SimplePeriod[];
  timestamp: number;
} 