// Types pour les éons principaux
export const MAIN_EONS = {
  HADEAN: 'Q104460',
  ARCHEAN: 'Q104168',
  PROTEROZOIC: 'Q104162',
  PHANEROZOIC: 'Q101313'
} as const;

// Types de périodes valides
export const PERIOD_TYPES = {
  GEOLOGICAL: 'Q186081',
  HISTORICAL: 'Q11514315',
  ARCHEOLOGICAL: 'Q11514315'
} as const;

// Propriétés Wikidata pour les dates
export const DATE_PROPERTIES = {
  START: 'P580',
  END: 'P582',
  BIRTH: 'P569',
  DEATH: 'P570',
  CREATION: 'P571'
} as const;

// Propriétés Wikidata pour les localisations
export const LOCATION_PROPERTIES = {
  LOCATION: 'P276',
  APPLY_TO_PART: 'P518'
} as const;

// Langues supportées dans l'ordre de priorité
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de'] as const;

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
  startDate?: string;
  endDate?: string;
  location?: string;
  hasChildren: boolean;
  isMainEon: boolean;
  categoryIds: string[];
  categoryLabels: string[];
  childrenPreloaded: boolean;
  children: Period[];
  loading: boolean;
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
  categoryIds: string[];
}

// Types pour les réponses Wikidata
export interface WikidataBinding {
  item: { value: string };
  itemLabel: { value: string; 'xml:lang'?: string };
  startDate?: { value: string };
  endDate?: { value: string };
  location?: { value: string };
  locationLabel?: { value: string; 'xml:lang'?: string };
  childCount?: { value: string };
  boolean?: boolean;
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
  head: { vars: string[] };
  results: {
    bindings: WikidataBinding[];
  };
}

// Options pour les requêtes
export interface QueryOptions {
  language?: string;
  parentId?: string;
}

// Type pour le cache
export interface CacheEntry {
  data: Period[] | SimplePeriod[];
  timestamp: number;
} 