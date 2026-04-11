/**
 * Remonte les ancêtres d’une période jusqu’à la racine.
 * Retourne `[racineId, …, parentId, targetId]`.
 */
export async function buildPeriodIdAncestorChain(
  targetId: string,
  options: {
    getPeriodFromStore: (id: string) => { parentId?: string | null } | undefined;
    fetchPeriodFromApi: (id: string) => Promise<{ parentId?: string | null } | null | undefined>;
    maxDepth?: number;
  }
): Promise<string[]> {
  const path: string[] = [targetId];
  let currentId = targetId;
  const maxDepth = options.maxDepth ?? 12;

  for (let i = 0; i < maxDepth; i++) {
    const inStore = options.getPeriodFromStore(currentId);
    let parentId: string | null | undefined = inStore?.parentId ?? null;

    if (!inStore) {
      try {
        const fetched = await options.fetchPeriodFromApi(currentId);
        parentId = fetched?.parentId ?? null;
      } catch {
        break;
      }
    }

    if (!parentId) break;
    path.unshift(parentId);
    currentId = parentId;
  }

  return path;
}
