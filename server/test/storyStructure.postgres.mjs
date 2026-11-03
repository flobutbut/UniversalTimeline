// Frise architecture rules on the real baseline (RLS, composite keys). Disposable local PostgreSQL only.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, category, applicationTables } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';
const pool = testPool();
const scoped = (principal, fn) => runInTransaction(pool, async c => { await applyPrincipal(c, principal); return fn(c); });
const tx = fn => scoped(principalContext.getStore() ?? { userId: null, isAdmin: false }, fn);
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: { withTransaction: tx, query: (sql, params) => tx(c => c.query(sql, params)) } });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, { body = {}, params = {}, userId = alice } = {}) {
  const route = router.stack.find(l => l.route?.path === path && l.route.methods[method]); assert.ok(route, path);
  const principal = { userId, isAdmin: false };
  const res = { locals: { principal }, statusCode: 200, payload: undefined, status(n) { this.statusCode = n; return this; }, json(v) { this.payload = v; return this; }, send() { return this; } };
  await principalContext.run(principal, () => route.route.stack[0].handle({ body, params, query: {} }, res)); return res;
}
const rows = async (sql, params = []) => (await pool.query(sql, params)).rows;
const memberships = storyId => rows('SELECT period_id, parent_period_id FROM story_periods WHERE story_id=$1 ORDER BY period_id', [storyId]);

before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await pool.query(`TRUNCATE ${applicationTables.map(t => 'public.' + t).join(',')} RESTART IDENTITY CASCADE`); await pool.query('DELETE FROM auth.users');
  for (const [id, name] of [[alice, 'Alice'], [bob, 'Bob']]) await pool.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),$3)", [id, name + '@example.test', { username: name }]);
  await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES($1,'Catégorie','Category')", [category]);
  await pool.query(`
    INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES
      ('p','Période','Period','1000','1500'),('b1','Début','Early','1000','1200'),('b11','Détail','Detail','1050','1100'),
      ('b2','Fin','Late','1200','1500'),('q','Autre','Other','1500','1800');
    INSERT INTO events(id,label_fr,label_en,date) VALUES ('inside','Dedans','Inside','1100'),('outside','Dehors','Outside','1600');
    INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id,parent_story_id) VALUES
      ('Source','Source','Alice',true,'${alice}',NULL),('Enfant','Child','Alice',true,'${alice}',1),('Thème','Theme','Alice',true,'${alice}',NULL),
      ('Parcours','Path','Alice',true,'${alice}',NULL),('Bob','Bob','Bob',true,'${bob}',NULL);
    INSERT INTO story_periods(story_id,period_id,parent_period_id) VALUES
      (1,'p',NULL),(1,'b1','p'),(1,'b11','b1'),(1,'b2','p'),(1,'q',NULL),(2,'b1',NULL),(3,'b2',NULL),(4,'b1',NULL),(5,'b2',NULL);
    INSERT INTO story_events(story_id,event_id) VALUES (1,'inside'),(1,'outside');
    INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','b1'),(2,'period','q');
    INSERT INTO story_entry_points(source_story_id,target_story_id,period_id) VALUES (1,3,'b2');
    INSERT INTO story_period_presentations VALUES (4,'b1',1);`);
});
after(() => pool.end());

test('creating a frise from a period moves its sub-periods and the links that target them', async () => {
  const result = await call('post', '/stories/:storyId/from-period', { params: { storyId: '1' }, body: { periodId: 'p', title: 'Détail' } });
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.payload, { id: '6', parentStoryId: '1', periodId: 'p', periodCount: 4, eventCount: 1, movedPeriodCount: 3, linkedStoryCount: 3 });
  // The source keeps the period as anchor, without its structure.
  assert.deepEqual(await memberships(1), [{ period_id: 'p', parent_period_id: null }, { period_id: 'q', parent_period_id: null }]);
  assert.deepEqual(await memberships(6), [
    { period_id: 'b1', parent_period_id: 'p' }, { period_id: 'b11', parent_period_id: 'b1' }, { period_id: 'b2', parent_period_id: 'p' }, { period_id: 'p', parent_period_id: null }]);
  assert.deepEqual(await rows('SELECT event_id FROM story_events WHERE story_id IN (1,6) ORDER BY story_id, event_id'), [{ event_id: 'inside' }, { event_id: 'outside' }, { event_id: 'inside' }]);
  // The anchored child follows its period; its anchor outside the new parent stays reachable as an entry point.
  assert.deepEqual(await rows('SELECT parent_story_id FROM stories WHERE id=2'), [{ parent_story_id: 6 }]);
  assert.deepEqual(await rows('SELECT anchor_id FROM story_anchors WHERE story_id=2 ORDER BY anchor_id'), [{ anchor_id: 'b1' }]);
  assert.deepEqual(await rows('SELECT source_story_id, target_story_id, period_id FROM story_entry_points ORDER BY source_story_id, target_story_id'), [
    { source_story_id: 1, target_story_id: 2, period_id: 'q' }, { source_story_id: 6, target_story_id: 3, period_id: 'b2' }]);
  assert.deepEqual(await rows('SELECT * FROM story_period_presentations ORDER BY context_story_id'), [
    { context_story_id: 1, period_id: 'p', target_story_id: 6 }, { context_story_id: 4, period_id: 'b1', target_story_id: 6 }]);
  assert.deepEqual(await rows('SELECT anchor_type, anchor_id FROM story_anchors WHERE story_id=6'), [{ anchor_type: 'period', anchor_id: 'p' }]);
});
test('a link to another account’s frise refuses the creation and changes nothing', async () => {
  await pool.query("INSERT INTO story_entry_points(source_story_id,target_story_id,period_id) VALUES (1,5,'b2')");
  const before = await rows('SELECT count(*)::int n FROM stories');
  const result = await call('post', '/stories/:storyId/from-period', { params: { storyId: '1' }, body: { periodId: 'p', title: 'Détail' } });
  assert.equal(result.statusCode, 409);
  assert.deepEqual(await rows('SELECT count(*)::int n FROM stories'), before);
  assert.equal((await memberships(1)).length, 5);
});
test('a leaf period is copied without moving anything', async () => {
  const result = await call('post', '/stories/:storyId/from-period', { params: { storyId: '1' }, body: { periodId: 'q', title: 'Feuille' } });
  assert.equal(result.statusCode, 201);
  assert.equal(result.payload.movedPeriodCount, 0);
  assert.equal((await memberships(1)).length, 5);
});
