// Requires a new, empty disposable database, using the same socket contract as test:hierarchy.
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { deleteUnusedPeriod } from '../dist/services/periodDeletion.js';
import { runInTransaction } from '../dist/api/transaction.js';

const socket = process.env.TIMELINE_TEST_SOCKET;
const database = process.env.TIMELINE_TEST_DATABASE;
assert.ok(socket?.startsWith('/'), 'A local Unix socket is required; TCP and Supabase are not accepted.');
assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Use a disposable test database.');
const pool = new pg.Pool({ host: socket, port: 55439, database, max: 5, connectionTimeoutMillis: 3000, statement_timeout: 10000 });
const remove = id => runInTransaction(pool, client => deleteUnusedPeriod(client, id));
const pause = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function waitForLock(pid) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if ((await pool.query('SELECT 1 FROM pg_locks WHERE pid = $1 AND NOT granted', [pid])).rows.length) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`Connection ${pid} did not wait on the expected lock`);
}

before(async () => {
  // Mirror the real FK actions: SET NULL for children, CASCADE for category/story links.
  await pool.query(`
    CREATE TABLE public.periods (id varchar(255) PRIMARY KEY, updated_at timestamptz);
    CREATE TABLE public.categories (id text PRIMARY KEY);
    CREATE TABLE public.period_categories (period_id varchar(255) REFERENCES public.periods(id) ON DELETE CASCADE, category_id text REFERENCES public.categories(id), PRIMARY KEY(period_id, category_id));
    CREATE TABLE public.stories (id integer PRIMARY KEY);
    CREATE TABLE public.story_periods (story_id integer REFERENCES public.stories(id) ON DELETE CASCADE, period_id varchar(255) REFERENCES public.periods(id) ON DELETE CASCADE, PRIMARY KEY(story_id, period_id));
    CREATE TABLE public.events (id text PRIMARY KEY);
  `);
});
beforeEach(async () => {
  await pool.query('TRUNCATE public.story_periods, public.period_categories, public.stories, public.categories, public.periods, public.events');
  await pool.query("INSERT INTO public.periods(id) VALUES ('root'), ('parent'), ('leaf'), ('other')");
  await pool.query("INSERT INTO public.categories VALUES ('cat'); INSERT INTO public.period_categories VALUES ('leaf', 'cat'); INSERT INTO public.stories VALUES (1); INSERT INTO public.events VALUES ('event')");
});
after(() => pool.end());

test('deletes an unused leaf and only its category associations, returning the real parent flag', async () => {
  assert.deepEqual(await remove('leaf'), { id: 'leaf', parent: null });
  assert.equal((await pool.query("SELECT 1 FROM public.periods WHERE id='leaf'")).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM public.period_categories')).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM public.categories')).rowCount, 1);
  assert.equal((await pool.query('SELECT 1 FROM public.events')).rowCount, 1);
});

test('deletes a root only when it is unused and has no children', async () => {
  assert.deepEqual(await remove('other'), { id: 'other', parent: null });
});

test('refuses a story period instead of letting ON DELETE CASCADE remove its links', async () => {
  await pool.query("INSERT INTO public.story_periods VALUES (1, 'leaf')");
  await assert.rejects(remove('leaf'), { status: 409 });
  assert.equal((await pool.query('SELECT 1 FROM public.story_periods')).rowCount, 1);
  assert.equal((await pool.query('SELECT 1 FROM public.period_categories')).rowCount, 1);
});

test('reports a missing period, including a second deletion', async () => {
  await assert.rejects(remove('missing'), { status: 404 });
  await remove('leaf');
  await assert.rejects(remove('leaf'), { status: 404 });
});

test('restores both the period and category associations if the final parent read fails', async () => {
  await assert.rejects(runInTransaction(pool, client => deleteUnusedPeriod({ query(sql, params) {
    if (sql.startsWith('DELETE FROM public.periods WHERE')) throw new Error('Simulated deletion failure');
    return client.query(sql, params);
  } }, 'leaf')), /Simulated deletion failure/);
  assert.equal((await pool.query("SELECT 1 FROM public.periods WHERE id='leaf'")).rowCount, 1);
  assert.equal((await pool.query('SELECT 1 FROM public.period_categories')).rowCount, 1);
});

test('a committed story link wins over a simultaneous deletion', async () => {
  const linkingClient = await pool.connect();
  const deleteClient = await pool.connect();
  await linkingClient.query('BEGIN');
  await linkingClient.query("INSERT INTO public.story_periods VALUES (1, 'leaf')");
  const deleting = runInTransaction({ connect: async () => deleteClient }, client => deleteUnusedPeriod(client, 'leaf')).then(value => ({ value }), error => ({ error }));
  try {
    await waitForLock(deleteClient.processID);
    await linkingClient.query('COMMIT');
    assert.equal((await deleting).error.status, 409);
    assert.equal((await pool.query('SELECT 1 FROM public.story_periods')).rowCount, 1);
    assert.equal((await pool.query("SELECT 1 FROM public.periods WHERE id='leaf'")).rowCount, 1);
  } finally {
    await linkingClient.query('ROLLBACK'); linkingClient.release();
    await deleting;
  }
});

test('a deletion in progress blocks new story references until its commit', async () => {
  const checked = pause(), finish = pause();
  const deleting = runInTransaction(pool, client => deleteUnusedPeriod({ async query(sql, params) {
    const result = await client.query(sql, params);
    if (sql.includes('AS children')) { checked.resolve(); await finish.promise; }
    return result;
  } }, 'leaf'));
  await checked.promise;
  const linkingClient = await pool.connect();
  await linkingClient.query('BEGIN');
  const linking = linkingClient.query("INSERT INTO public.story_periods VALUES (1, 'leaf')").then(value => ({ value }), error => ({ error }));
  try {
    await waitForLock(linkingClient.processID);
    finish.resolve(); await deleting;
    assert.equal((await linking).error.code, '23503');
  } finally {
    finish.resolve(); await deleting;
    await linkingClient.query('ROLLBACK'); linkingClient.release();
  }
  assert.equal((await pool.query('SELECT 1 FROM public.story_periods')).rowCount, 0);
});
