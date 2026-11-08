import type { MultilingualText } from './database';

export type EditFormType = 'period' | 'event' | 'story';
export type EditFormMode = 'create' | 'edit';

/** Saved UI entities and Wikidata drafts share a small, explicit initialization contract. */
export interface EditInitialData {
  sourceKey?: string;
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
  tags?: ReadonlyArray<{ id: string }>;
  nonThematic?: boolean;
  wikipedia?: Partial<{ fr: string | null; en: string | null }> | null;
}

export interface EditFormData {
  sourceKey?: string;
  qid: string; title: MultilingualText; description: MultilingualText;
  startDate: string; endDate: string; date: string; location: string;
  author: string; isPublic: boolean; parentId: string | null;
  /** Principal en premier. */
  tags: string[];
  /** Faux quand la fiche éditée a été lue sans son classement : un champ vide ne l'efface pas. */
  tagsLoaded: boolean;
  nonThematic: boolean;
  /** Titre ou adresse d'article saisi ; normalisé à la soumission. */
  wikipedia: { fr: string; en: string };
  /** Faux quand la fiche éditée a été lue sans ses titres : des champs vides ne les effacent pas. */
  wikipediaLoaded: boolean;
}

/** A submitted draft is distinct from its tag selection and from a saved entity. */
export interface EditFormSubmission {
  sourceKey?: string;
  qid: string; title: MultilingualText;
  description: { fr: string | null; en: string | null };
  startDate: string; endDate: string; date: string; location: string | null;
  author: string; isPublic: boolean; parentId: string | null;
  /** Omis : la mise à jour conserve le classement enregistré. */
  tags?: string[];
  nonThematic?: boolean;
  /** Titres normalisés ; null sans article. Omis : la mise à jour conserve les titres enregistrés. */
  wikipedia?: { fr: string | null; en: string | null };
  /** Création d’une frise : sa parente et son ancre. */
  storyPlacement?: StoryPlacement | null;
}

export interface EditableItem extends EditInitialData { id: string }

/** Place d’une nouvelle frise. `complete` : aucune parente, ou parente chargée avec son ancre (sauf si elle n’a aucune période). */
export interface StoryPlacementDraft { parentStoryId: string | null; anchorPeriodId: string | null; complete: boolean }
export interface StoryPlacement { parentStoryId: string; anchorPeriodId: string | null }
