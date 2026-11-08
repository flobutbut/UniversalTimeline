// Types pour les données de liste
/** Titres d'articles Wikipédia ; null quand la langue n'a pas d'article. */
export type WikipediaTitles = import('../../server/src/shared/wikipedia').WikipediaTitles;

export interface ListPeriod {
  sourceKey?: string;
  /** Absent tant que la lecture ne transporte pas les titres. */
  wikipedia?: WikipediaTitles;
  wikidataSource?: import('../../server/src/shared/wikidataGeneration').WikidataSource;
  id: string; // Identifiant texte historique ou UUID.
  label: MultilingualText;
  startDate: string;
  endDate: string;
  categories: Category[];
  /** Absents tant que la lecture ne transporte pas le classement. */
  tags?: TagRef[];
  nonThematic?: boolean;
  /** Champs enrichis (API mapToPeriod, finder, enfants Wikidata virtuels) */
  parentId?: string | null;
  /** Parent inside this frise; catalogue records have no hierarchy. */
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

/** Importance d'un événement dans une frise : majeur, normal ou détail. */
export type EventImportance = 'major' | 'normal' | 'minor';

export interface ListEvent {
  sourceKey?: string;
  wikipedia?: WikipediaTitles;
  wikidataSource?: import('../../server/src/shared/wikidataGeneration').WikidataSource;
  id: string; // Identifiant texte historique ou UUID.
  label: MultilingualText;
  date: string;
  categories: Category[];
  tags?: TagRef[];
  dateYearsBP?: number;
  createdAt?: Date;
  updatedAt?: Date;
  wikidata_id?: string;
  description?: MultilingualText;
  /** Seulement dans le détail d'une frise : propre au lien frise–événement. */
  importance?: EventImportance;
}

export interface ListStory {
  id: string; // Entier PostgreSQL normalisé en chaîne par le mapper.
  ownerUserId?: string | null;
  title: MultilingualText;
  categories: Category[];
  tags?: TagRef[];
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

/** Domaine thématique d'une fiche ; le premier de la liste est le principal. */
export interface TagRef {
  id: string;
  label: MultilingualText;
  family: string;
  position: number;
  parentId: string | null;
}

export interface Category {
  id: string; // Identifiant varchar du catalogue.
  label: MultilingualText;
  description?: MultilingualText;
}

// Types pour les périodes
export interface Period extends ListPeriod {
  hasParent: boolean;
  children: string[];  // Identifiants des enfants dans le contexte de la frise.
  temporalLocation: string;
}

// Types pour les événements
export type Event = ListEvent;

// Types pour les stories
export interface ChildStorySummary {
  id: string;
  title: MultilingualText;
  anchors: Array<StoryAnchor & { displayAsPeriod?: boolean }>;
  atRoot?: boolean;
  rootDisplayAsPeriod?: boolean;
}
export interface ParentStorySummary {
  id: string;
  title: MultilingualText;
  ownerUserId?: string | null;
  isPublic?: boolean;
  atRoot?: boolean;
  anchors: Array<StoryAnchor & { label: MultilingualText }>;
}

export interface StorySummary extends ListStory {
  previewPeriods?: Period[];
  previewEvents?: Event[];
  description?: MultilingualText;
  author: string;
  isPublic: boolean;
  /** Parent historique ; les points d’entrée multiples sont transportés dans parentStories. */
  parentStoryId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NavigationContext {
  id: string;
  title: MultilingualText;
  periods: ListPeriod[];
  presentations: Array<{ periodId: string; storyId: string; title: MultilingualText }>;
}

export interface Story extends StorySummary {
  navigationContexts?: NavigationContext[];
  periods: Period[];
  events: Event[];
  /** Stories enfants ancrées à des périodes de cette story. */
  childStories?: ChildStorySummary[];
  parentStories?: ParentStorySummary[];
  /** Readable frises sharing at least one period or event, loaded with this frise. */
  relatedStories?: Array<{ id: string; title: MultilingualText; periodIds: string[]; eventIds: string[] }>;
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
