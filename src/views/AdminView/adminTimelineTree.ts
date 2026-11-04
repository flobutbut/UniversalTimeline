import { comparableYearsBeforePresent } from '@temporal';
import type { RelationStory, RelationsContent, RelationsNetwork } from '@/types/adminRelations';

export interface TimelineBranch { story: RelationStory; children: TimelineBranch[] }
export interface TimelineForest { roots: TimelineBranch[]; parents: Map<string, string> }

/** Lay out the navigation paths first, falling back to historical parents.
 * Every frise appears once, including disconnected, empty and cyclic legacy records.
 */
export function buildTimelineForest(network: RelationsNetwork, contents: Map<string, RelationsContent>): TimelineForest {
  const branches = new Map(network.stories.map(story => [story.id, { story, children: [] } as TimelineBranch]));
  const parents = new Map<string, string>();
  const links=[...network.links].sort((a,b)=>Number(a.type==='legacy')-Number(b.type==='legacy'));
  for (const link of links) {
    if (!branches.has(link.source) || !branches.has(link.target) || parents.has(link.target)) continue;
    const seen = new Set([link.target]);
    let parent: string | undefined = link.source;
    while (parent && !seen.has(parent)) { seen.add(parent); parent = parents.get(parent); }
    if (!parent) parents.set(link.target, link.source);
  }
  const starts = new Map<string, number>();
  const now = Date.now();
  for (const [id, content] of contents) {
    const dates = [...content.periods.flatMap(p => [p.startDate, p.endDate]), ...content.events.map(e => e.date)]
      .flatMap(date => { const value = comparableYearsBeforePresent(date, undefined, now); return value === null ? [] : [value]; });
    if (dates.length) starts.set(id, Math.max(...dates));
  }
  const compare = (a: TimelineBranch, b: TimelineBranch) =>
    (starts.get(b.story.id) ?? -Infinity) - (starts.get(a.story.id) ?? -Infinity)
    || a.story.title.localeCompare(b.story.title, 'fr') || a.story.id.localeCompare(b.story.id);
  const roots: TimelineBranch[] = [];
  for (const branch of branches.values()) {
    const parent = parents.get(branch.story.id);
    if (parent) branches.get(parent)!.children.push(branch); else roots.push(branch);
  }
  for (const branch of branches.values()) branch.children.sort(compare);
  roots.sort(compare);
  return { roots, parents };
}

export function storyAncestors(id: string, parents: Map<string, string>): string[] {
  const result: string[] = [];
  const seen = new Set([id]);
  let parent = parents.get(id);
  while (parent && !seen.has(parent)) { result.push(parent); seen.add(parent); parent = parents.get(parent); }
  return result;
}
