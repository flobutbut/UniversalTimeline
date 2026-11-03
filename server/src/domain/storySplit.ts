/** Pure rules for creating a frise from one period of another frise (its sub-periods move to the new frise). */
export interface Placement { id: string; parent_id: string | null }
export interface DatedItem { id: string; yearsBP: number | null }

/** The chosen period becomes the root; its descendants keep their placement within the source frise. */
export function periodSubtree(placements: readonly Placement[], rootId: string): Placement[] | null {
  const present = new Set(placements.map(row => row.id));
  if (!present.has(rootId)) return null;
  const children = new Map<string, string[]>();
  for (const row of placements) {
    // A parent outside the frise places the period at the frise's top level.
    const parent = row.parent_id && present.has(row.parent_id) ? row.parent_id : null;
    if (parent) children.set(parent, [...(children.get(parent) ?? []), row.id]);
  }
  const subtree: Placement[] = [{ id: rootId, parent_id: null }];
  const seen = new Set([rootId]);
  for (let index = 0; index < subtree.length; index++) {
    for (const child of (children.get(subtree[index].id) ?? []).sort()) {
      if (seen.has(child)) continue; // a corrupted cycle never loops
      seen.add(child);
      subtree.push({ id: child, parent_id: subtree[index].id });
    }
  }
  return subtree;
}

/** Items whose date falls within [start, end] (years before present, start ≥ end), bounds included. */
export function itemsWithinPeriod(items: readonly DatedItem[], startBP: number | null, endBP: number | null): string[] {
  if (startBP === null || endBP === null || startBP < endBP) return [];
  return items.filter(item => item.yearsBP !== null && item.yearsBP <= startBP && item.yearsBP >= endBP).map(item => item.id).sort();
}
