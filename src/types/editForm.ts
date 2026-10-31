import type { MultilingualText } from './database';

export type EditFormType = 'period' | 'event' | 'story';
export type EditFormMode = 'create' | 'edit';

/** Saved UI entities and Wikidata drafts share a small, explicit initialization contract. */
export interface EditInitialData {
  id?: string;
  wikidata_id?: string; qid?: string;
  label?: Partial<MultilingualText>; title?: Partial<MultilingualText>;
  description?: Partial<MultilingualText> | null;
  start_date?: string; startDate?: string;
  end_date?: string; endDate?: string; date?: string;
  parent_id?: string | null; parentId?: string | null;
  temporalLocation?: string; location?: string;
  author?: string; isPublic?: boolean;
  hasChildren?: boolean;
  categories?: ReadonlyArray<{ id: string }>;
}

export interface EditFormData {
  qid: string; title: MultilingualText; description: MultilingualText;
  startDate: string; endDate: string; date: string; location: string;
  author: string; isPublic: boolean; parentId: string | null; categories: string[];
}

/** A submitted draft is distinct from its category ID selection and from a saved entity. */
export interface EditFormSubmission {
  qid: string; title: MultilingualText;
  description: { fr: string | null; en: string | null };
  startDate: string; endDate: string; date: string; location: string | null;
  author: string; isPublic: boolean; parentId: string | null; categories: Array<{ id: string }>;
}

export interface EditableItem extends EditInitialData { id: string }
