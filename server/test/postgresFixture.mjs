import assert from 'node:assert/strict';
import pg from 'pg';

export const alice = '00000000-0000-0000-0000-000000000001';
export const bob = '00000000-0000-0000-0000-000000000002';
export const category = '00000000-0000-0000-0000-000000000010';
export const applicationTables = ['categories', 'event_categories', 'events', 'period_categories', 'periods', 'profiles', 'stories', 'story_anchors', 'story_categories', 'story_entry_points', 'story_events', 'story_periods'];

export function testPool(database = process.env.TIMELINE_TEST_DATABASE) {
  const socket = process.env.TIMELINE_TEST_SOCKET;
  assert.ok(socket?.startsWith('/'), 'A local Unix socket is required. TCP/Supabase are refused.');
  assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Disposable test database required.');
  return new pg.Pool({ host: socket, port: 55439, database, max: 3, connectionTimeoutMillis: 3000, statement_timeout: 10000 });
}

// Test double for Supabase-managed Auth infrastructure, never installed on Supabase.
export const authFixture = `
  DO $roles$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  END $roles$;
  CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
  $$;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
    SELECT nullif(auth.jwt()->>'sub','')::uuid
  $$;
`;

export async function snapshotRows(pool) {
  const snapshot = {};
  for (const table of applicationTables) {
    snapshot[table] = (await pool.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) AS rows FROM public.${table} t`)).rows[0].rows;
  }
  return snapshot;
}

export async function schemaContract(pool) {
  const tables = [];
  for (const name of applicationTables) {
    const { rows: [table] } = await pool.query(`SELECT c.oid, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1`, [name]);
    assert.ok(table, `Missing table: ${name}`);
    const columns = (await pool.query(`SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS "notNull", pg_get_expr(d.adbin,d.adrelid) AS "default", a.attidentity AS identity FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`, [table.oid])).rows;
    const constraints = (await pool.query(`SELECT conname AS name, pg_get_constraintdef(oid,true) AS definition, contype AS kind FROM pg_constraint WHERE conrelid=$1 ORDER BY conname`, [table.oid])).rows;
    const indexes = (await pool.query(`SELECT pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i WHERE i.indrelid=$1 AND NOT EXISTS(SELECT 1 FROM pg_constraint co WHERE co.conindid=i.indexrelid) ORDER BY i.indexrelid::regclass::text`, [table.oid])).rows.map(row => row.definition);
    const triggers = (await pool.query(`SELECT pg_get_triggerdef(oid,true) AS definition FROM pg_trigger WHERE tgrelid=$1 AND NOT tgisinternal ORDER BY tgname`, [table.oid])).rows.map(row => row.definition);
    tables.push({ name, columns, constraints, indexes, triggers, rls: table.rls });
  }
  const policies = (await pool.query(`SELECT tablename AS table, policyname AS name, permissive, roles::text[] AS roles, cmd AS command, qual AS using, with_check AS check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`)).rows;
  return { tables, policies };
}
