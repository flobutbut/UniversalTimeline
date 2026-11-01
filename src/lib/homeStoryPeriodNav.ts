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

/** Une frise du parcours et les périodes ouvertes dedans, de la racine à la période courante. */
export type StoryFrame = { id: string; path: ListPeriod[] };
/** Étape du fil : `depth` -1 ouvre la vue d'ensemble de la frise, sinon la période à ce rang de son chemin. */
export type TimelineCrumb = { id: string; title: string; kind: 'story' | 'period'; frame: number; depth: number };

const periodTitle = (period: ListPeriod) => period.label.fr || period.label.en || 'Période sans nom';
const sameTitle = (a: string, b: string) => a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');

/**
 * Un seul chemin continu : chaque frise est un repère suivi de ses périodes ouvertes.
 * Une frise enfant commence souvent par sa période d'ancrage, ou par une période de même nom :
 * le repère et cette période ne forment alors qu'une étape, qui ouvre cette période.
 */
export function buildTimelineBreadcrumb(frames: StoryFrame[], storyTitle: (id: string) => string): TimelineCrumb[] {
  const crumbs: TimelineCrumb[] = [];
  frames.forEach((frame, index) => {
    const title = storyTitle(frame.id);
    const [first] = frame.path;
    const previousPath = frames[index - 1]?.path ?? [];
    const merged = !!first && (sameTitle(periodTitle(first), title) || first.id === previousPath[previousPath.length - 1]?.id);
    crumbs.push({ id: `story:${frame.id}`, title, kind: 'story', frame: index, depth: merged ? 0 : -1 });
    frame.path.forEach((period, depth) => {
      if (merged && depth === 0) return;
      crumbs.push({ id: `story:${frame.id}/period:${period.id}`, title: periodTitle(period), kind: 'period', frame: index, depth });
    });
  });
  return crumbs;
}

/**
 * Frises parentes accessibles, de la plus haute à la parente directe.
 * S'arrête à un parent inconnu ou inaccessible ; une lignée cyclique n'est pas affichée.
 */
export function storyAncestorIds(id: string, storyById: (id: string) => { parentStoryId?: string | null } | null): string[] {
  const ancestors: string[] = [];
  let parent = storyById(id)?.parentStoryId;
  while (parent && storyById(parent)) {
    if (parent === id || ancestors.includes(parent)) return [];
    ancestors.unshift(parent);
    parent = storyById(parent)?.parentStoryId;
  }
  return ancestors;
}
