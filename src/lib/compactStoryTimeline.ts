/** Miniature de frise (cartes) : seules les périodes principales, sur un nombre de lignes borné. */
export const COMPACT_MAX_LANES = 4;
export const COMPACT_ROOT_HEIGHT = 10;
export const COMPACT_BAR_HEIGHT = 8;
export const COMPACT_LANE_GAP = 2;
export const INTERACTIVE_BAR_SIZES = { rootHeight: 18, barHeight: 16, gap: 4 };
/** Largeur minimale (en %) prise en compte pour qu'une période très brève occupe sa place. */
const MIN_WIDTH = 0.5;

export interface CompactBar { left: number; width: number; isRoot: boolean }
export type CompactPlacement<T> = T & { lane: number; top: number };

/**
 * Range les racines puis leurs enfants directs sur des lignes sans chevauchement, racines en premier.
 * Une période qui ne trouve aucune place dans les `maxLanes` lignes est omise de la miniature.
 * Chaque ligne est séparée de la suivante par le même écart, quelle que soit sa hauteur.
 */
export function layoutCompactLanes<T extends CompactBar>(bars: T[], maxLanes = COMPACT_MAX_LANES, sizes = { rootHeight: COMPACT_ROOT_HEIGHT, barHeight: COMPACT_BAR_HEIGHT, gap: COMPACT_LANE_GAP }): { placed: CompactPlacement<T>[]; height: number } {
  const lanes: { end: number; isRoot: boolean }[] = [];
  const placed: (T & { lane: number })[] = [];
  const byLeft = (a: T, b: T) => a.left - b.left || b.width - a.width;
  for (const bar of [...bars.filter(b => b.isRoot).sort(byLeft), ...bars.filter(b => !b.isRoot).sort(byLeft)]) {
    let lane = lanes.findIndex(l => l.isRoot === bar.isRoot && l.end <= bar.left + 1e-9);
    if (lane < 0) {
      if (lanes.length >= maxLanes) continue;
      lane = lanes.push({ end: -Infinity, isRoot: bar.isRoot }) - 1;
    }
    lanes[lane].end = bar.left + Math.max(bar.width, MIN_WIDTH);
    placed.push({ ...bar, lane });
  }
  const tops: number[] = [];
  let cursor = 0;
  for (const lane of lanes) {
    tops.push(cursor);
    cursor += (lane.isRoot ? sizes.rootHeight : sizes.barHeight) + sizes.gap;
  }
  return { placed: placed.map(bar => ({ ...bar, top: tops[bar.lane] })), height: Math.max(0, cursor - sizes.gap) };
}
