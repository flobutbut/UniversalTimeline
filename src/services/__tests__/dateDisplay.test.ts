import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { DateService } from '@/services/DateService';
import { formatPeriodDateRange, formatStoryEventDateLabel, formatStoryListDateRangeSublabel } from '@/lib/formatTemporalBoundLabel';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';

it.each(['1945-01-01', '1945-01-01T00:00', '1945-01-01T00:00:00Z', '+1945-01-01T00:00:00Z', '1945-01-01T00:00:00.000Z'])(
  'displays a midnight timestamp as a calendar date without an artificial time: %s', raw => {
    const parsed = DateService.parse(raw);
    expect(DateService.format(parsed)).toBe('1 janvier 1945');
    expect(DateService.formatBound(parsed)).toBe('1 janvier 1945');
    expect(parsed.raw).toBe(raw);
  },
);
it.each([
  ['1945-01-01T13:30:00Z', '1 janvier 1945 à 13:30'],
  ['1945-01-01T13:30:15Z', '1 janvier 1945 à 13:30:15'],
  ['1945-01-01T00:00:30Z', '1 janvier 1945 à 00:00:30'],
  ['1945-01-01T13:30:00+02:00', '1 janvier 1945 à 11:30'],
])('preserves a meaningful time and only displays useful seconds: %s', (raw, expected) => {
  const parsed = DateService.parse(raw);
  expect(DateService.format(parsed)).toBe(expected);
  expect(DateService.formatBound(parsed)).toBe(expected);
  expect(parsed.precision).toBe('second');
});
it('preserves year/month precision, geological labels and unknown values', () => {
  for (const [raw, expected] of [['1945', '1945'], ['1945-01', 'janvier 1945'], ['M65', '65.0 Ma'], ['unknown', 'unknown']]) {
    expect(DateService.formatBound(DateService.parse(raw))).toBe(expected);
  }
});
it('uses the selected locale without reintroducing midnight', () => {
  expect(DateService.formatBound(DateService.parse('1945-01-01T00:00:00Z'), 'en-US')).toBe('January 1, 1945');
});
it('removes midnight consistently from period cards, frise summaries and event labels', () => {
  const dates = { startDate: '1945-01-01T00:00:00Z', endDate: '1991-12-25T00:00:00Z' };
  const label = 'de 1 janvier 1945 à 25 décembre 1991';
  expect(formatPeriodDateRange(dates)).toBe(label);
  expect(formatStoryListDateRangeSublabel(dates)).toBe(label);
  expect(formatStoryEventDateLabel({ date: dates.startDate })).toBe('1 janvier 1945');
  const view = mount(PeriodCard, { props: { period: { ...dates, id: 'cold-war', label: { fr: 'Guerre froide', en: '' }, categories: [] }, isSelected: false } });
  try {
    expect(view.get('.period-info').text()).toBe(label);
    expect(view.text()).not.toContain('00:00');
  } finally { view.unmount(); }
});
