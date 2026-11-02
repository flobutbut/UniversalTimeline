// Admin console on a disposable local PostgreSQL database only: access refused to non-admins (claim and
// stored role), indicators that see private frises, and moderation rules through the real handlers.
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
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, { body = {}, params = {}, userId = alice, isAdmin = true } = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `${method} ${path}`);
  const principal = { userId, isAdmin };
  const res = { statusCode: 200, payload: undefined, locals: { principal },
    status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; }, send() { return this; } };
  await principalContext.run(principal, () => route.route.stack[0].handle({ body, params, query: {} }, res));
  return res;
}
const signUp = (id, username, metadata = {}) => pool.query(
  'INSERT INTO auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) VALUES ($1, $2, now(), $3, $4)',
  [id, `${id.slice(-1)}@example.test`, metadata, username ? { username } : {}]);
const role = async id => (await pool.query("SELECT raw_app_meta_data->>'role' AS role FROM auth.users WHERE id = $1", [id])).rows[0]?.role ?? null;

before(async () => {
  await pool.query(authFixture);
  await pool.query(baseline);
});
beforeEach(async () => {
  await pool.query(`TRUNCATE ${applicationTables.map(t => 'public.' + t).join(',')}, admin_private.audit_log RESTART IDENTITY CASCADE`);
  await pool.query('DELETE FROM auth.users');
  await signUp(alice, 'Admin_A', { role: 'admin' });
  await signUp(bob, 'Bob');
  await signUp(carol, null);
  await pool.query("INSERT INTO periods (id,label_fr,label_en,start_date,end_date) VALUES ('root','Racine','Root','M65','NOW'),('unused','Libre','Free','M10','M5')");
  await pool.query("INSERT INTO stories (title_fr,title_en,author,is_public,owner_user_id) VALUES ('Publique','P','Bob',true,$1),('Privée','Q','Bob',false,$1)", [bob]);
  await pool.query("INSERT INTO story_periods (story_id, period_id) VALUES (1,'root'),(2,'root')");
  await pool.query('INSERT INTO auth.sessions (user_id) VALUES ($1), ($1)', [bob]);
});
after(() => pool.end());

test('a regular account is refused by the API and by the database, even with a forged claim', async () => {
  assert.equal((await call('get', '/admin/dashboard', { userId: bob, isAdmin: false })).statusCode, 403);
  assert.equal((await call('get', '/admin/users', { userId: null, isAdmin: false })).statusCode, 401);
  // The claim alone is not enough: the stored role must say admin too.
  assert.equal((await call('get', '/admin/users', { userId: bob, isAdmin: true })).statusCode, 403);
  for (const sql of ['SELECT admin_private.dashboard()', 'SELECT * FROM admin_private.audit_log']) {
    await assert.rejects(runInTransaction(pool, async client => {
      await applyPrincipal(client, { userId: bob, isAdmin: false });
      await client.query(sql);
    }), { code: '42501' }, sql);
  }
});

test('the dashboard counts every frise, private ones included, and the catalogue use', async () => {
  const { statusCode, payload } = await call('get', '/admin/dashboard');
  assert.equal(statusCode, 200);
  assert.deepEqual(payload.users, { total: 3, confirmed: 3, withProfile: 2, creators: 1, new7d: 3, new30d: 3, active30d: 0, admins: 1, suspended: 0 });
  assert.deepEqual(payload.stories, { total: 2, public: 1, private: 1, roots: 2, children: 0, empty: 0, created30d: 2, updated30d: 2 });
  assert.equal(payload.catalogue.periods, 2); assert.equal(payload.catalogue.periodsUnused, 1);
  assert.equal(payload.relations.storyPeriods, 2);
  assert.deepEqual(payload.topStories.map(story => story.title), ['Publique', 'Privée']);
});

