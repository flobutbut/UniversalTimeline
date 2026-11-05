/** PostgreSQL drivers preserve NUMERIC as text and timestamptz as Date. */
export type Numeric = number | string | null;
export type Timestamp = Date | string;
export interface LocalizedRow {
  label_fr: string; label_en: string | null;
  description_fr: string | null; description_en: string | null;
}
export interface CategoryRow extends LocalizedRow { id: string }
export interface CategoryJoinRow {
  category_id: string | null;
  category_label_fr: string | null;
  category_label_en: string | null;
}
export interface SourceMetadata { source_key?: string | null; wikidata_source?: import('../shared/wikidataGeneration.js').WikidataSource | null }
export interface PeriodRecord extends LocalizedRow, SourceMetadata {
  id: string; wikidata_id: string | null;
  start_date: string | null; end_date: string | null; parent_id: string | null;
  story_parent_id?: string | null;
  start_years_bp: Numeric; end_years_bp: Numeric;
  created_at: Timestamp; updated_at: Timestamp;
}
export interface PeriodRow extends PeriodRecord { has_children: boolean }
export type PeriodListRow = Omit<PeriodRow, 'created_at' | 'updated_at'>;
export interface EventRow extends LocalizedRow, SourceMetadata {
  id: string; wikidata_id: string | null; date: string | null; date_years_bp: Numeric;
  created_at: Timestamp; updated_at: Timestamp;
}
export interface StoryRow {
  id: number; title_fr: string; title_en: string | null;
  description_fr: string | null; description_en: string | null;
  author: string; is_public: boolean; owner_user_id: string | null;
  parent_story_id: number | null; created_at: Timestamp; updated_at: Timestamp;
}
export type JoinedPeriodRow = PeriodRecord & CategoryJoinRow;
export type JoinedPeriodListRow = PeriodListRow & CategoryJoinRow;
export type JoinedEventRow = EventRow & CategoryJoinRow;
export type StorySummaryRow = Omit<StoryRow, 'parent_story_id'>;
export type JoinedStoryRow = StorySummaryRow & Pick<StoryRow, 'parent_story_id'> & CategoryJoinRow & {
  preview_periods?: Array<Pick<PeriodRow, 'id' | 'label_fr' | 'label_en' | 'start_date' | 'end_date' | 'start_years_bp' | 'end_years_bp' | 'parent_id'>>;
  preview_events?: Array<Pick<EventRow, 'id' | 'date' | 'date_years_bp'>>;
};
export interface Anchor { type: 'period' | 'event'; id: string }
export interface ChildStoryRow { id: number; title_fr: string; title_en: string | null; anchors: Array<Anchor & { displayAsPeriod?: boolean }> | null; at_root?: boolean; root_display_as_period?: boolean }
export type { TemporalCandidate } from '../domain/storyTemporalBounds.js';
