/** A frise placement overrides the catalogue parent, including an explicit root (null). */
export function getStoryPeriodParentId(period: {
  storyParentId?: string | null; story_parent_id?: string | null;
  parentId?: string | null; parent_id?: string | null;
}): string | null {
  const value = period.storyParentId !== undefined ? period.storyParentId
    : period.story_parent_id !== undefined ? period.story_parent_id
      : period.parentId !== undefined ? period.parentId : period.parent_id;
  return value == null || value === '' ? null : String(value);
}
