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
  assert.deepEqual(result.payload, { id: '6', parentStoryId: '1', periodId: 'p', periodCount: 3, eventCount: 1, movedPeriodCount: 3, linkedStoryCount: 2 });
  // The source keeps the period as anchor, without its structure.
  assert.deepEqual(await memberships(1), [{ period_id: 'p', parent_period_id: null }, { period_id: 'q', parent_period_id: null }]);
  assert.deepEqual(await memberships(6), [
    { period_id: 'b1', parent_period_id: null }, { period_id: 'b11', parent_period_id: 'b1' }, { period_id: 'b2', parent_period_id: null }]);
  assert.deepEqual(await rows('SELECT event_id FROM story_events WHERE story_id IN (1,6) ORDER BY story_id, event_id'), [{ event_id: 'inside' }, { event_id: 'outside' }, { event_id: 'inside' }]);
  // The anchored child follows its period; its anchor outside the new parent stays reachable as an entry point.
  assert.deepEqual(await rows('SELECT parent_story_id FROM stories WHERE id=2'), [{ parent_story_id: 6 }]);
  assert.deepEqual(await rows('SELECT anchor_id FROM story_anchors WHERE story_id=2 ORDER BY anchor_id'), [{ anchor_id: 'b1' }]);
  assert.deepEqual(await rows('SELECT source_story_id, target_story_id, period_id FROM story_entry_points ORDER BY source_story_id, target_story_id'), [
    { source_story_id: 1, target_story_id: 2, period_id: 'q' }, { source_story_id: 6, target_story_id: 3, period_id: 'b2' }]);
  assert.deepEqual(await rows('SELECT * FROM story_period_presentations ORDER BY context_story_id'), [
    { context_story_id: 1, period_id: 'p', target_story_id: 6 }, { context_story_id: 4, period_id: 'b1', target_story_id: 1 }]);
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
test('a leaf period remains in its source without adding a wrapper to the new narrative', async () => {
  const result = await call('post', '/stories/:storyId/from-period', { params: { storyId: '1' }, body: { periodId: 'q', title: 'Feuille' } });
  assert.equal(result.statusCode, 201);
  assert.equal(result.payload.movedPeriodCount, 0);
  assert.equal(result.payload.periodCount, 0);
  assert.deepEqual(await memberships(Number(result.payload.id)), []);
  assert.equal((await memberships(1)).length, 5);
});

const storyBody = extra => ({ title: { fr: 'Nouvelle' }, categories: [{ id: category }], ...extra });
test('a new frise is created with its parent and anchor in one transaction', async () => {
  const created = await call('post', '/stories', { body: storyBody({ isPublic: true, parentStoryId: '1', anchor: { anchorType: 'period', anchorId: 'q' } }) });
  assert.equal(created.statusCode, 201);
  assert.equal(created.payload.parent_story_id, 1);
  assert.deepEqual(await rows('SELECT parent_story_id, is_public FROM stories WHERE id=$1', [created.payload.id]), [{ parent_story_id: 1, is_public: true }]);
  assert.deepEqual(await rows('SELECT anchor_type, anchor_id FROM story_anchors WHERE story_id=$1', [created.payload.id]), [{ anchor_type: 'period', anchor_id: 'q' }]);
});
test('a new frise refuses an anchor outside its parent, or without a parent, and creates nothing', async () => {
  const before = await rows('SELECT count(*)::int n FROM stories');
  assert.equal((await call('post', '/stories', { body: storyBody({ parentStoryId: '3', anchor: { anchorType: 'period', anchorId: 'q' } }) })).statusCode, 409);
  assert.equal((await call('post', '/stories', { body: storyBody({ anchor: { anchorType: 'period', anchorId: 'q' } }) })).statusCode, 400);
  assert.equal((await call('post', '/stories', { body: storyBody({ parentStoryId: '5' }), userId: alice })).statusCode, 404);
  assert.deepEqual(await rows('SELECT count(*)::int n FROM stories'), before);
});
test('a frise can be created public or published later without a parent', async () => {
  const created = await call('post', '/stories', { body: storyBody({ isPublic: true }) });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(await rows('SELECT parent_story_id, is_public FROM stories WHERE id=$1', [created.payload.id]), [{ parent_story_id: null, is_public: true }]);
  const draft = await call('post', '/stories', { body: storyBody({ isPublic: false }) });
  assert.equal(draft.statusCode, 201);
  assert.equal((await call('put', '/stories/:id', { params: { id: String(draft.payload.id) }, body: storyBody({ isPublic: true }) })).statusCode, 200);
  assert.deepEqual(await rows('SELECT is_public FROM stories WHERE id=$1', [draft.payload.id]), [{ is_public: true }]);
});

test('a manual period and event can be created without Q-ids, then attached to an empty frise', async () => {
  const created = await call('post', '/stories', { body: storyBody({ isPublic: true }) });
  assert.equal(created.statusCode, 201);
  const storyId = String(created.payload.id);
  const period = await call('post', '/periods', { body: { id: 'manual-period', label: { fr: 'Mon projet' }, start_date: '2000', end_date: '2001' } });
  assert.equal(period.statusCode, 201);
  assert.equal(period.payload.wikidata_id, null);
  const edited = await call('put', '/periods/:id', { params: { id: 'manual-period' }, body: { label: { fr: 'Mon projet renommé' }, start_date: '2000', end_date: '2002' } });
  assert.equal(edited.statusCode, 200);
  const event = await call('post', '/events', { body: { id: 'manual-event', label: { fr: 'Premier souvenir' }, date: '2000-06-01' } });
  assert.equal(event.statusCode, 201);
  assert.equal(event.payload.wikidata_id, null);
  assert.equal((await call('post', '/stories/:storyId/periods', { params: { storyId }, body: { ids: ['manual-period'], operation: 'add', parentPeriodId: null } })).statusCode, 200);
  assert.equal((await call('post', '/stories/:storyId/events', { params: { storyId }, body: { ids: ['manual-event'], operation: 'add' } })).statusCode, 200);
  assert.deepEqual(await memberships(Number(storyId)), [{ period_id: 'manual-period', parent_period_id: null }]);
  assert.deepEqual(await rows('SELECT event_id FROM story_events WHERE story_id=$1', [storyId]), [{ event_id: 'manual-event' }]);
});

test('the personal category seed is replayable and selectable on a frise', async () => {
  const seed = await readFile(new URL('../../database/data/20261105_personal_category.sql', import.meta.url), 'utf8');
  await pool.query(seed); await pool.query(seed);
  assert.deepEqual(await rows("SELECT id, label_fr FROM categories WHERE id='CAT_PERSONAL'"), [{ id: 'CAT_PERSONAL', label_fr: 'Personnelle' }]);
  const created = await call('post', '/stories', { body: storyBody({ categories: [{ id: 'CAT_PERSONAL' }] }) });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(await rows('SELECT category_id FROM story_categories WHERE story_id=$1', [created.payload.id]), [{ category_id: 'CAT_PERSONAL' }]);
});
