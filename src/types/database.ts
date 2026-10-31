// Types pour les données de liste
export interface ListPeriod {
  id: string; // Identifiant texte historique ou UUID.
  label: MultilingualText;
  startDate: string;
  endDate: string;
  categories: Category[];
  /** Champs enrichis (API mapToPeriod, finder, enfants Wikidata virtuels) */
  parentId?: string | null;
  /** Parent inside this frise; undefined means catalogue hierarchy. */
  storyParentId?: string | null;
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
  id: string; // Identifiant texte historique ou UUID.
  label: MultilingualText;
  date: string;
  categories: Category[];
  dateYearsBP?: number;
  createdAt?: Date;
  updatedAt?: Date;
  wikidata_id?: string;
  description?: MultilingualText;
}

export interface ListStory {
  id: string; // Entier PostgreSQL normalisé en chaîne par le mapper.
  ownerUserId?: string | null;
  title: MultilingualText;
  categories: Category[];
  /** Borne temporelle agrégée (liste stories) : min / max sur périodes + dates d'événements. */
  startDate?: string;
  endDate?: string;
}

/** Ancre d'une story enfant (période ou événement déclencheur). */
export interface StoryAnchor {
  type: 'period' | 'event';
  id: string;
}

/** Story enfant suggérée quand l'utilisateur atteint une période/événement ancre. */
export interface StorySuggestion {
  id: string;
  title: MultilingualText;
  description?: MultilingualText;
  parentStoryId: string | null;
}

// Types communs
export interface MultilingualText {
  fr: string;
  en: string;
}

export interface Category {
  id: string; // Identifiant varchar du catalogue.
  label: MultilingualText;
  description?: MultilingualText;
}

// Types pour les périodes
export interface Period extends ListPeriod {
  hasParent: boolean;
  children: string[];  // Identifiants du catalogue des enfants.
  temporalLocation: string;
}

// Types pour les événements
export type Event = ListEvent;

// Types pour les stories
export interface ChildStorySummary {
  id: string;
  title: MultilingualText;
  anchors: StoryAnchor[];
}

export interface StorySummary extends ListStory {
  previewPeriods?: Period[];
  previewEvents?: Event[];
  description?: MultilingualText;
  author: string;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Story extends StorySummary {
  periods: Period[];
  events: Event[];
  /** Stories enfants ancrées à des périodes de cette story. */
  childStories?: ChildStorySummary[];
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

export interface DeletePeriodResult {
  id: string;
  parent: { id: string; hasChildren: boolean } | null;
}

export interface AddAnnotationRequest {
  content: MultilingualText;
}
