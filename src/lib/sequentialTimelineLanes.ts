interface TimelineInterval { start: number; end: number; depth?: number }

/** Years BP: successive intervals share the current lane; overlaps only move downward. */
export function layoutSequentialLanes<T extends TimelineInterval>(intervals: readonly T[]): Array<T & { lane: number }> {
  const chronological = intervals.map(item => ({ item, start: Math.max(item.start,item.end), end: Math.min(item.start,item.end) }))
    .sort((a,b) => b.start - a.start || a.end - b.end || (a.item.depth ?? 0) - (b.item.depth ?? 0));
  let lane = 0;
  let previousEnd = Infinity;
  return chronological.map(({ item, start, end }) => {
    if (start > previousEnd) lane++;
    previousEnd = end;
    return { ...item, lane };
  });
}
