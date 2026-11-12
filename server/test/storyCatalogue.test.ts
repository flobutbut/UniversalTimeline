// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { parseStoryCatalogueInput } from '../src/api/storyCatalogueInput';
import { query } from '../src/api/database';
import { listPublicStoryCatalogue } from '../src/services/storyCatalogueService';
import router from '../src/api/routes';

vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: (operation: (db: { query: typeof query }) => unknown) => operation({ query }) }));
const db = vi.mocked(query);
beforeEach(() => vi.resetAllMocks());
const input = (value = {}) => parseStoryCatalogueInput(value);
const candidate = (id: number, date = '1900') => ({ id, title_fr: `Frise ${id}`, title_en: '', author: 'Auteur', is_public: true, temporal_candidates: [{ start_date: date, end_date: date }], tags: [] });
const facets = { public_total: 1000, matching_total: 1000, tags: [] };
const rows = (value: unknown[]) => db.mockResolvedValueOnce({ rows: value } as never);

it('bounds page sizes, cursors and all filters before SQL is called', () => {
  expect(input()).toMatchObject({ cursor: null, limit: 24, search: '', tagIds: [] });
  expect(input({ q: ' Curie ', tags: 'sciences,terre,sciences', cursor: '123', limit: '48', timeOld: '5000', timeRecent: '2000' })).toMatchObject({ search: 'Curie', tagIds: ['sciences', 'terre'], cursor: '123', limit: 48, timeRange: { oldBP: 5000, recentBP: 2000 } });
  for (const value of [{ limit: '0' }, { limit: '49' }, { limit: ['24'] }, { cursor: '1 OR 1=1' }, { cursor: '2147483648' }, { cursor: '0' }, { q: ['x'] }, { tags: 'x,,y' }, { timeOld: '2' }, { periodOld: '2', periodRecent: '4' }, { timeOld: 'Infinity', timeRecent: '0' }]) {
    expect(() => input(value)).toThrow();
  }
});

it('returns a bounded public page with a stable cursor, global facets and no private metadata', async () => {
  rows([candidate(30), candidate(29), candidate(28)]); rows([]); rows([facets]);
  const result = await listPublicStoryCatalogue(input({ limit: '2', q: 'frise', tags: 'terre' }));
  expect(result.items.map(item => item.id)).toEqual([30, 29]);
  expect(result).toMatchObject({ nextCursor: '29', total: 1000, publicTotal: 1000 });
  expect(result.items[0]).not.toHaveProperty('temporal_candidates');
  expect(result.items[0]).not.toHaveProperty('owner_user_id');
  expect(db).toHaveBeenCalledTimes(3);
  expect(db.mock.calls[0][1]).toEqual(['frise', ['terre'], null, 3]);
  expect(db.mock.calls[0][0]).toContain('s.is_public = true');
  expect(db.mock.calls[0][0]).toContain('s.id < $3');
  expect(db.mock.calls[0][0]).not.toContain('OFFSET');
  expect(db.mock.calls[1][1]).toEqual([[30, 29]]);
  expect(db.mock.calls[1][0]).toContain('p.rank <= 12');
  expect(db.mock.calls[1][0]).toContain('e.rank <= 12');
});

it('scans date-filtered candidates in bounded batches and keeps the shared temporal rules', async () => {
  const first = Array.from({ length: 64 }, (_, index) => candidate(100 - index, 'G4.5'));
  rows(first); rows([candidate(36, '1900'), candidate(35, 'inconnue'), candidate(34, '2000')]); rows([]); rows([facets]);
  const result = await listPublicStoryCatalogue(input({ limit: '2', timeOld: '200', timeRecent: '0' }));
  expect(result.items.map(item => item.id)).toEqual([36, 34]);
  expect(result).toMatchObject({ nextCursor: null, total: null });
  expect(db.mock.calls[0][1]).toEqual(['', [], null, 64]);
  expect(db.mock.calls[1][1]).toEqual(['', [], '37', 64]);
});

it('does not lose matches when a date-filtered batch contains more than one page', async () => {
  rows([candidate(20), candidate(19), candidate(18)]); rows([]); rows([facets]);
  const result = await listPublicStoryCatalogue(input({ limit: '2', timeOld: '200', timeRecent: '0' }));
  expect(result.nextCursor).toBe('19');
  rows([candidate(18)]); rows([]); rows([facets]);
  const next = await listPublicStoryCatalogue(input({ limit: '2', cursor: result.nextCursor!, timeOld: '200', timeRecent: '0' }));
  expect(next.items.map(item => item.id)).toEqual([18]);
  expect(next.nextCursor).toBeNull();
});

it('handles an empty result without fetching previews and propagates a database failure', async () => {
  rows([]); rows([{ ...facets, matching_total: 0 }]);
  expect(await listPublicStoryCatalogue(input())).toMatchObject({ items: [], nextCursor: null, total: 0, publicTotal: 1000 });
  expect(db).toHaveBeenCalledTimes(2);
  db.mockRejectedValueOnce(new Error('DB unavailable'));
  await expect(listPublicStoryCatalogue(input())).rejects.toThrow('DB unavailable');
});

it('registers the public catalogue before the story detail route and rejects invalid requests', async () => {
  const paths = router.stack.filter((layer: any) => layer.route?.methods.get).map((layer: any) => layer.route.path);
  expect(paths.indexOf('/stories/catalogue')).toBeLessThan(paths.indexOf('/stories/:id'));
  const route = router.stack.find((layer: any) => layer.route?.path === '/stories/catalogue').route;
  const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
  await route.stack[0].handle({ query: { limit: '100000' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db).not.toHaveBeenCalled();
});
