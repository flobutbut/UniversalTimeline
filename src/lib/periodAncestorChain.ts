/**
 * Remonte les ancêtres d'une période jusqu'à la racine.
 * Retourne `[racineId, …, parentId, targetId]`.
 */
export async function buildPeriodIdAncestorChain(
  targetId: string,
  options: {
    getPeriodFromStore: (id: string) => { parentId?: string | null } | undefined;
    fetchPeriodFromApi: (id: string) => Promise<{ parentId?: string | null } | null | undefined>;
    maxDepth?: number;
    /** Stops a caller's abandoned navigation without cancelling shared store reads. */
    isCurrent?: () => boolean;
  }
): Promise<string[]> {
  const path: string[] = [];
  const visited = new Set<string>();
  let currentId = targetId;
  const maxDepth = options.maxDepth ?? 100;

  for (let i = 0; i < maxDepth; i++) {
    if (options.isCurrent && !options.isCurrent()) return [];
    if (visited.has(currentId)) throw new Error('Le chemin de cette période contient un cycle.');
    visited.add(currentId);
    const period = options.getPeriodFromStore(currentId) ?? await options.fetchPeriodFromApi(currentId);
    if (options.isCurrent && !options.isCurrent()) return [];
    if (!period) throw new Error('Une période du chemin est introuvable.');
    path.unshift(currentId);
    const parentId = period.parentId;
    if (!parentId) return path;
    currentId = parentId;
  }
  throw new Error('Le chemin de cette période dépasse la profondeur autorisée.');
}
