import { expect, it } from 'vitest';
import { TimelineScalingService, type ScalablePeriod } from '@/services/TimelineScalingService';

const scaling = new TimelineScalingService();

it('frames the parent and every displayed period, independently of input order', () => {
  const parent = { startYearsBP: 86, endYearsBP: 80 };
  const longerChild = { startYearsBP: 89, endYearsBP: 79 };
  const insideChild = { startYearsBP: 85, endYearsBP: 84 };
  for (const periods of [[insideChild, longerChild], [longerChild, insideChild]]) {
    const duration = scaling.calculateTotalDuration(periods, parent);
    const start = scaling.getWindowStart(periods, parent);
    expect(duration).toBe(10); expect(start).toBe(89);
    expect(scaling.calculatePeriodStyles(longerChild, duration, start)).toEqual({ left: '0%', width: '100%' });
    expect(scaling.calculatePeriodStyles(parent, duration, start)).toEqual({ left: '30%', width: '60%' });
  }
});

it('keeps the whole parent in view when children fit or have no usable dates', () => {
  const parent = { startYearsBP: 100, endYearsBP: 0 };
  expect(scaling.calculateTotalDuration([{ startYearsBP: 80, endYearsBP: 20 }], parent)).toBe(100);
  expect(scaling.getWindowStart([{ startDate: 'unknown', endDate: 'unknown' }], parent)).toBe(100);
  expect(scaling.calculateTotalDuration([], parent)).toBe(100);
});
function interval(period: ScalablePeriod, duration = 100, start = 100) {
  const styles = scaling.calculatePeriodStyles(period, duration, start);
  const left = parseFloat(styles.left);
  return { left, right: left + parseFloat(styles.width), width: parseFloat(styles.width) };
}

it('clips the Hadean at the Earth window without extending it into the Archean', () => {
  const hadean = interval({ startYearsBP: 4.57e9, endYearsBP: 4.03e9 }, 4.54e9, 4.54e9);
  const archean = interval({ startYearsBP: 4.03e9, endYearsBP: 2.5e9 }, 4.54e9, 4.54e9);
  expect(hadean.left).toBe(0);
  expect(hadean.right).toBeCloseTo(archean.left, 10);
  expect(hadean.width).toBeCloseTo((4.54e9 - 4.03e9) / 4.54e9 * 100, 10);
});

it.each([
  [120, 70, 0, 30],
  [30, -20, 70, 30],
  [120, -20, 0, 100],
  [150, 120, 0, 0],
  [-10, -30, 100, 0],
  [80, 40, 20, 40],
  [80, 90, 20, 0],
])('projects [%s, %s] using both clipped boundaries', (start, end, left, width) => {
  const bounds = interval({ startYearsBP: start, endYearsBP: end });
  expect(bounds.left).toBeCloseTo(left, 10); expect(bounds.width).toBeCloseTo(width, 10);
});

it.each([0, -100, NaN, Infinity])('keeps a degenerate window finite (duration %s)', duration => {
  expect(interval({ startYearsBP: 80, endYearsBP: 20 }, duration)).toEqual({ left: 0, right: 0, width: 0 });
});

it('keeps an unknown boundary off the axis instead of inventing a duration', () => {
  expect(interval({ startDate: 'unknown', endYearsBP: 20 })).toEqual({ left: 0, right: 0, width: 0 });
});
