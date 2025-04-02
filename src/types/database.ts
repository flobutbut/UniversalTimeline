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
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string; // Format ISO 8601
  endDate: string;   // Format ISO 8601
  parentId: string | null;
  temporalLocation: string;
  categories: Category[];
  children: Period[];
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les événements
export interface Event {
  id: string;
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