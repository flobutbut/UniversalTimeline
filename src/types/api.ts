import type { NewEntityFormCore } from '@/lib/buildNewEntityCoreFields';

/** Wire values differ from the UI model: pg numbers/timestamps and legacy field names. */
export type ApiId = string | number;
export type ApiTimestamp = string | Date | null;
export interface ApiText { fr?: string | null; en?: string | null }
export interface CategoryDto {
  id: ApiId;
  label?: ApiText | string | null;
  label_fr?: string | null; label_en?: string | null;
  description?: ApiText | null;
  description_fr?: string | null; description_en?: string | null;
}
export interface TagDto {
  id: ApiId;
  label?: ApiText | null;
  family: string;
  position: number;
  parentId?: ApiId | null;
}
interface MetadataDto {
  id: ApiId;
  categories?: CategoryDto[] | null;
  tags?: TagDto[] | null;
  description?: ApiText | null;
  description_fr?: string | null; description_en?: string | null;
  created_at?: ApiTimestamp; updated_at?: ApiTimestamp;
  createdAt?: ApiTimestamp; updatedAt?: ApiTimestamp;
}
interface EntityDto extends MetadataDto {
  sourceKey?: string | null;
  /** Détail et listes mappés : objet ; lignes brutes (création, conversion) : colonnes. */
  wikipedia?: { fr?: string | null; en?: string | null } | null;
  wikipedia_title_fr?: string | null; wikipedia_title_en?: string | null;
  wikidataSource?: import('../../server/src/shared/wikidataGeneration').WikidataSource | null;
  wikidata_id?: string | null;
  label?: ApiText | null;
  label_fr?: string | null; label_en?: string | null;
}
export interface PeriodDto extends EntityDto {
  start_date?: ApiTimestamp; end_date?: ApiTimestamp;
  startDate?: ApiTimestamp; endDate?: ApiTimestamp;
  start_years_bp?: number | string | null; end_years_bp?: number | string | null;
  startYearsBP?: number | string | null; endYearsBP?: number | string | null;
  parent_id?: ApiId | null; parentId?: ApiId | null;
  story_parent_id?: ApiId | null; storyParentId?: ApiId | null;
  has_parent?: boolean | null; hasParent?: boolean | null;
  has_children?: boolean | null; hasChildren?: boolean | null;
  children?: ApiId[];
  temporal_location?: string | null; temporalLocation?: string | null;
  non_thematic?: boolean | null; nonThematic?: boolean | null;
}
/** One period or event membership in a story readable by the current account. */
export type StoryLinkDto = { story_id: string | number } & ({ event_id: string } | { period_id: string });
export interface EventDto extends EntityDto {
  date?: ApiTimestamp;
  date_years_bp?: number | string | null; dateYearsBP?: number | string | null;
  importance?: string | null;
}
export interface ChildStoryDto {
  atRoot?: boolean;
  rootDisplayAsPeriod?: boolean;
  id: ApiId; title?: ApiText | null;
  title_fr?: string | null; title_en?: string | null;
  anchors?: Array<{ type: 'period' | 'event'; id: ApiId; displayAsPeriod?: boolean }> | null;
}
export interface StoryDto extends MetadataDto {
  navigationContexts?: Array<{ id: ApiId; title: ApiText; periods: PeriodDto[]; presentations: Array<{ periodId: string; storyId: ApiId; title: ApiText }> }>;
  title?: ApiText | null;
  title_fr?: string | null; title_en?: string | null;
  author?: string | null;
  is_public?: boolean | null; isPublic?: boolean | null;
  start_date?: ApiTimestamp; end_date?: ApiTimestamp;
  startDate?: ApiTimestamp; endDate?: ApiTimestamp;
  periods?: PeriodDto[]; events?: EventDto[];
  preview_periods?: PeriodDto[]; preview_events?: EventDto[];
  childStories?: ChildStoryDto[];
  parentStories?: Array<Omit<ChildStoryDto, 'anchors'> & { ownerUserId?: string | null; isPublic?: boolean; anchors: Array<{ type: 'period' | 'event'; id: ApiId; label?: ApiText }> }>;
  relatedStories?: Array<ChildStoryDto & { periodIds: ApiId[]; eventIds: ApiId[] }>;
  parent_story_id?: ApiId | null;
  owner_user_id?: string | null; ownerUserId?: string | null;
}
export interface EntityFormPayload extends NewEntityFormCore {
  /** Omis : la mise à jour conserve les titres enregistrés. */
  wikipedia?: import('./database').WikipediaTitles;
  parentId?: string | null;
  startDate?: string; endDate?: string; date?: string;
  categories?: Array<{ id: string }>;
  /** Principal en premier. Omis : la mise à jour conserve les tags enregistrés. */
  tags?: string[];
  nonThematic?: boolean;
  temporalLocation?: string | null; location?: string | null;
}
export interface StoryFormPayload {
  title: { fr: string; en?: string };
  description?: { fr?: string | null; en?: string | null } | null;
  /** Ignoré pour un compte connecté : le serveur signe avec son nom d'auteur. */
  author?: string;
  isPublic?: boolean;
  categories?: Array<{ id: string }>;
  tags?: string[];
  /** Création seulement : frise parente et ancre, enregistrées dans la même transaction. */
  storyPlacement?: { parentStoryId: string; anchorPeriodId: string | null } | null;
}
export interface PeriodFormPayload extends EntityFormPayload { startDate: string }
export interface EventFormPayload extends EntityFormPayload { date: string }
