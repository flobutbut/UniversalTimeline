import { describe, expect, it } from 'vitest';
import { journeyChapters, journeyDuration, journeyFrame, journeyTickLabel, JOURNEY_YEAR_SECONDS } from '@/lib/scrollJourney';

describe('scroll journey camera', () => {
  it('passes through every chapter duration and reaches exactly one second', () => {
    journeyChapters.forEach((chapter, index) => {
      const frame = journeyFrame(index / (journeyChapters.length - 1));
      expect(frame.index).toBe(index);
      expect(frame.duration / chapter.duration).toBeCloseTo(1, 12);
    });
    expect(journeyFrame(1).duration).toBe(1);
    expect(journeyFrame(.99).index).toBe(journeyChapters.length - 2);
  });
  it('zooms continuously and monotonically through more than seventeen orders of magnitude', () => {
    let previous = Infinity;
    for (let sample = 0; sample <= 1000; sample++) {
      const frame = journeyFrame(sample / 1000);
      expect(Number.isFinite(frame.duration)).toBe(true);
      expect(frame.duration).toBeGreaterThanOrEqual(1);
      expect(frame.duration).toBeLessThanOrEqual(previous);
      previous = frame.duration;
    }
    expect(Math.log10(journeyChapters[0].duration)).toBeGreaterThan(17);
  });
  it('bounds overscroll and handles invalid geometry before the page has a size', () => {
    expect(journeyFrame(-.4).index).toBe(0);
    expect(journeyFrame(1.2).index).toBe(journeyChapters.length - 1);
    expect(journeyFrame(NaN).index).toBe(0);
  });
  it('removes continuous zoom when reduced motion is requested', () => {
    for (const progress of [.04, .31, .72, .99]) {
      const frame = journeyFrame(progress, true);
      expect(frame.duration).toBe(journeyChapters[frame.index].duration);
    }
  });
  it('formats duration units consistently at their boundaries', () => {
    expect(journeyDuration(13.8e9 * JOURNEY_YEAR_SECONDS)).toEqual({ value: '13,8', unit: 'milliards d’années' });
    expect(journeyDuration(86400)).toEqual({ value: '1', unit: 'jour' });
    expect(journeyDuration(60)).toEqual({ value: '1', unit: 'minute' });
    expect(journeyDuration(1)).toEqual({ value: '1', unit: 'seconde' });
    expect(journeyDuration(1e9 * JOURNEY_YEAR_SECONDS)).toEqual({ value: '1', unit: 'milliard d’années' });
    expect(journeyTickLabel(1e9 * JOURNEY_YEAR_SECONDS, 4e9 * JOURNEY_YEAR_SECONDS)).toBe('−1 Ga');
  });
});
