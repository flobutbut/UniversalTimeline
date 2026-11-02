import type { Story, StoryAnchor, StorySuggestion } from '@/types/database';
import { getStoryPeriodParentId } from './storyPeriodParent';

/** Child anchors first, then shared content; all links come from one readable frise snapshot. */
export function storyNavigationLinks(story: Story): Array<StorySuggestion & { anchors: StoryAnchor[] }> {
  const periods = new Set(story.periods.map(period => period.id));
  const events = new Set(story.events.map(event => event.id));
  const roots: StoryAnchor[] = story.periods
    .filter(period => { const parent = getStoryPeriodParentId(period); return !parent || !periods.has(parent); })
    .map(period => ({ type: 'period', id: period.id }));
  const links = new Map<string, StorySuggestion & { anchors: StoryAnchor[] }>();
  for (const child of story.childStories ?? []) {
    if (child.id === story.id) continue;
    const anchors = child.anchors.filter(anchor => (anchor.type === 'period' ? periods : events).has(anchor.id));
    links.set(child.id, { id: child.id, title: child.title, parentStoryId: story.id, anchors: anchors.length ? anchors : roots });
  }
  const related = [...(story.relatedStories ?? [])].sort((a, b) => (a.title.fr || a.title.en).localeCompare(b.title.fr || b.title.en, 'fr'));
  for (const other of related) {
    if (other.id === story.id) continue;
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
  for (const { anchors, ...story } of links) {
    for (const anchor of anchors) {
      if (anchor.type !== kind) continue;
      const bucket = indexed.get(anchor.id) ?? [];
      if (!bucket.some(other => other.id === story.id)) bucket.push(story);
      indexed.set(anchor.id, bucket);
    }
  }
  return indexed;
}
