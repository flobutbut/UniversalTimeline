import type { ListPeriod, Story, StoryAnchor, StorySummary } from '@/types/database';
export interface LinkedStoryPeriod extends ListPeriod { linkedStoryId: string; sourceAnchor?: StoryAnchor }

/** Display-only cards. These never become catalogue periods or local period positions. */
export function linkedStoryPeriods(story: Story | null, parentId: string | null, summaries: StorySummary[]): LinkedStoryPeriod[] {
  return (story?.childStories ?? []).flatMap(child => {
    const shown = parentId ? child.anchors.some(anchor => anchor.type === 'period' && anchor.id === parentId && anchor.displayAsPeriod) : child.rootDisplayAsPeriod;
    if (!shown) return [];
    const summary = summaries.find(row => row.id === child.id);
    return [{ id: `linked-story:${child.id}`, linkedStoryId: child.id, label: child.title,
      startDate: summary?.startDate ?? '', endDate: summary?.endDate ?? '', categories: summary?.categories ?? [], description: summary?.description,
      ...(parentId ? { sourceAnchor: { type: 'period' as const, id: parentId } } : {}) }];
  });
}

/** Every displayed occurrence in its local hierarchy, with distinct identifiers for each entry. */
export function linkedStoryPreviewPeriods(story: Story | null | undefined, summaries: StorySummary[]): Array<LinkedStoryPeriod & { storyParentId: string | null }> {
  if (!story) return [];
  const members = new Set(story.periods.map(period => period.id));
  const parents = new Set([null, ...(story.childStories ?? []).flatMap(child => child.anchors
    .filter(anchor => anchor.type === 'period' && anchor.displayAsPeriod && members.has(anchor.id)).map(anchor => anchor.id))]);
  return [...parents].flatMap(parent => linkedStoryPeriods(story,parent,summaries).map(period => ({
    ...period, id: `${period.id}:${parent === null ? 'root' : `period:${parent}`}`, storyParentId: parent,
  })));
}
