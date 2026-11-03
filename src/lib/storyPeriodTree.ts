import type { ListPeriod } from '@/types/database';
import { getStoryPeriodParentId } from './storyPeriodParent';
import { compareStoryPeriodsByStartOldestFirst } from './storyPeriodFinderColumns';

export interface StoryPeriodTreeNode {
  key: string;
  period: ListPeriod;
  inStory: boolean;
  children: StoryPeriodTreeNode[];
}

/** Les suggestions ne deviennent jamais des racines et ne déplacent pas une période associée. */
export function buildStoryPeriodTree(periods: ListPeriod[], additional: ListPeriod[] = []): StoryPeriodTreeNode[] {
  const associated = new Set(periods.map(period => period.id));
  const children = new Map<string, ListPeriod[]>();
  const roots: ListPeriod[] = [];
  for (const period of periods) {
    const parent = getStoryPeriodParentId(period);
    if (!parent || !associated.has(parent)) roots.push(period);
    else children.set(parent, [...children.get(parent) ?? [], period]);
  }
  for (const period of additional) {
    const parent = getStoryPeriodParentId(period);
    if (!parent || associated.has(period.id) || children.get(parent)?.some(row => row.id === period.id)) continue;
    children.set(parent, [...children.get(parent) ?? [], period]);
  }
  const visited = new Set<string>();
  function node(period: ListPeriod, path: string[]): StoryPeriodTreeNode {
    visited.add(period.id);
    const ids = [...path, period.id];
    return { key: JSON.stringify(ids), period, inStory: associated.has(period.id), children: (children.get(period.id) ?? [])
      .filter(child => !ids.includes(child.id)).slice().sort(compareStoryPeriodsByStartOldestFirst).map(child => node(child, ids)) };
  }
  const result = roots.sort(compareStoryPeriodsByStartOldestFirst).map(period => node(period, []));
  // Une donnée ancienne incohérente reste consultable, sans récursion infinie.
  for (const period of periods) if (!visited.has(period.id)) result.push(node(period, []));
  return result;
}

const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
export function filterStoryPeriodTree(nodes: StoryPeriodTreeNode[], search: string, categoryId: string): StoryPeriodTreeNode[] {
  const query = normalized(search);
  if (!query && !categoryId) return nodes;
  return nodes.flatMap(node => {
    const children = filterStoryPeriodTree(node.children, search, categoryId);
    const label = node.period.label.fr?.trim() || node.period.label.en || '';
    const matches = (!query || normalized(label).includes(query)) && (!categoryId || node.period.categories.some(category => category.id === categoryId));
    return matches || children.length ? [{ ...node, children }] : [];
  });
}

export function findStoryPeriodTreePath(nodes: StoryPeriodTreeNode[], id: string): StoryPeriodTreeNode[] {
  for (const node of nodes) {
    if (node.period.id === id) return [node];
    const path = findStoryPeriodTreePath(node.children, id);
    if (path.length) return [node, ...path];
  }
  return [];
}
