// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import router from '../src/api/routes';
import { withTransaction, query } from '../src/api/database';
import { runInTransaction } from '../src/api/transaction';

vi.mock('../src/api/database', () => ({ withTransaction: vi.fn(), query: vi.fn() }));
const client = { query: vi.fn(), release: vi.fn() };
const provider = { connect: vi.fn() };
const event = { qid: 'Q2', type: 'event', title: 'Événement', description: 'Description', startDate: '1789-07-14', endDate: '' };
const period = { qid: 'Q3', type: 'period', title: 'Période', description: '', startDate: '1789', endDate: '1799' };
const payload = () => ({ qid: 'Q1', title: 'Frise', items: [{ ...event }, { ...period }] });
async function call(body: unknown) {
  const layer = router.stack.find((entry: any) => entry.route?.path === '/stories/from-wikidata' && entry.route.methods.post);
  const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
  await layer.route.stack[0].handle({ body }, res); return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  provider.connect.mockResolvedValue(client);
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => ({ rows: /INSERT INTO public.stories/.test(sql) ? [{ id: 42 }] : /RETURNING id/.test(sql) ? [{ id: params?.[0] }] : [] }));
  vi.mocked(withTransaction).mockImplementation(operation => runInTransaction(provider, operation));
  vi.mocked(query).mockRejectedValue(new Error('No queries outside the transaction'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it('creates a private frise, UUID catalogue records and associations in one transaction', async () => {
  const res = await call(payload()); const sql = client.query.mock.calls.map(([statement]) => statement);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ id: '42', periodCount: 1, eventCount: 1 });
  expect(sql[0]).toBe('BEGIN'); expect(sql.at(-1)).toBe('COMMIT');
  const story = client.query.mock.calls.find(([statement]) => /INSERT INTO public.stories/.test(statement));
  expect(story?.[1][5]).toBe(false); expect(story?.[1][2]).toBe('Source : https://www.wikidata.org/wiki/Q1');
  const imports = client.query.mock.calls.filter(([statement]) => /INSERT INTO public.(events|periods) /.test(statement));
  expect(imports).toHaveLength(2);
  for (const [statement, params] of imports) { expect(params[0]).toMatch(/^[0-9a-f-]{36}$/); expect(statement).toContain('ON CONFLICT (wikidata_id) DO NOTHING'); }
  expect(sql.some(statement => /INSERT INTO public.story_events/.test(statement))).toBe(true);
  expect(sql.some(statement => /INSERT INTO public.story_periods/.test(statement))).toBe(true);
  expect(query).not.toHaveBeenCalled(); expect(withTransaction).toHaveBeenCalledOnce();
});

it('reuses existing catalogue rows by their actual Wikidata link, without overwriting them', async () => {
  client.query.mockImplementation(async (sql: string) => ({ rows: /INSERT INTO public.stories/.test(sql) ? [{ id: 42 }] : /SELECT id FROM public.events/.test(sql) ? [{ id: 'existing-event' }] : [] }));
  await call({ ...payload(), items: [event] });
  const sql = client.query.mock.calls.map(([statement]) => statement);
  expect(sql.some(statement => /UPDATE public.events/.test(statement))).toBe(false);
  expect(client.query.mock.calls.find(([statement]) => /SELECT id FROM public.events/.test(statement))?.[1]).toEqual(['Q2']);
  expect(client.query.mock.calls.find(([statement]) => /INSERT INTO public.story_events/.test(statement))?.[1]).toEqual(['42', 'existing-event']);
});

it('rejects an unacknowledged existing frise before importing anything', async () => {
  const implementation = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => /WITH candidates AS/.test(sql)
    ? { rows: [{ id: 30, title_fr: 'Révolution française', reason: 'subject' }] } : implementation(sql, params));
  const res = await call(payload());
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ existingStories: [{ id: '30', title: 'Révolution française', reason: 'subject' }] }));
  expect(client.query.mock.calls.some(([sql]) => /INSERT INTO/.test(sql))).toBe(false);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
});

it('rechecks all matching frises rather than accepting a stale acknowledgement', async () => {
  const implementation = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => /WITH candidates AS/.test(sql)
    ? { rows: [{ id: 30, title_fr: 'Révolution', reason: 'subject' }, { id: 31, title_fr: 'Autre frise', reason: 'title' }] } : implementation(sql, params));
  expect((await call({ ...payload(), acknowledgedStoryIds: ['30'] })).status).toHaveBeenCalledWith(409);
  expect((await call({ ...payload(), acknowledgedStoryIds: ['30', '31'] })).status).toHaveBeenCalledWith(201);
});

