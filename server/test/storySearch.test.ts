// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { query } from '../src/api/database';
import router from '../src/api/routes';
vi.mock('../src/api/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
const db = vi.mocked(query);
beforeEach(() => vi.clearAllMocks());
async function search(q: unknown) {
  const route = router.stack.find((layer: any) => layer.route?.path === '/search/stories').route;
  const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
  await route.stack[0].handle({ query: { q } }, res);
  return { status: res.status.mock.calls[0]?.[0] ?? 200, body: res.json.mock.calls[0]?.[0] };
}
it('returns only story presentation data and binds a literal search term once', async () => {
  db.mockResolvedValueOnce({ rows: [{ id: 7, title_fr: 'Guerre froide', title_en: null, description_fr: 'Résumé', description_en: null, matched_on: 'content', matched_type: 'event', matched_label_fr: 'plan Marshall', matched_label_en: null }] } as never);
  expect(await search(' Marshall ')).toEqual({ status: 200, body: [{ id: '7', label: { fr: 'Guerre froide', en: '' }, description: { fr: 'Résumé', en: '' }, matchedOn: 'content', match: { type: 'event', label: { fr: 'plan Marshall', en: '' } } }] });
  expect(db).toHaveBeenCalledOnce(); expect(db.mock.calls[0][1]?.[0]).toBe('Marshall');
});
it('keeps user text in a bound parameter', async () => {
  db.mockResolvedValueOnce({ rows: [] } as never);
  await search("50%_\\'OR 1=1");
  expect(db.mock.calls[0][1]?.[0]).toBe("50%_\\'OR 1=1");
  expect(db.mock.calls[0][0]).not.toContain('OR 1=1');
});
it.each([undefined, '', ' ', 'a'])('does not query for an empty or short search: %s', async q => {
  expect(await search(q)).toEqual({ status: 200, body: [] }); expect(db).not.toHaveBeenCalled();
});
it.each([['a', 'b'], {}, 'x'.repeat(501)])('rejects malformed search input before SQL: %j', async q => {
  expect((await search(q)).status).toBe(400); expect(db).not.toHaveBeenCalled();
});
it('returns a retryable safe error without leaking SQL details', async () => {
  db.mockRejectedValueOnce(new Error('private SQL text'));
  const result = await search('Terre');
  expect(result.status).toBe(500); expect(JSON.stringify(result.body)).not.toContain('private SQL');
});
