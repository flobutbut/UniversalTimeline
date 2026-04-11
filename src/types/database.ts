// Types pour les données de liste
export interface ListPeriod {
  id: string; // UUID
  label: MultilingualText;
  startDate: string;
  endDate: string;
  categories: Category[];
  /** Champs enrichis (API mapToPeriod, finder, enfants Wikidata virtuels) */
  parentId?: string | null;
  hasParent?: boolean;
  hasChildren?: boolean;
  wikidata_id?: string;
  startYearsBP?: number;
  endYearsBP?: number;
  description?: MultilingualText;
  children?: string[];
  temporalLocation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListEvent {
  id: string; // UUID
  label: MultilingualText;
  date: string;
  categories: Category[];
  dateYearsBP?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListStory {
  id: string; // UUID
  title: MultilingualText;
  categories: Category[];
  /** Borne temporelle agrégée (liste stories) : min / max sur périodes + dates d’événements. */
  startDate?: string;
  endDate?: string;
}

// Types communs
export interface MultilingualText {
  fr: string;
  en: string;
}

export interface Category {
  id: string; // UUID
  label: MultilingualText;
  description?: MultilingualText;
}

// Types pour les périodes
export interface Period {
  id: string; // UUID
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string; // Format ISO 8601
  endDate: string;   // Format ISO 8601
  hasParent: boolean;  // true si l'objet a des enfants, false si c'est une feuille
  children: string[];  // Liste des UUIDs des enfants
  temporalLocation: string;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les événements
export interface Event {
  id: string; // UUID
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  date: string;      // Format ISO 8601
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les stories
export interface Story {
  id: string; // UUID
  title: MultilingualText;
  description?: MultilingualText;
  author: string;
  isPublic: boolean;
  categories: Category[];
  periods: Period[];
  events: Event[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryElement {
  id: string; // UUID
  storyId: string; // UUID
  elementType: 'period' | 'event';
  elementId: string; // UUID
  parentId: string | null; // UUID
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryAnnotation {
  id: number;
  elementId: number;
  content: MultilingualText;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les requêtes
export interface CreateStoryRequest {
  title: MultilingualText;
  description?: MultilingualText;
  author: string;
  isPublic?: boolean;
  categories: Category[];
}

export interface AddElementToStoryRequest {
  elementType: 'period' | 'event';
  elementId: string; // UUID
  parentId?: string | null; // UUID
}

export interface UpdatePeriodParentRequest {
  periodId: string;
  newParentId: string | null;
}

export interface AddAnnotationRequest {
  content: MultilingualText;
} 