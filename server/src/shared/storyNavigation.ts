/** Account-scoped navigation data, without entity descriptions, dates or tags. */
export interface StoryNavigationSnapshot {
  id: string;
  parentStoryId?: string | null;
  periods: Array<{ id: string; storyParentId?: string | null; parentId?: string | null }>;
  events: Array<{ id: string }>;
  childStories?: Array<{ id: string; title: { fr: string; en: string }; atRoot?: boolean; rootDisplayAsPeriod?: boolean; anchors: Array<{ type: 'period' | 'event'; id: string; displayAsPeriod?: boolean }> }>;
  parentStories?: Array<{ id: string }>;
  relatedStories?: Array<{ id: string; title: { fr: string; en: string }; periodIds: string[]; eventIds: string[] }>;
}
export interface NavigationRows {
  stories: Array<{ id: number; title_fr: string; title_en: string | null; parent_story_id: number | null }>;
  periods: Array<{ story_id: number; period_id: string; parent_period_id: string | null }>;
  events: Array<{ story_id: number; event_id: string }>;
  links: Array<{ source: number; target: number; kind: 'period' | 'event' | null; anchor: string | null }>;
}
