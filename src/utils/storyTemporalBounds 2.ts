/**
 * Bornes temporelles d’une story : min des débuts (starts périodes + dates événements),
 * max des fins (ends périodes + dates événements). Même logique que l’agrégation SQL liste.
 */
export function temporalBoundsFromStoryDetail(story: {
  periods?: Array<{ startDate?: string; endDate?: string }>;
  events?: Array<{ date?: string }>;
}): { start?: string; end?: string } {
  const starts: string[] = [];
  const ends: string[] = [];
  for (const p of story.periods ?? []) {
    const s = p.startDate?.trim();
    const e = p.endDate?.trim();
    if (s) starts.push(s);
    if (e) ends.push(e);
  }
  for (const ev of story.events ?? []) {
    const d = ev.date?.trim();
    if (d) {
      starts.push(d);
      ends.push(d);
    }
  }
  if (starts.length === 0 && ends.length === 0) return {};
  starts.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  ends.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    start: starts[0],
    end: ends[ends.length - 1],
  };
}
