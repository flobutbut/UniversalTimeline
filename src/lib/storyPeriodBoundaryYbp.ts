import { resolveYearsBeforePresent } from '@temporal';
/** Story period input can use either API or UI field names; no implicit present. */
export function getStoryPeriodBoundaryYearsBP(p: Record<string, unknown>, field: 'start' | 'end'): number | null {
  const raw = p[`${field}_date`] ?? p[`${field}Date`];
  return resolveYearsBeforePresent(typeof raw === 'string' ? raw : undefined, p[`${field}_years_bp`] ?? p[`${field}YearsBP`]);
}
