/** Local hierarchy, independent of dates: missing parents are roots and cycles remain bounded. */
export function timelineHierarchy<T extends { id: string }>(
  items: readonly T[], parentOf: (item: T) => string | null, rootIds?: readonly string[],
): Array<{ item: T; depth: number }> {
  const byId = new Map(items.map(item => [item.id, item]));
  const children = new Map<string, T[]>();
  for (const item of items) {
    const parent = parentOf(item);
    if (parent && byId.has(parent)) {
      const bucket = children.get(parent) ?? [];
      bucket.push(item); children.set(parent, bucket);
    }
  }
  const roots = rootIds ?? items.filter(item => !byId.has(parentOf(item) ?? '')).map(item => item.id);
  const visited = new Set<string>();
  const result: Array<{ item: T; depth: number }> = [];
  function visit(id: string) {
    const first = byId.get(id);
    if (!first) return;
    const queue = [{ item: first, depth: 0 }];
    for (let index = 0; index < queue.length; index++) {
      const entry = queue[index];
      if (visited.has(entry.item.id)) continue;
      visited.add(entry.item.id); result.push(entry);
      for (const child of children.get(entry.item.id) ?? []) queue.push({ item: child, depth: entry.depth + 1 });
    }
  }
  roots.forEach(visit);
  if (!rootIds) items.forEach(item => { if (!visited.has(item.id)) visit(item.id); });
  return result;
}
