// Real privilege/trigger checks, exclusively on a disposable local PostgreSQL database.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const socket = process.env.TIMELINE_TEST_SOCKET;
const database = process.env.TIMELINE_TEST_DATABASE;
assert.ok(socket?.startsWith('/'), 'Local Unix socket required.');
assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Disposable test database required.');
const pool = new pg.Pool({ host: socket, port: 55439, database, max: 1, statement_timeout: 10000 });
const tables = ['periods', 'events', 'categories', 'stories'];

before(async () => {
  await pool.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
    CREATE ROLE public_privilege_probe NOLOGIN;
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
    CREATE FUNCTION public.maintain_period_relations() RETURNS void LANGUAGE plpgsql AS $$
      BEGIN UPDATE periods SET has_parent = (parent_id IS NOT NULL); END; $$;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
    CREATE SCHEMA caller_shadow;
    CREATE FUNCTION caller_shadow.now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '1970-01-01'::timestamptz $$;
    GRANT USAGE ON SCHEMA caller_shadow TO authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, public_privilege_probe;
  `);
  for (const table of tables) {
    await pool.query(`CREATE TABLE public.${table} (id int PRIMARY KEY, updated_at timestamptz);
      INSERT INTO public.${table} VALUES (1, '1970-01-01');
      GRANT SELECT, UPDATE ON public.${table} TO authenticated;
      CREATE TRIGGER updated_at BEFORE UPDATE ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();`);
  }
  await pool.query(await readFile(new URL('../../database/migrations/20261029093707_harden_public_functions.sql', import.meta.url), 'utf8'));
});
after(() => pool.end());

test('both routines have pinned lookup paths and retain caller privileges', async () => {
  const { rows } = await pool.query(`SELECT proname, proconfig, prosecdef FROM pg_proc
    WHERE oid IN ('public.set_updated_at()'::regprocedure, 'public.maintain_period_relations()'::regprocedure) ORDER BY proname`);
  assert.deepEqual(rows, [
    { proname: 'maintain_period_relations', proconfig: ['search_path=pg_catalog, public, pg_temp'], prosecdef: false },
    { proname: 'set_updated_at', proconfig: ['search_path=""'], prosecdef: false },
  ]);
});

test('API roles and an unrelated role cannot call the historical repair routine', async () => {
  for (const role of ['anon', 'authenticated', 'service_role', 'public_privilege_probe']) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${role}`);
      await assert.rejects(client.query('SELECT public.maintain_period_relations()'), { code: '42501' });
    } finally { await client.query('ROLLBACK'); client.release(); }
    for (const fn of ['set_updated_at', 'maintain_period_relations']) {
      const { rows } = await pool.query('SELECT has_function_privilege($1, $2, $3) AS allowed', [role, `public.${fn}()`, 'EXECUTE']);
      assert.equal(rows[0].allowed, false);
    }
  }
});

test('all four existing triggers still update timestamps for signed-in table writers', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expected = (await client.query('SELECT pg_catalog.transaction_timestamp() AS stamp')).rows[0].stamp;
    await client.query('SET LOCAL ROLE authenticated');
    await client.query('SET LOCAL search_path = caller_shadow, public, pg_temp');
    for (const table of tables) {
      const { rows } = await client.query(`UPDATE public.${table} SET id=id WHERE id=1 RETURNING updated_at`);
      assert.equal(rows[0].updated_at.getTime(), expected.getTime());
    }
  } finally { await client.query('ROLLBACK'); client.release(); }
});

test('owner still controls the routine without granting access back to API roles', async () => {
  const { rows } = await pool.query("SELECT has_function_privilege(current_user, 'public.maintain_period_relations()', 'EXECUTE') AS allowed");
  assert.equal(rows[0].allowed, true);
  await assert.rejects(pool.query('SELECT public.maintain_period_relations()'), { code: '42703' });
});
