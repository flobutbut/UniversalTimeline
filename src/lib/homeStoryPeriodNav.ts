import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import type { ListPeriod } from '@/types/database';

/**
 * Enfants directs d'une période dans le périmètre d'une story,
 * avec `hasChildren` recalculé sur ce périmètre.
 * `parentId === null` → périodes racines de la story.
 */
export function storyChildrenOf(parentId: string | null, storyPeriods: ListPeriod[]): ListPeriod[] {
  const storyIds = new Set(storyPeriods.map(p => String(p.id)));
  const children = storyPeriods.filter(p => {
    const pid = getStoryPeriodParentId(p);
    if (parentId === null) {
      return !pid || !storyIds.has(pid);
    }
    return pid === String(parentId);
  });
  return children.map(p => ({
    ...p,
    hasChildren: storyPeriods.some(c => getStoryPeriodParentId(c) === String(p.id)),
  }));
}

/** État périodes au moment où l’on quitte une story pour une story enfant (breadcrumb). */
export type StoryPeriodNavSnapshot = {
  parentStackIds: string[];
  currentPeriodId: string | null;
};

/** Reconstruit pile + période courante depuis les IDs ; `null` si une période a disparu des données. */
export function resolvePeriodNavFromSnapshot(
  storyPeriods: ListPeriod[],
  snapshot: StoryPeriodNavSnapshot,
): { stack: ListPeriod[]; current: ListPeriod | null } | null {
  const byId = new Map(storyPeriods.map(p => [String(p.id), p]));
  const stack: ListPeriod[] = [];
  for (const id of snapshot.parentStackIds) {
    const p = byId.get(id);
    if (!p) return null;
    stack.push(p);
  }
  let current: ListPeriod | null = null;
  if (snapshot.currentPeriodId) {
    const cp = byId.get(snapshot.currentPeriodId);
    if (!cp) return null;
    current = cp;
  }
  const path = [...stack, ...(current ? [current] : [])];
  for (let index = 0; index < path.length; index++) {
    const parentId = getStoryPeriodParentId(path[index]);
    if (index === 0 ? parentId && byId.has(parentId) : parentId !== path[index - 1].id) return null;
  }
  return { stack, current };
}
