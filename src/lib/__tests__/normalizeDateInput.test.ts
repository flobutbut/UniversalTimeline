import { expect, it } from 'vitest';
import { normalizeDateInput } from '../normalizeDateInput';
import { parseTemporal } from '@temporal';

it.each([
  ['14/07/1789', '1789-07-14'], ['12 juillet 1790', '1790-07-12'], ['April 18, 1923', '1923-04-18'],
  ['1789', '1789'], ['1789-07', '1789-07'], ['0080-01-01', '0080-01-01'], ['0000-02-29', '0000-02-29'],
  ['800 BCE', '-0799'], ['-800', '-0800'], ['H-800Y0', '-0800'],
  ['65 Ma', 'M65'], ['4,5 Ga', 'G4.5'], ['40 ka BP', 'K40'], ['40000 ans', 'A40000'],
  ['2 years ago', 'A2'], [' m065.000 ', 'M65'], ['G+4500000000Y2', 'G+4500000000Y2'],
  [' today ', 'NOW'], ['now', 'NOW'], [' 1789-07-14 ', '1789-07-14'],
  ['1944-06-06 14:32:45+00', '1944-06-06T14:32:45+00:00'],
  ['+1944-06-06T14:32:45z', '1944-06-06T14:32:45Z'],
  ['1944-06-06T14', '1944-06-06T14Z'],
  ['1944-06-06T14+0530', '1944-06-06T14+05:30'],
  ['1944-06-06T14:32', '1944-06-06T14:32Z'],
  ['1944-06-06T14:32:45.123456789-0530', '1944-06-06T14:32:45.123456789-05:30'],
  ['-538800000-01-01T00:00:00Z', '-538800000-01-01T00:00:00Z'],
  ['-538800000', '-538800000'],
] as const)('normalizes %s as %s without changing the time or precision', (raw, expected) => {
  const result = normalizeDateInput(raw);
  expect(result).toBe(expected);
  const now = Date.UTC(2026, 10, 3);
  const before = parseTemporal(raw, now); const after = parseTemporal(result, now);
  expect(after.kind).toBe(before.kind); expect(after.precision).toBe(before.precision);
  expect(after.yearsBeforePresent).toBe(before.yearsBeforePresent);
  expect(normalizeDateInput(result)).toBe(result);
});

it.each(['', ' ', '14/07/17', '2023-02-29', '31/02/2024', 'vers 1789', '8. millennium BCE', '+2001-00-00T00:00:00Z'])('keeps incomplete, invalid or unknown input intact: %s', raw => {
  expect(normalizeDateInput(raw)).toBe(raw);
});
