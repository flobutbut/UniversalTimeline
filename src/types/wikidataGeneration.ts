export interface WikidataTimelineItem {
  qid: string;
  type: 'period' | 'event';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  selected: boolean;
  warning?: string;
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
}

export interface ExistingWikidataStory { id: string; title: string; reason: 'subject' | 'title' }
