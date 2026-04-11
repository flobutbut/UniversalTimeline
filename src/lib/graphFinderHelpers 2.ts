/** Période parente de la colonne `colIdx` (colonne 0 = racines, pas de parent). */
export function getFinderColumnParentPeriod<T extends { id: string }>(
  colIdx: number,
  selectedIds: readonly string[],
  periods: readonly T[]
): T | null {
  if (colIdx <= 0) return null;
  const parentId = selectedIds[colIdx - 1];
  if (!parentId) return null;
  return periods.find((p) => p.id === parentId) ?? null;
}

/** Colonne survolée pendant un drag (null si même colonne d’origine ou introuvable). */
export function finderDragOverColumnAfterMove(
  colIdx: number,
  draggedItemId: string,
  columns: ReadonlyArray<ReadonlyArray<{ id: string }>>
): number | null {
  const originColIdx = columns.findIndex((col) => col.some((item) => item.id === draggedItemId));
  if (originColIdx < 0) return null;
  return colIdx !== originColIdx ? colIdx : null;
}
