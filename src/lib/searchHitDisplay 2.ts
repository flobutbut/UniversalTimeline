/** Libellé court du type de résultat (UI recherche). */
export function searchHitTypeFrLabel(type: 'period' | 'event'): string {
  return type === 'period' ? 'période' : 'événement';
}

/** Déplace le curseur dans une liste (flèches haut / bas). */
export function moveListCursor(current: number, delta: 1 | -1, itemCount: number): number {
  const max = itemCount - 1;
  if (max < 0) return current;
  return Math.max(0, Math.min(max, current + delta));
}
