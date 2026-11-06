import type { WikidataSource } from '../../server/src/shared/wikidataGeneration';
import type { Profile, Status, WikidataGenerationSettings } from '@/lib/wikidataGenerationModel';
export interface WikidataTimelineItem {
  id?: string;
  /** Titres lus juste avant l'enregistrement ; absents si la lecture a échoué. */
  wikipedia?: import('../../server/src/shared/wikipedia').WikipediaTitles;
  qid: string;
  type: 'period' | 'event';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  selected: boolean;
  warning?: string;
  origin?: 'entity' | 'fact';
  source?: WikidataSource;
  category?: string;
  status?: Status;
  reasons?: string[];
  /** Desired local parent; an unselected parent is omitted from the saved tree. */
  parentQid?: string | null;
  /** Explicit P361 / inverse P527 relations between the proposed periods. */
  parentCandidates?: string[];
}

export interface WikidataTimelineDraft {
  qid: string;
  title: string;
  description: string;
  items: WikidataTimelineItem[];
  warnings: string[];
  profile?: Profile;
  settings?: WikidataGenerationSettings;
}
export const wikidataItemKey = (item: WikidataTimelineItem) => item.id ?? item.qid;

export interface ExistingWikidataStory { id: string; title: string; reason: 'subject' | 'title' }
