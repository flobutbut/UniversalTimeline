import type { EventImportance } from '@/types/database';

/** Minimal inputs shared by timeline rendering and editable story previews. */
export interface StoryTimelinePeriod {
  id: string;
  label?: { fr: string; en: string };
  startDate?: string;
  endDate?: string;
  startYearsBP?: number;
  endYearsBP?: number;
  parentId?: string | null;
  storyParentId?: string | null;
}

export interface StoryTimelineEvent {
  id: string;
  label?: { fr: string; en: string } | string;
  date?: string;
  dateYearsBP?: number;
  importance?: EventImportance;
}