test('lists accounts and opens a fiche with its frises', async () => {
  const users = (await call('get', '/admin/users')).payload;
  assert.deepEqual(users.map(user => [user.username, user.isAdmin, user.stories, user.publicStories]).sort(),
    [['Admin_A', true, 0, 0], ['Bob', false, 2, 1], [null, false, 0, 0]].sort());
  const fiche = (await call('get', '/admin/users/:id', { params: { id: bob } })).payload;
  assert.deepEqual(fiche.storyList.map(story => story.title).sort(), ['Privée', 'Publique']);
  assert.equal((await call('get', '/admin/users/:id', { params: { id: '00000000-0000-0000-0000-000000000009' } })).statusCode, 404);
  assert.equal((await call('get', '/admin/users/:id', { params: { id: 'nope' } })).statusCode, 400);
});

test('grants and withdraws the admin role, never on oneself, and journals it', async () => {
  assert.equal((await call('put', '/admin/users/:id/role', { params: { id: bob }, body: { admin: true } })).statusCode, 204);
  assert.equal(await role(bob), 'admin');
  assert.equal((await call('put', '/admin/users/:id/role', { params: { id: bob }, body: { admin: false } })).statusCode, 204);
  assert.equal(await role(bob), null);
  const self = await call('put', '/admin/users/:id/role', { params: { id: alice }, body: { admin: false } });
  assert.equal(self.statusCode, 409); assert.equal(await role(alice), 'admin');
  const { rows } = await pool.query('SELECT action, target_username FROM admin_private.audit_log ORDER BY id');
  assert.deepEqual(rows, [{ action: 'grant_admin', target_username: 'Bob' }, { action: 'revoke_admin', target_username: 'Bob' }]);
});

test('suspends (closing sessions) and reactivates a regular account, but not an admin', async () => {
  assert.equal((await call('put', '/admin/users/:id/suspension', { params: { id: bob }, body: { suspended: true } })).statusCode, 204);
  const { rows: [state] } = await pool.query('SELECT banned_until > now() AS banned, (SELECT count(*)::int FROM auth.sessions WHERE user_id = $1) AS sessions FROM auth.users WHERE id = $1', [bob]);
  assert.deepEqual(state, { banned: true, sessions: 0 });
  assert.equal((await call('put', '/admin/users/:id/role', { params: { id: bob }, body: { admin: true } })).statusCode, 409);
  assert.equal((await call('put', '/admin/users/:id/suspension', { params: { id: bob }, body: { suspended: false } })).statusCode, 204);
  assert.equal((await pool.query('SELECT banned_until FROM auth.users WHERE id = $1', [bob])).rows[0].banned_until, null);
  await pool.query(`UPDATE auth.users SET raw_app_meta_data = '{"role":"admin"}' WHERE id = $1`, [bob]);
  assert.equal((await call('put', '/admin/users/:id/suspension', { params: { id: bob }, body: { suspended: true } })).statusCode, 409);
  assert.equal((await call('put', '/admin/users/:id/suspension', { params: { id: bob }, body: { suspended: 'yes' } })).statusCode, 400);
});

test('deletes an account with its frises and keeps the shared catalogue', async () => {
  assert.equal((await call('delete', '/admin/users/:id', { params: { id: alice } })).statusCode, 409);
  assert.equal((await call('delete', '/admin/users/:id', { params: { id: bob } })).statusCode, 204);
  const { rows: [left] } = await pool.query(`SELECT (SELECT count(*)::int FROM auth.users WHERE id = $1) AS account,
    (SELECT count(*)::int FROM public.stories) AS stories, (SELECT count(*)::int FROM public.periods) AS periods`, [bob]);
  assert.deepEqual(left, { account: 0, stories: 0, periods: 2 });
  const { rows } = await pool.query('SELECT action, target_username FROM admin_private.audit_log');
  assert.deepEqual(rows, [{ action: 'delete_user', target_username: 'Bob' }]);
});

test('admin routines are definer functions with a fixed search path, executable by authenticated only', async () => {
  const { rows } = await pool.query(`SELECT p.proname, p.prosecdef, p.proconfig,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'admin_private' ORDER BY p.proname`);
  const internal = new Set(['lock_target', 'require_admin', 'user_summary']);
  for (const row of rows) {
    assert.equal(row.prosecdef, true, row.proname); assert.deepEqual(row.proconfig, ['search_path=""'], row.proname);
    assert.equal(row.anon, false, row.proname); assert.equal(row.authenticated, !internal.has(row.proname), row.proname);
  }
  assert.equal(rows.length, 9);
});
