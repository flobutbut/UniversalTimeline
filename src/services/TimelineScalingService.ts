import { comparableYearsBeforePresent, resolveYearsBeforePresent } from '@temporal';
export interface ScalablePeriod {
  startYearsBP?: number; endYearsBP?: number; startDate?: string; endDate?: string;
  temporalData?: Array<{ startDate?: string; endDate?: string }>;
}
export interface TimelineBounds extends ScalablePeriod { startYearsBP: number; endYearsBP: number }
export function periodCoordinates(p: ScalablePeriod, referenceTime?: number) {
  const coordinate = (raw: string | undefined, stored: number | undefined) => referenceTime === undefined
    ? resolveYearsBeforePresent(raw, stored)
    : comparableYearsBeforePresent(raw, stored, referenceTime);
  return {
    start: coordinate(p.startDate ?? p.temporalData?.[0]?.startDate, p.startYearsBP),
    end: coordinate(p.endDate ?? p.temporalData?.[0]?.endDate, p.endYearsBP),
  };
}
/** Keep the source dates so calendar boundaries can be compared again at the layout's reference instant. */
export function timelineBounds(periods: ScalablePeriod[], referenceTime = Date.now()): TimelineBounds | null {
  let start = -Infinity, end = Infinity;
  let startDate: string | undefined, endDate: string | undefined;
  for (const period of periods) {
    const coordinates = periodCoordinates(period, referenceTime);
    const boundaries = [
      { value: coordinates.start, raw: period.startDate ?? period.temporalData?.[0]?.startDate },
      { value: coordinates.end, raw: period.endDate ?? period.temporalData?.[0]?.endDate },
    ];
    for (const { value, raw } of boundaries) {
      if (value === null || !Number.isFinite(value)) continue;
      if (value > start || (value === start && !startDate && raw?.trim())) { start = value; startDate = raw?.trim() ? raw : undefined; }
      if (value < end || (value === end && !endDate && raw?.trim())) { end = value; endDate = raw?.trim() ? raw : undefined; }
    }
  }
  return start === -Infinity ? null : { startYearsBP: start, endYearsBP: end,
    ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) };
}
function windowBounds(periods: ScalablePeriod[], parent: ScalablePeriod | undefined, referenceTime: number) {
  // A historical membership does not imply that a child fits its parent's dates.
  const candidates = parent ? [parent, ...periods] : periods;
  const bounds = timelineBounds(candidates, referenceTime);
  return { start: bounds?.startYearsBP ?? 0, end: bounds?.endYearsBP ?? 0 };
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
