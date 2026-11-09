import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { testPool, authFixture, alice, bob } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const baseline = await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../database/migrations/20261109220108_user_feedback.sql', import.meta.url), 'utf8');
const notificationsMigration = await readFile(new URL('../../database/migrations/20261109221920_feedback_email_notifications.sql', import.meta.url), 'utf8');
const filtersMigration = await readFile(new URL('../../database/migrations/20261109222916_feedback_list_filters.sql', import.meta.url), 'utf8');
const deleteMigration = await readFile(new URL('../../database/migrations/20261109223738_feedback_delete.sql', import.meta.url), 'utf8');
const featureMigration = await readFile(new URL('../../database/migrations/20261109230646_feedback_feature_switch.sql', import.meta.url), 'utf8');
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, { body = {}, params = {}, query = {}, userId = null, isAdmin = false } = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `${method} ${path}`);
  const principal = { userId, isAdmin };
  const res = { statusCode: 200, payload: undefined, locals: { principal },
    set() { return this; },
    status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; }, send() { return this; } };
  await principalContext.run(principal, () => route.route.stack[0].handle({ body, params, query, ip: '127.0.0.1' }, res));
  return res;
}
const submission = (changes = {}) => ({ id: randomUUID(), token: randomUUID(), rating: 4, subject: 'data_error', message: 'Une date à corriger.', pageUrl: 'https://universaltimeline.net/timeline?story=5&period=root', ...changes });
const admin = { userId: alice, isAdmin: true };
before(async () => {
  await pool.query(authFixture);
  // Exercise the additive migration against the previous baseline, not a blank database.
  await pool.query(baseline.replace(/-- BEGIN USER FEEDBACK[\s\S]*?-- END USER FEEDBACK/, ''));
  await pool.query(migration);
  await pool.query(notificationsMigration);
  await pool.query(filtersMigration);
  await pool.query(deleteMigration);
  await pool.query(featureMigration);
  await pool.query("INSERT INTO auth.users (id,email,raw_app_meta_data) VALUES ($1,'admin@example.test','{\"role\":\"admin\"}'),($2,'user@example.test','{}')", [alice,bob]);
});
after(() => pool.end());

test('anonymous submission is durable before email, retry is idempotent and the stored receipt is hashed', async () => {
  const body = submission();
  assert.equal((await call('post','/feedback',{body})).statusCode,201);
  assert.equal((await call('post','/feedback',{body})).statusCode,201);
  const { rows: [row] } = await pool.query('SELECT * FROM feedback_private.submissions WHERE id=$1',[body.id]);
  assert.equal(row.email,null); assert.equal(row.status,'new'); assert.notEqual(row.token_hash,body.token); assert.equal(row.page_url,body.pageUrl);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM feedback_private.submissions WHERE id=$1',[body.id])).rows[0].count,1);
  assert.equal((await call('post','/feedback',{body:{...body,token:randomUUID()}})).statusCode,409);
});
test('only the secret receipt can attach an email; wrong, expired and overwrite attempts fail', async () => {
  const body=submission(); await call('post','/feedback',{body});
  const attach=(token,email='user@example.test')=>call('put','/feedback/:id/email',{params:{id:body.id},body:{token,email}});
  assert.equal((await attach(randomUUID())).statusCode,404);
  assert.equal((await attach(body.token)).statusCode,204);
  assert.equal((await attach(body.token)).statusCode,204);
  assert.equal((await attach(body.token,'other@example.test')).statusCode,404);
  await pool.query("UPDATE feedback_private.submissions SET created_at=now()-interval '2 days' WHERE id=$1",[body.id]);
  assert.equal((await attach(body.token)).statusCode,404);
});
test('messages, emails and status changes are reserved to verified, current admins in both API and SQL', async () => {
  const body=submission({rating:null}); await call('post','/feedback',{body});
  assert.equal((await call('get','/admin/feedback')).statusCode,401);
  assert.equal((await call('get','/admin/feedback',{userId:bob})).statusCode,403);
  assert.equal((await call('get','/admin/feedback',{userId:bob,isAdmin:true})).statusCode,403);
  const result=await call('get','/admin/feedback',admin);
  assert.equal(result.statusCode,200); assert.ok(result.payload.items.find(item=>item.id===body.id));
  assert.ok(!JSON.stringify(result.payload).includes('token_hash')); assert.ok(!JSON.stringify(result.payload).includes('fingerprint'));
  assert.equal((await call('put','/admin/feedback/:id/status',{...admin,params:{id:body.id},body:{status:'resolved'}})).statusCode,204);
  assert.equal((await pool.query('SELECT status FROM feedback_private.submissions WHERE id=$1',[body.id])).rows[0].status,'resolved');
  for (const userId of [null,bob]) {
    await assert.rejects(principalContext.run({userId,isAdmin:false},()=>tx(client=>client.query('SELECT * FROM feedback_private.submissions'))),{code:'42501'});
    await assert.rejects(principalContext.run({userId,isAdmin:false},()=>tx(client=>client.query('SELECT feedback_private.list(0)'))),{code:'42501'});
  }
});
test('concurrent bursts are limited while existing receipts remain retryable', async () => {
  await pool.query('TRUNCATE feedback_private.submissions CASCADE');
  const bodies=Array.from({length:12},()=>submission());
  const results=await Promise.all(bodies.map(body=>call('post','/feedback',{body})));
  assert.equal(results.filter(result=>result.statusCode===201).length,10);
  assert.equal(results.filter(result=>result.statusCode===429).length,2);
  const saved=bodies[results.findIndex(result=>result.statusCode===201)];
  assert.equal((await call('post','/feedback',{body:saved})).statusCode,201);
});

