import { resolveYearsBeforePresent } from '@temporal';
export interface SearchTimeBounds { start: number; end: number }
const ignored = new Set(['le','la','les','un','une','de','des','du','a','au','aux','sur','dans','et','en','pour','qui','que','à','l','d']);
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function creationSearchScore(query: string, hit: { label: string; description?: string; startDate?: string; endDate?: string; semanticRank?: number; source: string }, bounds?: SearchTimeBounds | null): number {
  const words = normalize(query).split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1 && !ignored.has(word));
  const text = normalize(`${hit.label} ${hit.description ?? ''}`);
  const coverage = words.length ? words.filter(word => text.includes(word)).length / words.length : 0;
  const exact = normalize(hit.label) === normalize(query.trim()) ? 3 : 0;
  const semantic = hit.semanticRank !== undefined ? 2 / (1 + hit.semanticRank * 0.15) : 0;
  const start = resolveYearsBeforePresent(hit.startDate, undefined); const end = resolveYearsBeforePresent(hit.endDate, undefined) ?? start;
  const overlaps = bounds && start !== null && end !== null && Math.max(start, end) >= bounds.end && Math.min(start, end) <= bounds.start;
  return exact + coverage + semantic + (overlaps ? 0.35 : 0) + (hit.source === 'local' ? 0.1 : 0);
}
