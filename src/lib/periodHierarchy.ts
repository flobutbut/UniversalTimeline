interface HierarchyEntry { id: string; parentId?: string | null }

/** Incomplete local data is only a UI hint; the API validates the full hierarchy. */
export function isPeriodDescendant(periods: readonly HierarchyEntry[], childId: string, ancestorId: string): boolean {
  const byId = new Map(periods.map(period => [period.id, period]));
  const visited = new Set<string>();
  let currentId: string | null | undefined = childId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const parentId: string | null | undefined = byId.get(currentId)?.parentId;
    if (parentId === ancestorId) return true;
    currentId = parentId;
  }
  return false;
}
