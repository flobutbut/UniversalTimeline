// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { parseTemporal, yearsBeforePresent, resolveYearsBeforePresent, periodDateErrors, temporalBounds, MS_PER_YEAR, comparableYearsBeforePresent, storedYearsBeforePresent } from '../src/shared/temporal';
import { DateService } from '../../src/services/DateService';
import { aggregateStoryTemporalBounds } from '../src/domain/storyTemporalBounds';
const now = Date.parse('2026-10-29T12:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());
it.each([
  ['G4.6',4600000000],['M65',65000000],['K11.7',11700],['A230',230],['A0',0],
  ['4.5 Ga',4500000000],['65 Ma',65000000],['40 ka',40000],['40000 ans',40000],
  ['4,5 Ga',4500000000],['2 years ago',2],['m65',65000000],['G+4500000000Y2',4500000000],
] as const)('interprets geological input consistently in the UI and shared domain: %s', (raw,expected) => {
  expect(yearsBeforePresent(raw,now)).toBe(expected);
  expect(DateService.tryToYearsBP(raw)).toBe(expected);
  expect(parseTemporal(raw,now).isCurrent).toBe(false);
});
it.each(['NOW','TODAY','now','today',' NOW '])('requires an explicit present token: %s', raw => {
  expect(parseTemporal(raw,now)).toMatchObject({kind:'current',yearsBeforePresent:0,isCurrent:true});
});
it.each(['', 'unknown', 'inconnue','inconnu','Date inconnue','8. millennium BCE','du Paléolithique','nonsense'])('does not turn a missing/unrecognized date into today: %s', raw => {
  expect(yearsBeforePresent(raw,now)).toBeNull(); expect(DateService.tryToYearsBP(raw)).toBeNull();
  expect(DateService.parse(raw).isCurrent).toBe(false); expect(DateService.format(DateService.parse(raw))).not.toMatch(/aujourd|il y a 0/i);
  expect(resolveYearsBeforePresent(raw || 'unknown',0,now)).toBeNull();
});
it.each([
  ['1944-06-06','1944-06-06T00:00:00Z','day'], ['1944-06','1944-06-01T00:00:00Z','month'],
  ['1944','1944-01-01T00:00:00Z','year'], ['1944-06-06T14','1944-06-06T14:00:00Z','hour'],
  ['1944-06-06T14:32','1944-06-06T14:32:00Z','minute'], ['+1944-06-06T14:32:45Z','1944-06-06T14:32:45Z','second'],
  ['1944-06-06 14:32:45+00','1944-06-06T14:32:45Z','second'], ['1944-06-06T16:32:45+02:00','1944-06-06T14:32:45Z','second'],
  ['1944-06-06T09:02:45-0530','1944-06-06T14:32:45Z','second'], ['1944-06-06T14:32:45.125Z','1944-06-06T14:32:45.125Z','second'],
  ['2024-02-29','2024-02-29T00:00:00Z','day'], ['04/04/2025','2025-04-04T00:00:00Z','day'],
  ['18 avril 1923','1923-04-18T00:00:00Z','day'], ['15 janvier 2024','2024-01-15T00:00:00Z','day'],
  ['14 juillet 1969','1969-07-14T00:00:00Z','day'], ['April 18, 1923','1923-04-18T00:00:00Z','day'],
  ['2030-01-01','2030-01-01T00:00:00Z','day'], ['0080-01-01','0080-01-01T00:00:00Z','day'],
] as const)('uses UTC and preserves declared precision: %s', (raw,iso,precision) => {
  const parsed = parseTemporal(raw,now);
  expect(parsed.kind).toBe('calendar'); expect(parsed.precision).toBe(precision);
  expect(parsed.calendarDate?.toISOString()).toBe(new Date(iso).toISOString());
  expect(parsed.yearsBeforePresent).toBe((now - Date.parse(iso))/MS_PER_YEAR);
  expect(DateService.tryToYearsBP(raw)).toBe(parsed.yearsBeforePresent);
});
it.each(['2023-02-29','1900-02-29','2024-02-30','2024-00-01','2024-13-01','2024-01-00','1944-06-06T24:00','1944-06-06T12:60','1944-06-06T12:32:60Z','1944-06-06T12:32:00+24:00','2024-01-01trailing'])('rejects an impossible calendar value without Date rollover: %s', raw => {
  expect(parseTemporal(raw,now)).toMatchObject({kind:'unknown',reason:'invalid',yearsBeforePresent:null});
});
it.each(['-538800000','-251902000','-299800000','-419200000','-358900000','-320000000','-280000000','-250000000','-403100000','-4567300000','-160000000','-100000000','-145000000','-66000000'])('preserves ancient Wikidata years outside Date range: %s', year => {
  const raw=`${year}-01-01T00:00:00Z`; const parsed=parseTemporal(raw,now);
  expect(parsed.kind).toBe('calendar'); expect(parsed.raw).toBe(raw); expect(parsed.calendarDate).toBeUndefined();
  expect(parsed.yearsBeforePresent).toBeGreaterThan(Math.abs(Number(year))*.99);
  expect(Number.isFinite(parsed.yearsBeforePresent)).toBe(true);
});
it.each(['-800','H-800Y0','-0800-01-01T00:00:00Z'])('keeps historical calendar years distinct from elapsed ages: %s', raw => {
  expect(parseTemporal(raw,now).calendarDate?.getUTCFullYear()).toBe(-800);
  expect(yearsBeforePresent(raw,now)).toBeGreaterThan(2826);
  expect(yearsBeforePresent(raw,now)).not.toBe(800);
});
it('preserves second differences and midnight precision', () => {
  expect(parseTemporal('1944-01-01T00:00:00Z',now).precision).toBe('second');
  const a=yearsBeforePresent('1944-06-06T14:32:00Z',now)!, b=yearsBeforePresent('1944-06-06T14:32:01Z',now)!;
  expect((a-b)*MS_PER_YEAR).toBeCloseTo(1000,2);
  expect(DateService.format(DateService.parse('1944-06-06T14:32:45Z'))).toContain('14:32:45');
});
it('recognizes leap year zero without the ECMAScript 1900 offset', () => {
  expect(parseTemporal('0000-02-29',now).calendarDate?.getUTCFullYear()).toBe(0);
  expect(parseTemporal('0001-02-29',now).kind).toBe('unknown');
});
it('handles future calendar dates without collapsing both endpoints to the present', () => {
  expect(yearsBeforePresent('2030-01-01',now)).toBeLessThan(0);
  expect(periodDateErrors('2030-01-01','2031-01-01',now)).toEqual({});
});
it.each([
  ['M65','M54',true],['M54','M65',false],['G4.6','K2',true],['K2','G4.6',false],
  ['65 Ma','M65',false],['1944-06-06T14:32:00Z','1944-06-06T14:32:01Z',true],
  ['1944-06-06T14:32:01Z','1944-06-06T14:32:00Z',false],['1944-06-06T16:32+02:00','1944-06-06T14:32Z',false],
  ['-0800-01-01','0080-01-01',true],['M65','NOW',true],['NOW','M65',false],
  ['du Paléolithique','NOW',true],['M65','unknown',true],['2024-02-30','NOW',false],
] as const)('compares calendar and geological periods consistently: %s → %s', (start,end,valid) => {
  expect(Object.keys(periodDateErrors(start,end,now)).length===0).toBe(valid);
});
it('keeps imported numerical bounds and computes missing values with the supplied present', () => {
  const raw='2020-01-01';
  expect(resolveYearsBeforePresent(raw,1,now)).toBe(1);
  expect(resolveYearsBeforePresent(raw,null,now)).toBe(yearsBeforePresent(raw,now));
  expect(resolveYearsBeforePresent('M65',1,now)).toBe(1);
  expect(resolveYearsBeforePresent('M65',null,now)).toBe(65000000);
  expect(resolveYearsBeforePresent(null,'42',now)).toBe(42);
  expect(resolveYearsBeforePresent('', '',now)).toBeNull();
  expect(resolveYearsBeforePresent(null,Infinity,now)).toBeNull();
  const next=now+MS_PER_YEAR;
  expect(yearsBeforePresent(raw,next)!-yearsBeforePresent(raw,now)!).toBeCloseTo(1,12);
});
it('uses the same raw candidates and excludes unknowns in the API and shared aggregation', () => {
  const periods=[{startDate:'M65',endDate:'M54'},{startDate:'unknown',endDate:'unknown'}];
  const rows=[...periods.map(p=>({story_id:1,start_date:p.startDate,end_date:p.endDate,start_years_bp:null,end_years_bp:null})),{story_id:1,start_date:'A20',end_date:'A20'}];
  expect(aggregateStoryTemporalBounds(rows,now)).toEqual([{story_id:'1',start_date:'M65',end_date:'A20'}]);
  expect(temporalBounds(rows,now)).toEqual({start:'M65',end:'A20'});
  expect(temporalBounds([{start_date:null,end_date:'unknown',end_years_bp:0}],now)).toEqual({start:null,end:null});
});

it.each(['800 BCE','800 BC','800 avant J.-C.'])('maps explicit historical BCE years to ISO astronomical numbering: %s', raw => {
  expect(parseTemporal(raw,now).calendarDate?.getUTCFullYear()).toBe(-799);
  expect(yearsBeforePresent(raw,now)).toBe(yearsBeforePresent('-0799-01-01',now));
});
it.each(['+2001-00-00T00:00:00Z','+2001-12-00T00:00:00Z'])('preserves Wikibase unspecified fields without inventing precision: %s', raw => {
  expect(parseTemporal(raw,now)).toMatchObject({kind:'unknown',reason:'unrecognized',raw});
  expect(periodDateErrors(raw,'NOW',now)).toEqual({});
});
it('compares calendar dates at one instant, whatever the stale stored coordinates', () => {
  const now = Date.UTC(2026, 10, 1);
  const periodStart = comparableYearsBeforePresent('1957-10-04T00:00:00Z', 69.07, now); // stored a day earlier
  const sameDayEvent = comparableYearsBeforePresent('1957-10-04T00:00:00Z', null, now);
  expect(sameDayEvent).toBe(periodStart);
  expect(comparableYearsBeforePresent('G10', '10000000000', now)).toBe(1e10);
  expect(comparableYearsBeforePresent('', '42', now)).toBe(42);
  expect(comparableYearsBeforePresent('vers la fin du règne', '42', now)).toBeNull();
  expect(comparableYearsBeforePresent('TODAY', null, now)).toBe(0);
});

it('stores coordinates computed at write time, rounded to 3 decimals, never inventing the present', () => {
  const now = Date.UTC(2026, 10, 3);
  expect(storedYearsBeforePresent('M66.4', now)).toBe(66400000);
  expect(storedYearsBeforePresent('1789-07-14', now)).toBe(Math.round(yearsBeforePresent('1789-07-14', now)! * 1000) / 1000);
  expect(String(storedYearsBeforePresent('1789-07-14', now)).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
  expect(Object.is(storedYearsBeforePresent('TODAY', now), 0)).toBe(true);
  expect(Object.is(storedYearsBeforePresent('2026-11-03T00:00:10Z', now), 0)).toBe(true);
  expect(storedYearsBeforePresent('vers la fin du règne', now)).toBeNull();
  expect(storedYearsBeforePresent('', now)).toBeNull();
});
