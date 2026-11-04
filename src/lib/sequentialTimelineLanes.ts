interface TimelineInterval { start: number; end: number; depth?: number }

/** Shared by all timeline renderers. Successions share a lane within each hierarchy level;
 * overlaps only move downward, and each deeper level starts below the preceding one. */
export function layoutSequentialLanes<T extends TimelineInterval>(intervals: readonly T[]): Array<T & { lane: number }> {
  const levels = new Map<number, T[]>();
  for (const item of intervals) {
    if (!Number.isFinite(item.start) || !Number.isFinite(item.end)) continue;
    const depth = Number.isFinite(item.depth) ? Math.max(0, Math.floor(item.depth!)) : 0;
    const level = levels.get(depth) ?? [];
    level.push(item); levels.set(depth, level);
  }
  const placed: Array<T & { lane: number }> = [];
  let offset = 0;
  for (const depth of [...levels.keys()].sort((a, b) => a - b)) {
    const chronological = levels.get(depth)!.map(item => ({ item, start: Math.max(item.start,item.end), end: Math.min(item.start,item.end) }))
      .sort((a,b) => b.start - a.start || a.end - b.end);
    let lane = 0;
    let previousEnd = Infinity;
    for (const { item, start, end } of chronological) {
      if (start > previousEnd) lane++;
      previousEnd = end;
      placed.push({ ...item, lane: offset + lane });
    }
    offset += lane + 1;
  }
  return placed;
}
