import { hasStoryRootLocation } from './storyRelationLocations';
import type { Story, StoryAnchor, StorySuggestion, ChildStorySummary } from '@/types/database';
import type { StoryNavigationSnapshot } from '../../server/src/shared/storyNavigation';
type NavigationLink = StorySuggestion & { anchors: ChildStorySummary['anchors']; atRoot?: boolean; rootDisplayAsPeriod?: boolean };

/** Child anchors first, then shared content; all links come from one readable frise snapshot. */
export function storyNavigationLinks(story: StoryNavigationSnapshot): NavigationLink[] {
  const periods = new Set(story.periods.map(period => period.id));
  const events = new Set(story.events.map(event => event.id));
  const links = new Map<string, NavigationLink>();
  for (const child of story.childStories ?? []) {
    if (String(child.id).trim() === String(story.id).trim()) continue;
    const anchors = child.anchors.filter(anchor => (anchor.type === 'period' ? periods : events).has(anchor.id));
    links.set(child.id, { id: child.id, title: child.title, parentStoryId: story.id, anchors, atRoot: hasStoryRootLocation(child),
      ...(child.rootDisplayAsPeriod ? { rootDisplayAsPeriod: true } : {}) });
  }
  const related = [...(story.relatedStories ?? [])].sort((a, b) => (a.title.fr || a.title.en).localeCompare(b.title.fr || b.title.en, 'fr'));
  for (const other of related) {
    if (String(other.id).trim() === String(story.id).trim()) continue;
    const link = links.get(other.id) ?? { id: other.id, title: other.title, parentStoryId: null, anchors: [] };
    const seen = new Set(link.anchors.map(anchor => `${anchor.type}:${anchor.id}`));
    for (const [type, ids] of [['period', other.periodIds], ['event', other.eventIds]] as const) {
      for (const id of ids) {
        if (!(type === 'period' ? periods : events).has(id) || seen.has(`${type}:${id}`)) continue;
        link.anchors.push({ type, id });
        seen.add(`${type}:${id}`);
      }
    }
    links.set(other.id, link);
  }
  return [...links.values()];
}

export function indexStoryNavigationLinks(links: ReturnType<typeof storyNavigationLinks>, kind: StoryAnchor['type']) {
  const indexed = new Map<string, StorySuggestion[]>();
  for (const { anchors, atRoot: _atRoot, ...story } of links) {
    for (const anchor of anchors) {
      if (anchor.type !== kind) continue;
      const bucket = indexed.get(anchor.id) ?? [];
      if (!bucket.some(other => other.id === story.id)) bucket.push(story);
      indexed.set(anchor.id, bucket);
    }
  }
  return indexed;
}

export function rootStoryNavigationLinks(story: Story): StorySuggestion[] {
  return storyNavigationLinks(story).filter(link => link.atRoot).map(({ anchors: _anchors, atRoot: _root, ...link }) => link);
}
