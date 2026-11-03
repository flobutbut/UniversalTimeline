import { comparableYearsBeforePresent, resolveYearsBeforePresent } from '@temporal';
export interface ScalablePeriod {
  startYearsBP?: number; endYearsBP?: number; startDate?: string; endDate?: string;
  temporalData?: Array<{ startDate?: string; endDate?: string }>;
}
export function periodCoordinates(p: ScalablePeriod, referenceTime?: number) {
  const coordinate = (raw: string | undefined, stored: number | undefined) => referenceTime === undefined
    ? resolveYearsBeforePresent(raw, stored)
    : comparableYearsBeforePresent(raw, stored, referenceTime);
  return {
    start: coordinate(p.startDate ?? p.temporalData?.[0]?.startDate, p.startYearsBP),
    end: coordinate(p.endDate ?? p.temporalData?.[0]?.endDate, p.endYearsBP),
  };
}
function windowBounds(periods: ScalablePeriod[], parent: ScalablePeriod | undefined, referenceTime: number) {
  // A historical membership does not imply that a child fits its parent's dates.
  const candidates = parent ? [parent, ...periods] : periods;
  const values = candidates.flatMap(p => Object.values(periodCoordinates(p, referenceTime))).filter((v): v is number => v !== null);
  return values.length ? { start: Math.max(...values), end: Math.min(...values) } : { start: 0, end: 0 };
}
export class TimelineScalingService {
  calculateTotalDuration(periods: ScalablePeriod[], parent?: ScalablePeriod, referenceTime = Date.now()): number {
    const { start, end } = windowBounds(periods, parent, referenceTime);
    return Math.max(0, start - end);
  }
  calculateRelativePosition(dateYBP: number | null, totalDuration: number, windowStartYBP: number): number {
    if (dateYBP === null || !Number.isFinite(dateYBP) || !Number.isFinite(totalDuration) || !Number.isFinite(windowStartYBP) || totalDuration <= 0) return 0;
    return Math.max(0, Math.min(100, ((windowStartYBP - dateYBP) / totalDuration) * 100));
  }
  calculatePeriodStyles(period: ScalablePeriod, totalDuration: number, windowStartYBP: number, referenceTime = Date.now()): { width: string; left: string } {
    const { start, end } = periodCoordinates(period, referenceTime);
    const left = this.calculateRelativePosition(start, totalDuration, windowStartYBP);
    const right = this.calculateRelativePosition(end, totalDuration, windowStartYBP);
    // Borner les deux extrémités : déplacer seulement le début conserve à tort
    // la durée hors fenêtre et fait empiéter la carte sur la période suivante.
    const width = start === null || end === null ? 0 : Math.max(0, right - left);
    return { width: `${width}%`, left: `${left}%` };
  }
  getWindowStart(periods: ScalablePeriod[], parent?: ScalablePeriod, referenceTime = Date.now()): number { return windowBounds(periods, parent, referenceTime).start; }
}
