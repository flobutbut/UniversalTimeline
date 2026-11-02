import type { Story } from '@/types/database';
import { storyChildrenOf } from './homeStoryPeriodNav';
import { storyNavigationLinks } from './storyNavigationLinks';
import { timelinePeriodPath, type TimelineTarget } from './timelineNavigation';

/** Position depuis laquelle le lien vers la frise suivante est effectivement accessible. */
function entryToward(story: Story, nextStoryId: string): TimelineTarget | null {
  const link = storyNavigationLinks(story).find(link => link.id === nextStoryId && link.anchors.length);
  if (!link) return null;
  const paths = link.anchors.flatMap(anchor => {
    const path = anchor.type === 'period' ? timelinePeriodPath(story.periods, anchor.id) : null;
    return path ? [path] : [];
  }).sort((a, b) => a.length - b.length || a[a.length - 1].id.localeCompare(b[b.length - 1].id));
  const path = paths[0];
  const anchor = path ? path[path.length - 1] : undefined;
  // Une feuille se rejoint depuis son parent, où son badge reste accessible.
  const period = anchor && storyChildrenOf(anchor.id, story.periods).length ? anchor : path?.[path.length - 2];
  return { storyId: story.id, ...(period ? { periodId: period.id } : { view: 'overview' }) };
}

/**
 * Plus court chemin navigable depuis l'Univers, sans la destination elle-même.
 * Recherche en largeur à rebours, puis validation de chaque lien dans le sens réel
 * de navigation. Ni les dates ni un parent éditorial seul ne créent un passage.
 */
export async function universeStoryTrail(
  destination: Story,
  readableIds: ReadonlySet<string>,
  loadStory: (id: string) => Promise<Story>,
  stillCurrent: () => boolean = () => true,
): Promise<TimelineTarget[]> {
  const rootId = '1';
  if (destination.id === rootId || !readableIds.has(rootId)) return [];
  const visited = new Set([destination.id]);
  const reads = new Map<string, Promise<Story>>();
  const read = (id: string) => {
    if (!reads.has(id)) reads.set(id, loadStory(id));
    return reads.get(id)!;
  };
  let frontier: Array<{ story: Story; trail: TimelineTarget[] }> = [{ story: destination, trail: [] }];
  while (frontier.length && stillCurrent()) {
    const candidates = new Map<string, typeof frontier>();
    for (const node of frontier) {
      const predecessors = new Set([
        ...(node.story.parentStories ?? []).map(story => story.id),
        ...(node.story.relatedStories ?? []).map(story => story.id),
        ...(node.story.parentStoryId ? [node.story.parentStoryId] : []),
      ]);
      for (const id of predecessors) {
        if (!readableIds.has(id) || visited.has(id)) continue;
        const connections = candidates.get(id) ?? [];
        connections.push(node); candidates.set(id, connections);
      }
    }
    const extend = (story: Story, connections: typeof frontier) => {
      for (const node of connections) {
        const target = entryToward(story, node.story.id);
        if (target) return [target, ...node.trail];
      }
      return null;
    };
    // Si l'Univers est déjà à ce rang, éviter de charger les branches voisines.
    const rootConnections = candidates.get(rootId);
    if (rootConnections) {
      try {
        const trail = extend(await read(rootId), rootConnections);
        if (!stillCurrent()) return [];
        if (trail) return trail;
      } catch { /* Une branche indisponible ne bloque pas l'ouverture de la destination. */ }
      candidates.delete(rootId);
    }
    if (!stillCurrent()) return [];
    const entries = [...candidates].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }));
    const results = await Promise.allSettled(entries.map(([id]) => read(id)));
    frontier = [];
    if (!stillCurrent()) return [];
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const [id, connections] = entries[index];
      const trail = extend(result.value, connections);
      if (trail) { visited.add(id); frontier.push({ story: result.value, trail }); }
    });
  }
  return [];
}