it('looks up accessible existing frises with bound Q-id and title parameters', async () => {
  const layer = router.stack.find((entry: any) => entry.route?.path === '/stories/wikidata-matches' && entry.route.methods.get);
  const res = { status: vi.fn(), json: vi.fn(), set: vi.fn() }; res.status.mockReturnValue(res);
  await layer.route.stack[0].handle({ query: { qid: 'Q1', title: 'Révolution' } }, res);
  expect(res.json).toHaveBeenCalledWith([]);
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(client.query.mock.calls.find(([sql]) => /WITH candidates AS/.test(sql))?.[1]).toEqual(['Q1', 'Révolution']);
});

it('refuses a public generated frise: without a parent it stays a private draft', async () => {
  const res = await call({ ...payload(), isPublic: true });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(client.query.mock.calls.some(([sql]) => /INSERT INTO public.stories/.test(sql))).toBe(false);
});

it.each(['Description modifiée\nDeuxième ligne.', '', '  Texte conservé  '])('saves the edited description exactly (%j)', async description => {
  const res = await call({ ...payload(), description });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(client.query.mock.calls.find(([sql]) => /INSERT INTO public.stories/.test(sql))?.[1][2]).toBe(description || null);
});

it('maps parent Q-ids to the actual reused catalogue IDs, allowing historical date overflows', async () => {
  const implementation = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (/INSERT INTO public.periods/.test(sql)) return { rows: [] };
    if (/SELECT id FROM public.periods/.test(sql)) return { rows: [{ id: params?.[0] === 'Q3' ? 'existing-parent' : 'existing-child' }] };
    return implementation(sql, params);
  });
  const res = await call({ ...payload(), items: [{ ...period, qid: 'Q4', parentQid: 'Q3', endDate: '1802' }, period] });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(client.query.mock.calls.find(([sql]) => /INSERT INTO public.story_periods/.test(sql))?.[1]).toEqual([42, 'existing-child', 'existing-parent', 'existing-parent', null]);
});

it('rolls back the frise and imports if association fails', async () => {
  const implementation = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => { if (/INSERT INTO public.story_events/.test(sql)) throw new Error('Association failed'); return implementation(sql, params); });
  const res = await call(payload()); const sql = client.query.mock.calls.map(([statement]) => statement);
  expect(res.status).toHaveBeenCalledWith(500); expect(sql.at(-1)).toBe('ROLLBACK'); expect(sql).not.toContain('COMMIT');
  expect(client.release).toHaveBeenCalledOnce();
});

it.each([
  { ...payload(), qid: 'invalid' }, { ...payload(), title: '' }, { ...payload(), items: [] },
  { ...payload(), isPublic: 'true' }, { ...payload(), isPublic: null },
  { ...payload(), description: 'x'.repeat(1001) }, { ...payload(), description: { text: 'Invalide' } },
  { ...payload(), acknowledgedStoryIds: true }, { ...payload(), acknowledgedStoryIds: ['invalid'] },
  { ...payload(), acknowledgedStoryIds: Array(21).fill('30') },
  { ...payload(), items: Array(82).fill(event) }, { ...payload(), items: [event, event] },
  { ...payload(), items: [event, { ...event, id: 'entity:Q2', origin: 'entity' }] },
  { ...payload(), items: [{ ...event, type: 'person' }] }, { ...payload(), items: [{ ...event, startDate: 'unknown' }] },
  { ...payload(), items: [{ ...period, endDate: '' }] }, { ...payload(), items: [{ ...period, endDate: '1780' }] },
  { ...payload(), items: [{ ...period, parentQid: 'Q999' }] },
  { ...payload(), items: [event, { ...period, parentQid: 'Q2' }] },
  { ...payload(), items: [{ ...event, parentQid: 'Q3' }, period] },
  { ...payload(), items: [{ ...period, parentQid: 'Q3' }] },
  { ...payload(), items: [{ ...period, parentQid: 'not-a-qid' }] },
  { ...payload(), items: [{ ...period, parentQid: 'Q4' }, { ...period, qid: 'Q4', parentQid: 'Q5' }, { ...period, qid: 'Q5', parentQid: 'Q3' }] },
])('rejects invalid or incomplete drafts before opening a transaction (%j)', async body => {
  const res = await call(body); expect(res.status).toHaveBeenCalledWith(400); expect(withTransaction).not.toHaveBeenCalled();
});
