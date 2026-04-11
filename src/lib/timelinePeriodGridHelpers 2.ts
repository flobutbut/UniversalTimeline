/** Étire les positions % autour de l’intervalle [t1, t2] pour garder une largeur min (timeline). */
export function timelineFocusTransform(val: number, t1: number, t2: number, minPct: number): number {
  const w = t2 - t1;
  if (w <= 0) return val;
  const f = (100 - minPct) / (100 - w);
  if (val <= t1) return val * f;
  if (val >= t2) return t1 * f + minPct + (val - t2) * f;
  return t1 * f + ((val - t1) / w) * minPct;
}

/** Alignement de la bulle événement selon la position % sur la frise. */
export function timelineEventCardAlign(
  leftPct: number,
  edgeLo = 12,
  edgeHi = 88
): 'start' | 'center' | 'end' {
  if (leftPct < edgeLo) return 'start';
  if (leftPct > edgeHi) return 'end';
  return 'center';
}

/** DOM depuis ref de composant Vue (`$el`) ou élément natif. */
export function unwrapTemplateRefToHTMLElement(el: unknown): HTMLElement | null {
  if (el == null) return null;
  if (el instanceof HTMLElement) return el;
  if (typeof el === 'object' && '$el' in (el as object)) {
    const inner = (el as { $el?: unknown }).$el;
    return inner instanceof HTMLElement ? inner : null;
  }
  return null;
}
