import { temporalBounds, type TemporalCandidate as Candidate } from '../shared/temporal.js';
export interface TemporalCandidate extends Candidate { story_id: string | number }
interface Bound { story_id: string; start_date: string | null; end_date: string | null }
export function aggregateStoryTemporalBounds(rows: TemporalCandidate[], now = Date.now()): Bound[] {
  const groups = new Map<string, TemporalCandidate[]>();
  for (const row of rows) {
    const id = String(row.story_id);
    const group = groups.get(id) ?? [];
    group.push(row); groups.set(id, group);
  }
  return [...groups].map(([story_id, group]) => {
    const { start, end } = temporalBounds(group, now);
    return { story_id, start_date: start, end_date: end };
  });
}
