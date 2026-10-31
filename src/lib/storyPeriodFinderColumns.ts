import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { compareStoryPeriodsByLabel } from '@/lib/periodTreeLabelKey';
import { getStoryPeriodBoundaryYearsBP } from '@/lib/storyPeriodBoundaryYbp';
import type { StoryPeriodInput } from '@/types/periodTree';
import type { Category, ListPeriod, MultilingualText } from '@/types/database';

export function listPeriodToStoryPeriodInput(p: ListPeriod): StoryPeriodInput {
  return {
    id: p.id,
    label: p.label,
    startDate: p.startDate,
    endDate: p.endDate,
    parentId: p.parentId ?? null,
    ...(p.storyParentId !== undefined ? { storyParentId: p.storyParentId } : {}),
    categories: p.categories,
  };
}

/** Enfants directs en base pour `parentId`, absents de la story. */
export function getGlobalChildrenNotInStory(
  all: ListPeriod[],
  parentId: string,
  storyIdSet: Set<string>
): ListPeriod[] {
  return all.filter((p) => p.parentId === parentId && !storyIdSet.has(p.id));
}

function startBpForChronologicalSort(p: StoryPeriodInput): number {
  const v = getStoryPeriodBoundaryYearsBP(p as Record<string, unknown>, 'start');
  return v !== null && Number.isFinite(v) ? v : Number.NEGATIVE_INFINITY;
}

/**
 * Tri chronologique : plus ancien (début plus tôt, années BP plus élevées) en premier.
 * Sans date de début exploitable : en fin de liste, puis ordre par libellé.
 */
export function compareStoryPeriodsByStartOldestFirst(a: StoryPeriodInput, b: StoryPeriodInput): number {
  const da = startBpForChronologicalSort(a);
  const db = startBpForChronologicalSort(b);
  const aMiss = da === Number.NEGATIVE_INFINITY;
  const bMiss = db === Number.NEGATIVE_INFINITY;
  if (aMiss && bMiss) return compareStoryPeriodsByLabel(a, b);
  if (aMiss) return 1;
  if (bMiss) return -1;
  if (da !== db) return db - da;
  return compareStoryPeriodsByLabel(a, b);
}

export function getStoryPeriodRoots(periods: StoryPeriodInput[]): StoryPeriodInput[] {
  const list = periods ?? [];
  if (!list.length) return [];
  const ids = new Set(list.map((x) => x.id));
  return list
    .filter((p) => {
      const pid = getStoryPeriodParentId(p);
      return !pid || !ids.has(pid);
    })
    .slice()
    .sort(compareStoryPeriodsByStartOldestFirst);
}

export function getStoryPeriodChildren(
  periods: StoryPeriodInput[],
  parentId: string
): StoryPeriodInput[] {
  return periods
    .filter((p) => getStoryPeriodParentId(p) === parentId)
    .slice()
    .sort(compareStoryPeriodsByStartOldestFirst);
}

/**
 * `rootId` et tous les descendants dans le graphe induit par `parentId` / `parent_id`,
 * en ne suivant que des arêtes dont le parent est dans `periods` (même story).
 */
export function collectStoryPeriodSubtreeIds(periods: StoryPeriodInput[], rootId: string): string[] {
  const list = periods ?? [];
  const idsInStory = new Set(list.map((p) => p.id));
  if (!idsInStory.has(rootId)) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const p of list) {
    const pid = getStoryPeriodParentId(p);
    if (pid && idsInStory.has(pid)) {
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid)!.push(p.id);
    }
  }

  const out: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const k of childrenByParent.get(id) ?? []) stack.push(k);
  }
  return out;
}

/** Chaîne d'ids du parent racine jusqu'à `periodId` (inclus), pour un graphe restreint à `periods`. */
export function buildStoryFinderPathFromSelectedPeriodId(
  periods: StoryPeriodInput[],
  periodId: string | null
): string[] {
  if (!periodId || !periods.length) return [];
  const ids = new Set(periods.map((p) => p.id));
  if (!ids.has(periodId)) return [];
  const byId = new Map(periods.map((p) => [p.id, p] as const));
  const rev: string[] = [];
  let cur: string | null = periodId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    rev.push(cur);
    const p = byId.get(cur);
    const pid = p ? getStoryPeriodParentId(p) : null;
    cur = pid && ids.has(pid) ? pid : null;
  }
  rev.reverse();
  return rev;
}

export function storyPeriodLabelForFinder(p: StoryPeriodInput): MultilingualText {
  const l = p.label;
  if (l && typeof l === 'object' && 'fr' in l) {
    const o = l as { fr?: string; en?: string };
    return { fr: o.fr ?? '', en: o.en ?? '' };
  }
  if (typeof l === 'string') return { fr: l, en: l };
  return { fr: '', en: '' };
}

export function storyPeriodDateFields(p: StoryPeriodInput): { startDate?: string; endDate?: string } {
  return {
    startDate: p.startDate ?? p.start_date,
    endDate: p.endDate ?? p.end_date,
  };
}

export function storyPeriodCategories(p: StoryPeriodInput): Category[] | undefined {
  const c = (p as { categories?: Category[] }).categories;
  return Array.isArray(c) && c.length ? c : undefined;
}

export function storyPeriodHasChildrenInStory(periods: StoryPeriodInput[], periodId: string): boolean {
  return periods.some((c) => getStoryPeriodParentId(c) === periodId);
}
