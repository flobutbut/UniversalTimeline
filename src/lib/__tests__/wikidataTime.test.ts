import { describe, expect, it } from 'vitest';
import { parseTemporal } from '@temporal';
import { wikibaseTimeToTemporal } from '../wikidataTime';

const JULIAN = 'http://www.wikidata.org/entity/Q1985786';
const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727';
const json = (time: string, precision?: number, calendarmodel = GREGORIAN) => wikibaseTimeToTemporal({ time, precision, calendarmodel }, 'historical');
const rdf = (time: string, precision: number, calendarmodel = GREGORIAN) => wikibaseTimeToTemporal({ time, precision, calendarmodel }, 'astronomical');
const bcYear = (date: string) => 1 - (parseTemporal(date) as { calendarDate: Date }).calendarDate.getUTCFullYear();

describe('Wikibase times', () => {
  it('reads JSON years without a year 0', () => {
    expect(json('-0001-00-00T00:00:00Z', 9)).toBe('1 BCE');
    expect(json('-0490-00-00T00:00:00Z', 9, JULIAN)).toBe('490 BCE');
    expect(json('+0001-00-00T00:00:00Z', 9)).toBe('0001');
    expect(json('+1789-00-00T00:00:00Z', 9)).toBe('1789');
    expect(json('+0000-00-00T00:00:00Z', 9)).toBe('');
  });

  it('reads SPARQL astronomical years', () => {
    expect(rdf('0000-01-01T00:00:00Z', 9)).toBe('1 BCE');
    expect(rdf('-0489-01-01T00:00:00Z', 9, JULIAN)).toBe('490 BCE');
    expect(rdf('1789-01-01T00:00:00Z', 9)).toBe('1789');
  });

  it('keeps month and day precision without a time of day', () => {
    expect(json('+1790-05-00T00:00:00Z', 10)).toBe('1790-05');
    expect(json('+1789-07-14T00:00:00Z', 11)).toBe('1789-07-14');
    expect(rdf('1789-07-14T00:00:00Z', 11)).toBe('1789-07-14');
    expect(json('+1999-01-01T00:00:00Z', 11)).toBe('1999-01-01');
  });

  it('writes days before Christ in astronomical ISO, read back as the same year', () => {
    const marathon = json('-0490-08-12T00:00:00Z', 11, JULIAN);
    expect(marathon).toBe('-0489-08-12');
    expect(bcYear(marathon)).toBe(490);
    expect(json('-0001-03-15T00:00:00Z', 11)).toBe('0000-03-15');
    expect(json('-0044-03-00T00:00:00Z', 10, JULIAN)).toBe('-0043-03');
  });

  it('restores the Julian day that SPARQL converted to Gregorian', () => {
    expect(rdf('1066-10-20T00:00:00Z', 11, JULIAN)).toBe('1066-10-14');
    expect(rdf('-0489-08-07T00:00:00Z', 11, JULIAN)).toBe('-0489-08-12');
    expect(rdf('-0043-03-13T00:00:00Z', 11, JULIAN)).toBe('-0043-03-15');
    expect(json('+1066-10-14T00:00:00Z', 11, JULIAN)).toBe('1066-10-14');
  });

  it('writes deep time as an age', () => {
    expect(json('-4540000000-00-00T00:00:00Z', 3)).toBe('G4.54');
    expect(rdf('-541000000-01-01T00:00:00Z', 11)).toBe('M541');
    expect(json('-300000-00-00T00:00:00Z', 9)).toBe('K300');
    expect(json('-50000-00-00T00:00:00Z', 5)).toBe('K50');
  });

  it('leaves coarse, uncertain or foreign-calendar dates for review', () => {
    expect(json('+1700-00-00T00:00:00Z', 7)).toBe('');
    expect(json('-3000-00-00T00:00:00Z', 6, JULIAN)).toBe('');
    expect(json('+1950-00-00T00:00:00Z', 8)).toBe('');
    expect(json('+1789-07-14T00:00:00Z', 11, 'http://www.wikidata.org/entity/Q12138')).toBe('');
    expect(wikibaseTimeToTemporal({ time: '+1789-07-14T00:00:00Z', precision: 11, before: 1, after: 0 }, 'historical')).toBe('');
    expect(json('+2020-00-00T00:00:00Z', 3)).toBe('');
    expect(json('vers 1789')).toBe('');
  });

  it('infers the precision from zeroed fields when it is absent', () => {
    expect(json('-3000-00-00T00:00:00Z')).toBe('3000 BCE');
    expect(json('+1944-06-00T00:00:00Z')).toBe('1944-06');
    expect(json('+1944-06-06T00:00:00Z')).toBe('1944-06-06');
  });
});
