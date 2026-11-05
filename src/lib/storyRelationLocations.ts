import type { StoryAnchor } from '@/types/database';

type LocatedStory = { atRoot?: boolean; anchors: StoryAnchor[] };

/** Only an explicit root (or an unanchored legacy link) is a root location.
 * Missing/foreign anchors must never be silently promoted to the root.
 */
export function hasStoryRootLocation(link: LocatedStory): boolean {
  return link.atRoot ?? link.anchors.length === 0;
}

export function hasStoryLocation(link: LocatedStory, anchor: StoryAnchor | null): boolean {
  return anchor === null ? hasStoryRootLocation(link)
    : link.anchors.some(item => item.type === anchor.type && item.id === anchor.id);
}
