export interface LocalizedText { fr: string; en: string }
export interface Description { fr: string | null; en: string | null }
interface EntityWrite {
  id?: string; wikidata_id: string | null; label: LocalizedText;
  description: Description; categories?: string[];
}
export interface EventWrite extends EntityWrite { date: string }
export interface PeriodWrite extends EntityWrite {
  wikidata_id: string; start_date: string; end_date: string;
}
export interface StoryWrite {
  title: LocalizedText; description: Description; author: string;
  isPublic?: boolean; categories?: string[];
}
