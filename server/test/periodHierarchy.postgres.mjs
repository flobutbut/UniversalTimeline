// Run after the backend build, against a disposable local PostgreSQL database only.
// TIMELINE_TEST_SOCKET=/path/to/socket TIMELINE_TEST_DATABASE=universaltimeline_test_x
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { changePeriodParent } from '../dist/services/periodHierarchy.js';
import { runInTransaction } from '../dist/api/transaction.js';

const socket = process.env.TIMELINE_TEST_SOCKET;
const database = process.env.TIMELINE_TEST_DATABASE;
assert.ok(socket?.startsWith('/'), 'A local Unix socket directory is required; TCP and Supabase are not accepted.');
assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Use a disposable test database.');
const pool = new pg.Pool({ host: socket, port: 55439, database, max: 4, connectionTimeoutMillis: 3000, statement_timeout: 10000 });
const move = (id, parentId) => runInTransaction(pool, client => changePeriodParent(client, id, parentId));

before(async () => {
  await pool.query(`
    CREATE TABLE public.periods (id text PRIMARY KEY, parent_id text REFERENCES public.periods(id), updated_at timestamptz);
    CREATE TABLE public.categories (id text PRIMARY KEY, label_fr text, label_en text);
    CREATE TABLE public.period_categories (period_id text REFERENCES public.periods(id), category_id text REFERENCES public.categories(id));
  `);
});
beforeEach(async () => {
  await pool.query('TRUNCATE public.period_categories, public.categories, public.periods');
  await pool.query("INSERT INTO public.periods (id, parent_id) VALUES ('root', null), ('child', 'root'), ('grandchild', 'child'), ('other', null)");
});
after(() => pool.end());

test('moves a period and returns persisted hierarchy and category data', async () => {
  await pool.query("INSERT INTO public.categories VALUES ('cat', 'Catégorie', null)");
  await pool.query("INSERT INTO public.period_categories VALUES ('child', 'cat')");
  const result = await move('child', 'other');
  assert.equal(result.parent_id, 'other');
  assert.equal(result.has_children, true);
  assert.deepEqual(result.categories, [{ id: 'cat', label: { fr: 'Catégorie', en: 'Catégorie' } }]);
  assert.equal((await pool.query("SELECT parent_id FROM public.periods WHERE id = 'child'")).rows[0].parent_id, 'other');
});

test('explicitly detaches a period', async () => {
  assert.equal((await move('child', null)).parent_id, null);
});

test('rejects self parenting and indirect cycles without changing the tree', async () => {
  await assert.rejects(move('child', 'child'), { status: 409 });
  await assert.rejects(move('root', 'grandchild'), { status: 409 });
  assert.deepEqual((await pool.query('SELECT id, parent_id FROM public.periods ORDER BY id')).rows, [
    { id: 'child', parent_id: 'root' }, { id: 'grandchild', parent_id: 'child' }, { id: 'other', parent_id: null }, { id: 'root', parent_id: null },
  ]);
});

test('terminates and refuses attaching to a pre-existing corrupt cycle', async () => {
  await pool.query("UPDATE public.periods SET parent_id = 'grandchild' WHERE id = 'root'");
  await assert.rejects(move('other', 'child'), { status: 409 });
  assert.equal((await pool.query("SELECT parent_id FROM public.periods WHERE id = 'other'")).rows[0].parent_id, null);
});

test('rejects missing children and missing parents', async () => {
  await assert.rejects(move('missing', 'root'), { status: 404 });
  await assert.rejects(move('child', 'missing'), { status: 404 });
});

test('rolls back the update if reading the canonical categories fails', async () => {
  await assert.rejects(runInTransaction(pool, client => changePeriodParent({ query(sql, params) {
    if (sql.includes('SELECT c.id')) throw new Error('Simulated response read failure');
    return client.query(sql, params);
  } }, 'child', 'other')), /Simulated response read failure/);
  assert.equal((await pool.query("SELECT parent_id FROM public.periods WHERE id = 'child'")).rows[0].parent_id, 'root');
});

test('real PostgreSQL locks allow only one of two crossed concurrent moves to commit', async () => {
  const results = await Promise.allSettled([move('root', 'other'), move('other', 'root')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  const rows = (await pool.query("SELECT id, parent_id FROM public.periods WHERE id IN ('root', 'other')")).rows;
  assert.equal(rows.every(row => row.parent_id !== null), false);
});

test('plain readers remain available while the hierarchy writer holds its lock', async () => {
  let signalReady, releaseLock;
  const ready = new Promise(resolve => { signalReady = resolve; });
  const released = new Promise(resolve => { releaseLock = resolve; });
  const writer = runInTransaction(pool, async client => {
    await client.query('LOCK TABLE public.periods IN SHARE ROW EXCLUSIVE MODE');
    signalReady();
    await released;
  });
  try {
    await ready;
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM public.periods')).rows[0].count, 4);
  } finally {
    releaseLock();
    await writer;
  }
});