const scoped = (principal, sql, params = []) => principalContext.run(principal, () => tx(client => client.query(sql, params)));
const deliveryQuery = (sql, params = []) => runInTransaction(pool, async client => {
  await client.query('SET LOCAL ROLE service_role');
  return client.query(sql, params);
});
test('notifications are opt-in for the current verified admin account, never for a client-selected address', async () => {
  await pool.query('TRUNCATE feedback_private.submissions CASCADE');
  const settings = await call('get', '/admin/feedback/notifications', admin);
  assert.deepEqual(settings.payload, { enabled: false, email: 'admin@example.test', available: false });
  assert.equal((await call('get', '/admin/feedback/notifications')).statusCode, 401);
  assert.equal((await call('get', '/admin/feedback/notifications', { userId: bob, isAdmin: true })).statusCode, 403);
  assert.equal((await call('put', '/admin/feedback/notifications', { ...admin, body: { enabled: true, email: 'attacker@example.test' } })).statusCode, 503);
  await assert.rejects(scoped(admin, 'SELECT feedback_private.notification_settings(true)'), { code: '42501' });
  await pool.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [alice]);
  const enabled = await scoped(admin, 'SELECT feedback_private.notification_settings(true) AS result');
  assert.deepEqual(enabled.rows[0].result, { enabled: true, email: 'admin@example.test' });
  const body = submission();
  await call('post', '/feedback', { body }); await call('post', '/feedback', { body });
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM feedback_private.notification_deliveries')).rows[0].count, 1);
  for (const principal of [{ userId: null, isAdmin: false }, { userId: bob, isAdmin: false }, admin]) {
    await assert.rejects(scoped(principal, 'SELECT feedback_private.claim_notification()'), { code: '42501' });
    await assert.rejects(scoped(principal, 'SELECT * FROM feedback_private.notification_deliveries'), { code: '42501' });
  }
});
test('delivery resolves the current account email and leases work without concurrent duplicates', async () => {
  await pool.query("UPDATE auth.users SET email='updated-admin@example.test' WHERE id=$1", [alice]);
  const claims = await Promise.all([deliveryQuery('SELECT feedback_private.claim_notification() AS result'), deliveryQuery('SELECT feedback_private.claim_notification() AS result')]);
  const deliveries = claims.map(result => result.rows[0].result).filter(Boolean);
  assert.equal(deliveries.length, 1); const delivery = deliveries[0];
  assert.equal(delivery.recipient, 'updated-admin@example.test'); assert.equal(delivery.feedback.message, 'Une date à corriger.');
  await deliveryQuery('SELECT feedback_private.complete_notification($1,$2,true)', [delivery.id, randomUUID()]);
  assert.equal((await pool.query('SELECT status FROM feedback_private.notification_deliveries WHERE id=$1', [delivery.id])).rows[0].status, 'sending');
  await deliveryQuery('SELECT feedback_private.complete_notification($1,$2,false)', [delivery.id, delivery.lease]);
  assert.equal((await deliveryQuery('SELECT feedback_private.claim_notification() AS result')).rows[0].result, null);
  await pool.query("UPDATE feedback_private.notification_deliveries SET next_attempt_at=now()-interval '1 minute' WHERE id=$1", [delivery.id]);
  const retry = (await deliveryQuery('SELECT feedback_private.claim_notification() AS result')).rows[0].result;
  assert.notEqual(retry.lease, delivery.lease);
  await deliveryQuery('SELECT feedback_private.complete_notification($1,$2,true)', [retry.id, retry.lease]);
  assert.equal((await pool.query('SELECT status FROM feedback_private.notification_deliveries WHERE id=$1', [retry.id])).rows[0].status, 'sent');
});
test('combines subject and status before pagination, counts every match and protects filtered reads', async () => {
  await pool.query('TRUNCATE feedback_private.submissions CASCADE');
  await pool.query(`INSERT INTO feedback_private.submissions(id,token_hash,subject,message,page_url,status,created_at)
    SELECT gen_random_uuid(), repeat('a',64), CASE WHEN n <= 52 THEN 'bug' ELSE 'feature' END,
      'Filtre ' || n, 'https://universaltimeline.net/timeline?story=5', CASE WHEN n <= 51 THEN 'new' ELSE 'resolved' END,
      now() - n * interval '1 minute' FROM generate_series(1,60) n`);
  const bugs = await call('get', '/admin/feedback', { ...admin, query: { subject: 'bug' } });
  assert.equal(bugs.payload.total, 52); assert.equal(bugs.payload.items.length, 50);
  const next = await call('get', '/admin/feedback', { ...admin, query: { subject: 'bug', offset: '50' } });
  assert.equal(next.payload.total, 52); assert.equal(next.payload.items.length, 2);
  assert.ok(next.payload.items.every(item => item.subject === 'bug'));
  const combined = await call('get', '/admin/feedback', { ...admin, query: { subject: 'bug', status: 'resolved' } });
  assert.equal(combined.payload.total, 1); assert.equal(combined.payload.items[0].message, 'Filtre 52');
  const features = await call('get', '/admin/feedback', { ...admin, query: { subject: 'feature' } });
  assert.equal(features.payload.total, 8); assert.equal(features.payload.items.length, 8);
  assert.equal((await call('get', '/admin/feedback', { ...admin, query: { subject: 'unknown' } })).statusCode, 400);
  assert.equal((await call('get', '/admin/feedback', { ...admin, query: { subject: ['bug','feature'] } })).statusCode, 400);
  await assert.rejects(scoped({ userId: bob, isAdmin: false }, 'SELECT feedback_private.filtered_list(0,NULL,NULL)'), { code: '42501' });
  await pool.query('TRUNCATE feedback_private.submissions CASCADE');
});
test('only a current admin can delete the chosen feedback and its queued notifications', async () => {
  const target = submission(), other = submission();
  await call('post', '/feedback', { body: target }); await call('post', '/feedback', { body: other });
  const remove = options => call('delete', '/admin/feedback/:id', { params: { id: target.id }, ...options });
  assert.equal((await remove({})).statusCode, 401);
  assert.equal((await remove({ userId: bob, isAdmin: false })).statusCode, 403);
  assert.equal((await remove({ userId: bob, isAdmin: true })).statusCode, 403);
  await assert.rejects(scoped({ userId: bob, isAdmin: false }, 'SELECT feedback_private.delete_submission($1)', [target.id]), { code: '42501' });
  assert.equal((await remove(admin)).statusCode, 204);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM feedback_private.submissions WHERE id=$1', [target.id])).rows[0].count, 0);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM feedback_private.submissions WHERE id=$1', [other.id])).rows[0].count, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM feedback_private.notification_deliveries WHERE feedback_id=$1', [target.id])).rows[0].count, 0);
  assert.equal((await remove(admin)).statusCode, 404);
  await pool.query('DELETE FROM feedback_private.submissions WHERE id=$1', [other.id]);
});
test('only a current admin can disable feedback globally; API and SQL writes stop while history remains', async () => {
  const body = submission(); await call('post', '/feedback', { body });
  assert.deepEqual((await call('get', '/feedback/settings')).payload, { enabled: true });
  const toggle = (options, enabled = false) => call('put', '/admin/feedback/settings', { ...options, body: { enabled } });
  assert.equal((await toggle({})).statusCode, 401);
  assert.equal((await toggle({ userId: bob })).statusCode, 403);
  assert.equal((await toggle({ userId: bob, isAdmin: true })).statusCode, 403);
  assert.equal((await toggle(admin, 'false')).statusCode, 400);
  await assert.rejects(scoped({ userId: null, isAdmin: false }, 'SELECT feedback_private.set_enabled(false)'), { code: '42501' });
  const count = (await pool.query('SELECT count(*)::int AS count FROM feedback_private.submissions')).rows[0].count;
  assert.deepEqual((await toggle(admin)).payload, { enabled: false });
  assert.deepEqual((await call('get', '/feedback/settings')).payload, { enabled: false });
  assert.equal((await call('post', '/feedback', { body: submission() })).statusCode, 503);
  assert.equal((await call('post', '/feedback', { body })).statusCode, 503);
  assert.equal((await call('put', '/feedback/:id/email', { params: { id: body.id }, body: { token: body.token, email: 'user@example.test' } })).statusCode, 503);
  assert.equal((await call('get', '/admin/feedback', admin)).payload.total, count);
  assert.equal((await deliveryQuery('SELECT feedback_private.claim_notification() AS result')).rows[0].result, null);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM feedback_private.notification_deliveries WHERE status IN ('pending','sending')")).rows[0].count, 0);
  assert.deepEqual((await toggle(admin, true)).payload, { enabled: true });
  assert.equal((await call('post', '/feedback', { body: submission() })).statusCode, 201);
});
test('disabling cancels pending email, and a removed admin cannot receive queued feedback', async () => {
  await call('post', '/feedback', { body: submission() });
  assert.equal((await call('put', '/admin/feedback/notifications', { ...admin, body: { enabled: false } })).payload.enabled, false);
  assert.equal((await deliveryQuery('SELECT feedback_private.claim_notification() AS result')).rows[0].result, null);
  await scoped(admin, 'SELECT feedback_private.notification_settings(true)');
  await call('post', '/feedback', { body: submission() });
  await pool.query("UPDATE auth.users SET raw_app_meta_data='{}' WHERE id=$1", [alice]);
  assert.equal((await deliveryQuery('SELECT feedback_private.claim_notification() AS result')).rows[0].result, null);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM feedback_private.notification_deliveries WHERE status='pending'")).rows[0].count, 0);
});
