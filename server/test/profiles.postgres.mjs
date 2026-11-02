// Account profiles on a disposable local PostgreSQL database only: sign-up trigger, unique username,
// RLS on the own row, frise byline and self-service erasure through the real handlers.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, applicationTables } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const carol = '00000000-0000-0000-0000-000000000003';
const pool = testPool();
const baseline = await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8');
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, { userId: principalContext.getStore()?.userId ?? null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, { body = {}, query = {}, userId = alice } = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `${method} ${path}`);
  const res = { statusCode: 200, payload: undefined, locals: { principal: { userId, isAdmin: false } },
    status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params: {}, query }, res));
  return res;
}
const signUp = (id, metadata) => pool.query('INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)', [id, `${id.slice(-1)}@example.test`, metadata]);

before(async () => {
  await pool.query(authFixture);
  await pool.query(baseline);
});
beforeEach(async () => {
  await pool.query(`TRUNCATE ${applicationTables.map(t => 'public.' + t).join(',')} RESTART IDENTITY CASCADE`);
  await pool.query('DELETE FROM auth.users');
  await signUp(alice, { username: 'Alice_1', terms_version: '2026-11-03' });
  await signUp(bob, {});
  await pool.query("INSERT INTO periods (id,label_fr,label_en,start_date,end_date) VALUES ('root','Racine','Root','M65','NOW')");
  await pool.query("INSERT INTO stories (title_fr,title_en,author,is_public,owner_user_id) VALUES ('A','A','Alice_1',true,$1),('B','B','Bob',false,$2)", [alice, bob]);
  await pool.query("INSERT INTO story_periods (story_id, period_id) VALUES (1,'root'),(2,'root')");
});
after(() => pool.end());

test('a sign-up with a username creates its profile and records the accepted terms', async () => {
  const { rows } = await pool.query('SELECT user_id, username, avatar_color, avatar_icon, terms_version, terms_accepted_at IS NOT NULL AS accepted FROM public.profiles ORDER BY username');
  assert.deepEqual(rows, [{ user_id: alice, username: 'Alice_1', avatar_color: 'blue', avatar_icon: 'initial', terms_version: '2026-11-03', accepted: true }]);
});

test('a taken (any case), reserved or malformed username makes the whole sign-up fail', async () => {
  await assert.rejects(signUp(carol, { username: 'alice_1' }), { code: '23505' });
  await assert.rejects(signUp(carol, { username: 'Admin' }), { code: '23514' });
  await assert.rejects(signUp(carol, { username: 'a b' }), { code: '23514' });
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM auth.users WHERE id = $1', [carol])).rows[0].n, 0);
});

test('availability answers anonymously without exposing profiles, and treats the own name as free', async () => {
  assert.deepEqual((await call('get', '/profile/username-availability', { query: { username: 'ALICE_1' }, userId: null })).payload, { available: false });
  assert.deepEqual((await call('get', '/profile/username-availability', { query: { username: 'Libre' }, userId: null })).payload, { available: true });
  assert.deepEqual((await call('get', '/profile/username-availability', { query: { username: 'alice_1' } })).payload, { available: true });
  assert.equal((await call('get', '/profile/username-availability', { query: { username: 'x' }, userId: null })).statusCode, 400);
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE anon');
    await assert.rejects(client.query('SELECT * FROM public.profiles'), { code: '42501' });
  } finally { await client.query('ROLLBACK'); client.release(); }
});

test('RLS limits each account to its own row and its editable columns', async () => {
  await call('put', '/profile', { body: { username: 'Bob', avatarColor: 'teal', avatarIcon: 'rocket' }, userId: bob });
  const seen = await runInTransaction(pool, async client => {
    await applyPrincipal(client, { userId: alice, isAdmin: false });
    const visible = (await client.query('SELECT username FROM public.profiles')).rows.map(row => row.username);
    const updated = (await client.query("UPDATE public.profiles SET avatar_color = 'red' WHERE user_id = $1", [bob])).rowCount;
    return { visible, updated };
  });
  assert.deepEqual(seen, { visible: ['Alice_1'], updated: 0 });
  await assert.rejects(runInTransaction(pool, async client => {
    await applyPrincipal(client, { userId: alice, isAdmin: false });
    await client.query("UPDATE public.profiles SET created_at = now() - interval '1 year'");
  }), { code: '42501' });
});

