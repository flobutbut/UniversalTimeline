import { comparableYearsBeforePresent, MS_PER_YEAR } from '@temporal';

/** Plage en années avant présent : `oldBP` ≥ `recentBP` ≥ 0. */
export interface StoryTimeRange { oldBP: number; recentBP: number }

/** Bord gauche du curseur : un peu au-delà de l'âge de l'Univers. */
export const OLDEST_BP = 1.4e10;
const SPAN = Math.log10(OLDEST_BP + 1);

/** Position 0 (le plus ancien, à gauche) → 1 (aujourd'hui) ; chaque ordre de grandeur a la même place. */
export function positionFromYearsBP(bp: number): number {
  return 1 - Math.log10(Math.min(Math.max(bp, 0), OLDEST_BP) + 1) / SPAN;
}
export function yearsBPFromPosition(position: number): number {
  return Math.max(0, 10 ** ((1 - Math.min(Math.max(position, 0), 1)) * SPAN) - 1);
}

const number = (value: number, digits: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
/** Libellé lisible à toutes les échelles : années civiles récentes, puis ka, Ma, Ga. */
export function formatYearsBP(bp: number, now = Date.now()): string {
  if (bp < 0.5) return 'aujourd’hui';
  if (bp < 12000) {
    // The calendar year in progress at that date: 2 September 1945 is 1945, not 1946.
    const year = Math.floor(new Date(now).getUTCFullYear() + (now - Date.UTC(new Date(now).getUTCFullYear(), 0, 1)) / MS_PER_YEAR - bp);
    return year > 0 ? String(year) : `${1 - year} av. J.-C.`;
  }
  if (bp < 1e6) return `${number(bp / 1e3, bp < 1e5 ? 1 : 0)} ka`;
  if (bp < 1e9) return `${number(bp / 1e6, bp < 1e8 ? 1 : 0)} Ma`;
  return `${number(bp / 1e9, 2)} Ga`;
}
export function formatStoryTimeRange(range: StoryTimeRange, now = Date.now()): string {
  return `${formatYearsBP(range.oldBP, now)} → ${formatYearsBP(range.recentBP, now)}`;
}

/** Une frise est gardée si sa période recoupe la plage ; sans dates connues, elle ne peut pas l'être. */
export function storyOverlapsRange(story: { startDate?: string; endDate?: string }, range: StoryTimeRange, now = Date.now()): boolean {
  const start = comparableYearsBeforePresent(story.startDate, undefined, now);
  const end = comparableYearsBeforePresent(story.endDate, undefined, now) ?? start;
  if (start === null || end === null) return false;
  return Math.max(start, end) >= range.recentBP && Math.min(start, end) <= range.oldBP;
}

/** Plage d'une période du catalogue, ou null si ses bornes ne sont pas connues. */
export function rangeFromPeriod(period: { startDate?: string; endDate?: string; startYearsBP?: number; endYearsBP?: number }, now = Date.now()): StoryTimeRange | null {
  const start = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
  const end = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
  if (start === null || end === null) return null;
  return { oldBP: Math.max(start, end), recentBP: Math.min(start, end) };
}
