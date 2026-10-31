// Disposable PostgreSQL only: this script refuses TCP/Supabase connections.
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { applyPrincipal } from '../dist/auth/context.js';
import { checkAccessSchema } from '../dist/auth/preflight.js';
import { searchStories } from '../dist/repositories/searchRepository.js';
import { runInTransaction } from '../dist/api/transaction.js';

const socket = process.env.TIMELINE_TEST_SOCKET; const database = process.env.TIMELINE_TEST_DATABASE;
assert.ok(socket?.startsWith('/'), 'Local Unix socket required.');
assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Disposable test database required.');
const pool = new pg.Pool({ host: socket, port: 55439, database, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 10000 });
const alice = '00000000-0000-0000-0000-000000000001'; const bob = '00000000-0000-0000-0000-000000000002';
const scoped = (userId, operation, extra = {}) => runInTransaction(pool, async client => {
  await applyPrincipal(client, { userId, isAdmin: false, ...extra }); return operation(client);
});
const sql = (userId, text, params = []) => scoped(userId, client => client.query(text, params));

before(async () => {
  await pool.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, is_anonymous boolean DEFAULT false, raw_app_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$ SELECT nullif(auth.jwt()->>'sub','')::uuid $$;
    CREATE TABLE public.periods (id text PRIMARY KEY, label_fr text DEFAULT '', label_en text DEFAULT '', description_fr text, description_en text, wikidata_id text);
    CREATE TABLE public.events (id text PRIMARY KEY, label_fr text DEFAULT '', label_en text DEFAULT '', description_fr text, description_en text, wikidata_id text);
    CREATE TABLE public.categories (id text PRIMARY KEY);
    CREATE TABLE public.period_categories (period_id text REFERENCES periods, category_id text REFERENCES categories);
    CREATE TABLE public.event_categories (event_id text REFERENCES events, category_id text REFERENCES categories);
    CREATE TABLE public.stories (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title_fr text NOT NULL, title_en text DEFAULT '', description_fr text, description_en text, is_public boolean DEFAULT true, parent_story_id integer REFERENCES stories);
    CREATE TABLE public.story_periods (story_id integer REFERENCES stories, period_id text REFERENCES periods);
    CREATE TABLE public.story_events (story_id integer REFERENCES stories, event_id text REFERENCES events);
    CREATE TABLE public.story_categories (story_id integer REFERENCES stories, category_id text REFERENCES categories);
    CREATE TABLE public.story_anchors (id serial PRIMARY KEY, story_id integer REFERENCES stories, anchor_type text, anchor_id text);
    INSERT INTO public.stories (title_fr) VALUES ('Legacy');
  `);
  await assert.rejects(checkAccessSchema(pool), /Migration/);
  await pool.query(await readFile(new URL('../../database/migrations/20261029090427_story_access.sql', import.meta.url), 'utf8'));
  await checkAccessSchema(pool);
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories')).rows[0].owner_user_id, null, 'No owner assigned implicitly');
  await pool.query("INSERT INTO auth.users (id,email,email_confirmed_at) VALUES ($1,'alice@example.test',now()),($2,'bob@example.test',now())", [alice, bob]);
});
beforeEach(async () => {
  await pool.query("UPDATE auth.users SET email_confirmed_at=now(), raw_app_meta_data='{}'");
  await pool.query('TRUNCATE public.stories, public.story_periods, public.story_events, public.story_categories, public.story_anchors, public.periods, public.events, public.categories, public.period_categories, public.event_categories RESTART IDENTITY CASCADE');
  await pool.query("INSERT INTO public.periods (id) VALUES ('p'); INSERT INTO public.events (id) VALUES ('e'); INSERT INTO public.categories VALUES ('c');");
  await pool.query("INSERT INTO public.stories (title_fr, is_public, owner_user_id) VALUES ('Alice public',true,$1),('Alice private',false,$1),('Bob private',false,$2),('Legacy public',true,null)", [alice,bob]);
  await pool.query("INSERT INTO public.story_periods VALUES (2,'p'); INSERT INTO public.story_events VALUES (2,'e'); INSERT INTO public.story_categories VALUES (2,'c'); INSERT INTO public.story_anchors (story_id,anchor_type,anchor_id) VALUES (2,'period','p');");
});
after(() => pool.end());

test('public timeline sees public stories and catalogue only', async () => {
  assert.deepEqual((await sql(null, 'SELECT id FROM public.stories ORDER BY id')).rows, [{ id:1 },{ id:4 }]);
  for (const table of ['periods','events','categories']) assert.equal((await sql(null, `SELECT * FROM public.${table}`)).rowCount,1);
});
test('owners see their own private stories, without seeing another owner’s private stories', async () => {
  assert.deepEqual((await sql(alice, 'SELECT id FROM public.stories ORDER BY id')).rows, [{ id:1 },{ id:2 },{ id:4 }]);
  assert.deepEqual((await sql(bob, 'SELECT id FROM public.stories ORDER BY id')).rows, [{ id:1 },{ id:3 },{ id:4 }]);
});
test('private story memberships and anchors are hidden from anonymous and other users', async () => {
  for (const table of ['story_periods','story_events','story_categories','story_anchors']) {
    for (const user of [null, bob]) assert.equal((await sql(user, `SELECT * FROM public.${table}`)).rowCount,0);
    assert.equal((await sql(alice, `SELECT * FROM public.${table}`)).rowCount,1);
  }
});
test('new stories belong to the verified user by default', async () => {
  const row = (await sql(alice, "INSERT INTO public.stories (title_fr) VALUES ('New') RETURNING owner_user_id,is_public")).rows[0];
  assert.equal(row.owner_user_id, alice);
  assert.equal(row.is_public, false);
});
test('an owner cannot create a story for somebody else or transfer ownership', async () => {
  await assert.rejects(sql(alice,"INSERT INTO public.stories (title_fr,owner_user_id) VALUES ('Spoof',$1)",[bob]),{ code:'42501' });
  await assert.rejects(sql(alice,'UPDATE public.stories SET owner_user_id=$1 WHERE id=2',[bob]),{ code:'42501' });
});
test('public visibility does not permit another user to modify or delete a story', async () => {
  assert.equal((await sql(bob,"UPDATE public.stories SET title_fr='Changed' WHERE id=1")).rowCount,0);
  assert.equal((await sql(bob,'DELETE FROM public.stories WHERE id=1')).rowCount,0);
  await assert.rejects(sql(bob,"INSERT INTO public.story_events VALUES (1,'e')"),{ code:'42501' });
});
test('other users cannot remove or move private associations', async () => {
  for (const table of ['story_periods','story_events','story_categories','story_anchors']) {
    assert.equal((await sql(bob,`DELETE FROM public.${table} WHERE story_id=2`)).rowCount,0);
  }
  await assert.rejects(sql(alice,'UPDATE public.story_events SET story_id=3 WHERE story_id=2'),{ code:'42501' });
});
test('the owner can manage their own associations', async () => {
  await sql(alice,"INSERT INTO public.story_events VALUES (1,'e')");
  assert.equal((await sql(alice,'DELETE FROM public.story_events WHERE story_id=1')).rowCount,1);
});
test('a public parent cannot be used to attach another user’s child story', async () => {
  await assert.rejects(sql(bob,'UPDATE public.stories SET parent_story_id=1 WHERE id=3'),{ code:'23503' });
  assert.equal((await sql(alice,'UPDATE public.stories SET parent_story_id=1 WHERE id=2')).rowCount,1);
});
test('anonymous requests cannot write to any application table', async () => {
  for (const table of ['periods','events','categories','period_categories','event_categories','stories','story_periods','story_events','story_categories','story_anchors']) {
    await assert.rejects(sql(null,`DELETE FROM public.${table}`),{ code:'42501' });
  }
});
test('anonymous Supabase sign-ins are rejected by the RLS write rules too', async () => {
  await assert.rejects(scoped(alice, async client => {
    await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({ sub:alice,role:'authenticated',is_anonymous:true })]);
    await client.query("INSERT INTO public.stories (title_fr) VALUES ('Anonymous')");
  }),{ code:'42501' });
});
test('shared catalogue remains editable by signed-in users without inventing entity ownership', async () => {
  assert.equal((await sql(alice,"INSERT INTO public.periods VALUES ('shared')")).rowCount,1);
  assert.equal((await sql(bob,"DELETE FROM public.periods WHERE id='shared'")).rowCount,1);
});
test('admin metadata does not grant access to other users’ private stories', async () => {
  assert.equal((await scoped(alice, client => client.query('SELECT * FROM public.stories WHERE id=3'), { isAdmin:true })).rowCount,0);
});
test('roles and claims do not leak after commit or rollback', async () => {
  await sql(alice,'SELECT 1');
  await assert.rejects(sql(bob,'SELECT 1/0'));
  for (let i=0;i<3;i++) {
    const row=(await pool.query("SELECT current_user, current_setting('request.jwt.claims',true) AS claims")).rows[0];
    assert.notEqual(row.current_user,'authenticated'); assert.ok(!row.claims);
  }
});

const applyOperations = async (email, ...files) => {
  const statements = await Promise.all(files.map(file => readFile(new URL(`../../database/operations/${file}`,import.meta.url),'utf8')));
  return runInTransaction(pool, async client => {
    await client.query("SELECT set_config('timeline.admin_email',$1,true)",[email]);
    for(const statement of statements) await client.query(statement);
  });
};
const bootstrap = email => applyOperations(email,'assign_admin_role.sql','assign_legacy_stories.sql');
test('admin attribution requires an existing confirmed account and leaves owned stories untouched',async()=>{
  await bootstrap('alice@example.test');
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=4')).rows[0].owner_user_id,alice);
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=3')).rows[0].owner_user_id,bob);
  assert.equal((await pool.query('SELECT raw_app_meta_data FROM auth.users WHERE id=$1',[alice])).rows[0].raw_app_meta_data.role,'admin');
});
test('unknown or unconfirmed bootstrap addresses change neither roles nor legacy ownership',async()=>{
  await assert.rejects(bootstrap('missing@example.test'));
  await pool.query('UPDATE auth.users SET email_confirmed_at=null WHERE id=$1',[alice]);
  await assert.rejects(bootstrap('alice@example.test'));
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=4')).rows[0].owner_user_id,null);
  assert.deepEqual((await pool.query('SELECT raw_app_meta_data FROM auth.users WHERE id=$1',[alice])).rows[0].raw_app_meta_data,{});
});

test('admin role attribution alone leaves story ownership untouched',async()=>{
  await applyOperations('alice@example.test','assign_admin_role.sql');
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=4')).rows[0].owner_user_id,null);
  assert.equal((await pool.query('SELECT raw_app_meta_data FROM auth.users WHERE id=$1',[alice])).rows[0].raw_app_meta_data.role,'admin');
});
test('legacy attribution requires a confirmed account already holding the admin role',async()=>{
  await assert.rejects(applyOperations('alice@example.test','assign_legacy_stories.sql'));
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=4')).rows[0].owner_user_id,null);
});
test('ownership attribution preserves each story visibility, hierarchy and category links',async()=>{
  await pool.query("UPDATE public.stories SET is_public=false WHERE id=4; INSERT INTO public.story_categories VALUES (4,'c');");
  const visibility = await pool.query('SELECT id,is_public,parent_story_id FROM public.stories ORDER BY id');
  const links = await pool.query('SELECT * FROM public.story_categories ORDER BY story_id,category_id');
  await bootstrap('alice@example.test');
  assert.deepEqual((await pool.query('SELECT id,is_public,parent_story_id FROM public.stories ORDER BY id')).rows,visibility.rows);
  assert.deepEqual((await pool.query('SELECT * FROM public.story_categories ORDER BY story_id,category_id')).rows,links.rows);
  assert.equal((await pool.query('SELECT owner_user_id FROM public.stories WHERE id=4')).rows[0].owner_user_id,alice);
});


test('story search enforces public/owner visibility for direct title matches', async () => {
  const found = (user, term) => scoped(user, client => searchStories(client, term));
  assert.deepEqual((await found(null, '%private%')).map(row => row.id), []);
  assert.deepEqual((await found(alice, '%private%')).map(row => row.id), [2]);
  assert.deepEqual((await found(bob, '%private%')).map(row => row.id), [3]);
  assert.deepEqual((await found(null, '%public%')).map(row => row.id), [1, 4]);
});
test('story search finds associated periods and events without leaking private memberships or duplicating stories', async () => {
  await pool.query("UPDATE public.periods SET label_fr='Crétacé'; UPDATE public.events SET label_fr='Crétacé'; INSERT INTO public.story_periods VALUES (1,'p'); INSERT INTO public.story_events VALUES (1,'e');");
  const found = user => scoped(user, client => searchStories(client, '%Crétacé%'));
  assert.deepEqual((await found(null)).map(row => row.id), [1]);
  assert.deepEqual((await found(bob)).map(row => row.id), [1]);
  assert.deepEqual((await found(alice)).map(row => row.id).sort(), [1, 2]);
});
test('story search ranks title matches before descriptions and associated content', async () => {
  await pool.query("UPDATE public.stories SET title_fr='Crétacé' WHERE id=1; UPDATE public.stories SET description_fr='Le Crétacé' WHERE id=4; UPDATE public.periods SET label_fr='Crétacé';");
  const rows = await scoped(alice, client => searchStories(client, '%Crétacé%'));
  assert.deepEqual(rows.map(row => [row.id, row.matched_on]), [[1,'title'],[4,'description'],[2,'content']]);
});
test('story search treats escaped wildcard characters literally', async () => {
  await pool.query("UPDATE public.stories SET title_fr='50% du temps' WHERE id=1; UPDATE public.stories SET title_fr='500 du temps' WHERE id=4;");
  const rows = await scoped(null, client => searchStories(client, '%50\\%%'));
  assert.deepEqual(rows.map(row => row.id), [1]);
});


test('story search returns the precise period or event label behind a match', async () => {
  await pool.query("UPDATE public.periods SET label_fr='Jurassique'; UPDATE public.events SET label_fr='crise de Cuba',label_en='Cuban crisis'; INSERT INTO public.story_periods VALUES (1,'p'); INSERT INTO public.story_events VALUES (1,'e');");
  const period = await scoped(null, client => searchStories(client, '%Jurassique%'));
  assert.deepEqual(period.map(row => [row.id, row.matched_type, row.matched_label_fr]), [[1,'period','Jurassique']]);
  const event = await scoped(null, client => searchStories(client, '%Cuba%'));
  assert.deepEqual(event.map(row => [row.id, row.matched_type, row.matched_label_fr]), [[1,'event','crise de Cuba']]);
});