test('a frise needs a username; the account signs it whatever the body says', async () => {
  const refused = await call('post', '/stories', { body: { title: { fr: 'Sans profil' }, author: 'Usurpé' }, userId: bob });
  assert.equal(refused.statusCode, 412); assert.match(refused.payload.error, /nom d’utilisateur/);
  const created = await call('post', '/stories', { body: { title: { fr: 'Signée' }, author: 'Usurpé' } });
  assert.equal(created.statusCode, 201); assert.equal(created.payload.author, 'Alice_1');
});

test('renaming updates the byline of the own frises only, and a taken name is refused', async () => {
  await call('put', '/profile', { body: { username: 'Bob', avatarColor: 'blue', avatarIcon: 'initial' }, userId: bob });
  const taken = await call('put', '/profile', { body: { username: 'BOB', avatarColor: 'blue', avatarIcon: 'initial' } });
  assert.equal(taken.statusCode, 409); assert.equal(taken.payload.error, 'Ce nom d’utilisateur est déjà pris.');
  const renamed = await call('put', '/profile', { body: { username: 'Alice_2', avatarColor: 'violet', avatarIcon: 'telescope' } });
  assert.equal(renamed.payload.username, 'Alice_2'); assert.equal(renamed.payload.avatarIcon, 'telescope');
  assert.deepEqual((await pool.query('SELECT title_fr, author FROM stories ORDER BY id')).rows, [{ title_fr: 'A', author: 'Alice_2' }, { title_fr: 'B', author: 'Bob' }]);
});

test('terms are accepted only in the current version', async () => {
  assert.equal((await call('post', '/profile/terms', { body: { version: '2020-01-01' } })).statusCode, 409);
  assert.equal((await call('post', '/profile/terms', { body: { version: '2026-11-03' }, userId: bob })).statusCode, 412);
  assert.equal((await call('post', '/profile/terms', { body: { version: '2026-11-03' } })).payload.termsVersion, '2026-11-03');
});

test('the export contains the own profile and frises only', async () => {
  const { payload } = await call('get', '/profile/export');
  assert.equal(payload.profile.username, 'Alice_1');
  assert.deepEqual(payload.stories.map(story => [story.title_fr, story.periods]), [['A', [{ period_id: 'root', parent_period_id: null }]]]);
  assert.equal((await call('get', '/profile', { userId: null })).statusCode, 401);
});

test('erasure deletes the own frises, profile and account, and keeps others and the catalogue', async () => {
  assert.equal((await call('delete', '/profile', { userId: null })).statusCode, 401);
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); await client.query('SET LOCAL ROLE anon');
    await assert.rejects(client.query('SELECT account_private.delete_own_account()'), { code: '42501' });
  } finally { await client.query('ROLLBACK'); client.release(); }
  assert.equal((await call('delete', '/profile')).statusCode, 204);
  const counts = (await pool.query(`SELECT
    (SELECT count(*)::int FROM auth.users WHERE id = $1) AS account, (SELECT count(*)::int FROM public.profiles WHERE user_id = $1) AS profile,
    (SELECT count(*)::int FROM public.stories WHERE owner_user_id = $1) AS own, (SELECT count(*)::int FROM public.stories) AS stories,
    (SELECT count(*)::int FROM public.story_periods) AS memberships, (SELECT count(*)::int FROM public.periods) AS periods`, [alice])).rows[0];
  assert.deepEqual(counts, { account: 0, profile: 0, own: 0, stories: 1, memberships: 1, periods: 1 });
});

test('account routines stay outside the schema exposed by the Data API', async () => {
  const { rows } = await pool.query(`SELECT p.proname, n.nspname, p.prosecdef, p.proconfig,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('is_username_available', 'create_profile_for_new_user', 'delete_own_account') ORDER BY p.proname`);
  assert.deepEqual(rows, [
    { proname: 'create_profile_for_new_user', nspname: 'account_private', prosecdef: true, proconfig: ['search_path=""'], anon: false, authenticated: false },
    { proname: 'delete_own_account', nspname: 'account_private', prosecdef: true, proconfig: ['search_path=""'], anon: false, authenticated: true },
    { proname: 'is_username_available', nspname: 'account_private', prosecdef: true, proconfig: ['search_path=""'], anon: true, authenticated: true },
  ]);
});
