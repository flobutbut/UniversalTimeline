export type HierarchyFailure = 'cycle' | 'incomplete';
/** A finite walk also rejects pre-existing cycles and broken ancestor chains. */
export function checkAncestorChain(
  parents: ReadonlyMap<string, string | null>,
  parentId: string,
  forbiddenIds: ReadonlySet<string>,
): HierarchyFailure | null {
  const visited = new Set<string>();
  let current: string | null = parentId;
  while (current !== null) {
    if (forbiddenIds.has(current) || visited.has(current)) return 'cycle';
    if (!parents.has(current)) return 'incomplete';
    visited.add(current);
    current = parents.get(current)!;
  }
  return null;
}
