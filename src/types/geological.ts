// Types pour les éons principaux
export const MAIN_EONS = {
  HADEAN: 'Q104460',
  ARCHEAN: 'Q104168',
  PROTEROZOIC: 'Q104162',
  PHANEROZOIC: 'Q101313'
} as const;

// Story principale
export const MAIN_STORY = {
  PLANET_EARTH: 'Q2' // Q2 est l'ID Wikidata pour la Terre
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
export interface TemporalLocation {
  startDate?: string;
  endDate?: string;
  location: string;
}

export interface PeriodData {
  id: string;
  label: string;
  temporalData: TemporalLocation[];
  hasChildren: boolean;
  isMainEon: boolean;
  categoryIds: string[];
  categoryLabels: string[];
  children: PeriodData[];
  loading: boolean;
  childrenPreloaded: boolean;
  locations: string[];
  directLocations: string[];
}

export interface Period extends PeriodData {
  id: string;
  wikidata_id?: string;
  label: string;
  description: {
    fr: string;
    en: string;
  };
  temporalData: TemporalLocation[];
  hasChildren: boolean;
  isMainEon: boolean;
  categoryIds: string[];
  categoryLabels: string[];
  children: Period[];
  loading: boolean;
  childrenPreloaded: boolean;
  locations: string[];
  directLocations: string[];
}

// Types pour les réponses Wikidata
export interface WikidataBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  itemDescriptionFr?: { value: string };
  itemDescriptionEn?: { value: string };
  startDate?: { value: string };
  endDate?: { value: string };
  startLocationLabel?: { value: string };
  endLocationLabel?: { value: string };
  childCount?: { value: string };
  child?: { value: string };
  childLabel?: { value: string };
  description?: { value: string };
  date?: { value: string };
  [key: string]: any;
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
}

// Options pour les requêtes
export interface QueryOptions {
  limit?: number;
  offset?: number;
  language?: string;
  parentId?: string;
  categoryId?: string;
  languages?: string[];
}

export interface Event {
  id: string;
  label: string;
  date: string;
  description?: string;
  location?: string;
  category?: string;
  source?: string;
}

export interface ApiPeriod {
  id: string;
  wikidata_id?: string;
  label: {
    fr: string;
    en: string;
  };
  description?: {
    fr: string;
    en: string;
  };
  startDate: string;
  endDate: string;
  hasParent: boolean;
  children: string[];
  temporalLocation?: string;
  categories?: Array<{
    id: string;
    label: {
      fr: string;
      en: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
} 