// Types pour les données de liste
export interface ListPeriod {
  id: string;
  label: MultilingualText;
  startDate: string;
  endDate: string;
  categories: Category[];
}

export interface ListEvent {
  id: string;
  label: MultilingualText;
  date: string;
  categories: Category[];
}

export interface ListStory {
  id: number;
  title: MultilingualText;
  categories: Category[];
}

// Types communs
export interface MultilingualText {
  fr: string;
  en: string;
}

export interface Category {
  id: string;
  label: MultilingualText;
  description?: MultilingualText;
  parentId?: string | null;
}

// Types pour les périodes
export interface Period {
  id: string;
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string; // Format ISO 8601
  endDate: string;   // Format ISO 8601
  hasParent: boolean;  // true si l'objet a des enfants, false si c'est une feuille
  children: string[];  // Liste des IDs des enfants directs
  temporalLocation: string;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les événements
export interface Event {
  id: string;
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
  id: number;
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
  id: number;
  storyId: number;
  elementType: 'period' | 'event';
  elementId: string;
  parentId: string | null;
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
  elementId: string;
  parentId?: string | null;
}

export interface UpdatePeriodParentRequest {
  periodId: string;
  newParentId: string | null;
}

export interface AddAnnotationRequest {
  content: MultilingualText;
} 