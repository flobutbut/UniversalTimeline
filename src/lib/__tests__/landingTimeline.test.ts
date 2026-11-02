import { describe, expect, it } from 'vitest';
import { createIntroScales, EARTH_AGE, UNIVERSE_AGE, HUMAN_AGE, introBandLayout } from '@/lib/landingTimeline';

describe('introductory timeline proportions', () => {
  it('starts at the full age of the Universe, with Earth inside that window', () => {
    const first = createIntroScales(2026)[0];
    expect(first.id).toBe('universe');
    expect(first.span).toBe(UNIVERSE_AGE);
    expect(introBandLayout(first.bands.find(band => band.id === 'universe')!, first.span)).toEqual({left:0,width:100});
    const earth = introBandLayout(first.bands.find(band => band.id === 'earth')!, first.span);
    expect(earth.width).toBeCloseTo(EARTH_AGE / UNIVERSE_AGE * 100);
    expect(earth.left + earth.width).toBeCloseTo(100);
  });
  it('keeps the human duration genuinely below one pixel on an ordinary screen', () => {
    const earth = createIntroScales(2026).find(scale => scale.id === 'earth')!;
    const humans = earth.bands.find(band => band.id === 'humans')!;
    const position = introBandLayout(humans, earth.span);
    expect(position.width).toBeCloseTo(0.006607929515, 10);
    expect(position.left + position.width).toBeCloseTo(100);
    expect(1200 * position.width / 100).toBeLessThan(0.1);
    expect(earth.span).toBe(EARTH_AGE);
  });
  it('places the life evidence after formation and ends the non-avian dinosaur band before the present', () => {
    const earth = createIntroScales(2026).find(scale => scale.id === 'earth')!;
    const life = introBandLayout(earth.bands.find(band => band.id === 'life')!, earth.span);
    const dinosaurs = introBandLayout(earth.bands.find(band => band.id === 'dinosaurs')!, earth.span);
    expect(life.left).toBeCloseTo((1 - 3.5 / 4.54) * 100);
    expect(life.left + life.width).toBeCloseTo(100);
    expect(dinosaurs.width).toBeCloseTo(164e6 / EARTH_AGE * 100);
    expect(dinosaurs.left + dinosaurs.width).toBeCloseTo((1 - 66e6 / EARTH_AGE) * 100);
  });
  it('changes the window without changing landmark durations', () => {
    const scales = createIntroScales(2026);
    const widths = scales.filter(scale => scale.id !== 'inventions').map(scale => {
      const band = scale.bands.find(item => item.id === 'humans')!;
      expect(band.from).toBe(HUMAN_AGE);
      return introBandLayout(band, scale.span).width;
    });
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);
    expect(widths[2]).toBeLessThan(widths[3]);
    expect(widths[3]).toBe(100);
  });
  it('updates the modern scale from the supplied current year', () => {
    for (const year of [2026, 2027]) {
      const scale = createIntroScales(year).find(scale => scale.id === 'inventions')!;
      const internet = scale.bands.find(band => band.id === 'internet')!;
      expect(scale.span).toBe(year - 1450);
      expect(internet.from).toBe(year - 1983);
      expect(scale.ticks.at(-1)?.label).toBe(String(year));
    }
  });
});
