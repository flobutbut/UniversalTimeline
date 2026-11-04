import { layoutSequentialLanes } from './sequentialTimelineLanes';
/** Miniatures only adapt row heights and cap visibility; placement uses the shared engine. */
export const COMPACT_MAX_LANES = 4;
export const COMPACT_ROOT_HEIGHT = 10;
export const COMPACT_BAR_HEIGHT = 8;
export const COMPACT_LANE_GAP = 2;
export const INTERACTIVE_BAR_SIZES = { rootHeight: 18, barHeight: 16, gap: 4 };
export interface CompactBar { left: number; width: number; isRoot: boolean; depth?: number; startYbp?: number; endYbp?: number }
export type CompactPlacement<T> = T & { lane: number; top: number };

export function layoutCompactLanes<T extends CompactBar>(bars: T[], maxLanes = COMPACT_MAX_LANES, sizes = { rootHeight: COMPACT_ROOT_HEIGHT, barHeight: COMPACT_BAR_HEIGHT, gap: COMPACT_LANE_GAP }): { placed: CompactPlacement<T>[]; height: number } {
  const rows = layoutSequentialLanes(bars.map(bar => ({
    bar, depth: bar.depth ?? (bar.isRoot ? 0 : 1),
    start: bar.startYbp ?? -bar.left, end: bar.endYbp ?? -(bar.left + bar.width),
  }))).filter(row => row.lane < maxLanes);
  const heights = new Map<number, number>();
  for (const { bar, lane } of rows) heights.set(lane, Math.max(heights.get(lane) ?? 0, bar.isRoot ? sizes.rootHeight : sizes.barHeight));
  const tops = new Map<number, number>();
  let cursor = 0;
  for (const lane of [...heights.keys()].sort((a, b) => a - b)) {
    tops.set(lane, cursor); cursor += heights.get(lane)! + sizes.gap;
  }
  return { placed: rows.map(({ bar, lane }) => ({ ...bar, lane, top: tops.get(lane)! })), height: Math.max(0, cursor - sizes.gap) };
}
