// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateStoryTemporalBounds } from '../src/domain/storyTemporalBounds';
import { loadStoryTemporalBounds } from '../src/services/storyTemporalBounds';
import { temporalBounds } from '../src/shared/temporal';
import { query } from '../src/api/database';
import router from '../src/api/routes';
vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

const candidate = (start: string | null, end: string | null, story = '1') => ({
  story_id: story, start_date: start, end_date: end, start_years_bp: null, end_years_bp: null,
});
const cases = [
  { name: 'SQL timestamp spacing and time-of-day ordering', periods: [{ startDate: '1944-06-06 14:32:00', endDate: '2025-01-01' }, { startDate: '1944-06-06T10:00:00', endDate: 'NOW' }], expected: { start: '1944-06-06T10:00:00', end: 'NOW' } },
  { name: 'geological ages with reversed lexical order', periods: [{ startDate: 'M54', endDate: 'M10' }, { startDate: 'M65', endDate: 'M8' }], expected: { start: 'M65', end: 'M8' } },
  { name: 'mixed geological units', periods: [{ startDate: 'M65', endDate: 'K30' }, { startDate: 'G4.6', endDate: 'A20' }], expected: { start: 'G4.6', end: 'A20' } },
  { name: 'BCE and calendar dates', periods: [{ startDate: '-8000-01-01T00:00:00Z', endDate: '1944-06-06' }, { startDate: '-9000-01-01T00:00:00Z', endDate: '2025-04-04' }], expected: { start: '-9000-01-01T00:00:00Z', end: '2025-04-04' } },
  { name: 'explicit present', periods: [{ startDate: 'M65', endDate: 'NOW' }, { startDate: 'M54', endDate: 'M8' }], expected: { start: 'M65', end: 'NOW' } },
  { name: 'unknown bounds excluded', periods: [{ startDate: 'unknown', endDate: 'inconnue' }, { startDate: 'M65', endDate: 'nonsense' }], expected: { start: 'M65', end: undefined } },
];

describe('story bounds use chronological years, not string ordering', () => {
  it.each(cases)('$name in the API and shared domain', ({ periods, expected }) => {
    const rows = periods.map(period => candidate(period.startDate, period.endDate));
    const [actual] = aggregateStoryTemporalBounds(rows);
    expect(actual).toMatchObject({ start_date: expected.start ?? null, end_date: expected.end ?? null });
    expect(temporalBounds(rows)).toEqual({ start: expected.start ?? null, end: expected.end ?? null });
  });
  it('includes dated events at either end of the interval', () => {
    const rows = [candidate('M54', 'M10'), candidate('M65', 'M65'), candidate('A20', 'A20')];
    expect(aggregateStoryTemporalBounds(rows)[0]).toMatchObject({ start_date: 'M65', end_date: 'A20' });
    expect(temporalBounds(rows)).toEqual({ start: 'M65', end: 'A20' });
  });
  it('does not mix stories and preserves nulls for a story with only unknown dates', () => {
    expect(aggregateStoryTemporalBounds([candidate('M65', 'M54'), candidate(null, 'unknown', '2')])).toEqual([
      { story_id: '1', start_date: 'M65', end_date: 'M54' }, { story_id: '2', start_date: null, end_date: null },
    ]);
  });
  it('uses stored numeric columns when available and falls back for missing columns', () => {
    const row = { ...candidate('M65', 'M54'), start_years_bp: '65000000', end_years_bp: '54000000' };
    expect(aggregateStoryTemporalBounds([row])).toEqual(aggregateStoryTemporalBounds([candidate('M65', 'M54')]));
  });
  it('loads every candidate in one query without lexical MIN/MAX', async () => {
    const read = vi.fn().mockResolvedValue({ rows: [candidate('M54', 'M8'), candidate('M65', 'M10')] });
    vi.mocked(query).mockImplementation(read);
    expect(await loadStoryTemporalBounds()).toEqual([{ story_id: '1', start_date: 'M65', end_date: 'M8' }]);
    expect(read).toHaveBeenCalledOnce();
    expect(read.mock.calls[0][0]).not.toMatch(/\b(MIN|MAX)\s*\(/);
  });
});

beforeEach(() => vi.clearAllMocks());
it('returns the same bounds on the list and the dedicated API endpoint', async () => {
  vi.mocked(query).mockImplementation(async sql => ({ rows: sql.includes('UNION ALL')
    ? [candidate('M54', 'M8'), candidate('M65', 'M10')]
    : [{ id: 1, title_fr: 'Frise', title_en: 'Frise', preview_periods: [candidate('M54', 'M8'), candidate('M65', 'M10')] }], rowCount: 1 } as any));
  async function get(path: string) {
    const handler = router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods.get).route.stack[0].handle;
    const res = { json: vi.fn(), status: vi.fn() }; res.status.mockReturnValue(res);
    await handler({}, res); return res.json.mock.calls[0][0];
  }
  const list = await get('/stories'); const bounds = await get('/stories/temporal-bounds');
  expect(list[0]).toMatchObject({ start_date: 'M65', end_date: 'M8' });
  expect(bounds[0]).toMatchObject({ start_date: list[0].start_date, end_date: list[0].end_date });
});
