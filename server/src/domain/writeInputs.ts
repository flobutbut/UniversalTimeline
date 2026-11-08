import type { WikipediaTitles } from '../shared/wikipedia.js';
export interface LocalizedText { fr: string; en: string }
export interface Description { fr: string | null; en: string | null }
interface EntityWrite {
  id?: string; wikidata_id: string | null; label: LocalizedText;
  description: Description; categories?: string[];
  /** Primary first. Omitted: an update keeps the stored tags. */
  tags?: string[];
  /** Omitted: an update keeps the stored titles; a creation stores none. */
  wikipedia?: WikipediaTitles;
}
export interface EventWrite extends EntityWrite { date: string }
export interface PeriodWrite extends EntityWrite {
  wikidata_id: string | null; start_date: string; end_date: string;
  /** Omitted: an update keeps the stored value. */
  non_thematic?: boolean;
}
export interface StoryWrite {
  title: LocalizedText; description: Description; author: string | null;
  isPublic?: boolean; categories?: string[]; tags?: string[];
}
/** Importance d'un événement dans une frise : majeur, normal ou détail. */
export const EVENT_IMPORTANCES = ['major', 'normal', 'minor'] as const;
export type EventImportance = typeof EVENT_IMPORTANCES[number];
