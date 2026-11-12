// Actual compiled route handlers on the reviewed baseline with real RLS. Local disposable PostgreSQL only.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, category } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
// Substitute the connection provider before importing routes; database.js must never load server/.env.
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');

async function call(path, params, body, userId = alice, method = 'post') {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `Missing route ${method.toUpperCase()} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params, query: {} }, res));
  return res;
}
const toEvent = (id, body, userId) => call('/periods/:id/convert-to-event', { id }, body, userId);
const toPeriod = (id, body, userId) => call('/events/:id/convert-to-period', { id }, body, userId);
const rows = async (sql, params = []) => (await pool.query(sql, params)).rows;
const eventBody = { id: 'ev-new', wikidata_id: 'Q10', label: { fr: 'Prise' }, date: '1789-07-14', categories: [{ id: category }] };
const periodBody = { id: 'p-new', wikidata_id: 'Q20', label: { fr: 'Terreur' }, start_date: '1793-09-05', end_date: '1794-07-28', categories: [] };

before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
  await pool.query('INSERT INTO auth.users(id) VALUES($1),($2)', [alice, bob]);
  await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES($1,'Politique','Politics')", [category]);
});
beforeEach(async () => {
  await pool.query(`TRUNCATE stories, periods, events, story_anchors RESTART IDENTITY CASCADE;
    INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES
      ('Révolution','Revolution','Alice',true,'${alice}'),('Détail','Detail','Alice',false,'${alice}'),('Bob','Bob','Bob',false,'${bob}');
    INSERT INTO periods(id,wikidata_id,label_fr,label_en,start_date,end_date) VALUES
      ('root','Q1','Révolution','Revolution','1789-05-05','1799-11-09'),('bastille','Q10','Bastille','Bastille','1789-07-14','1789-07-15'),
      ('child','Q2','Enfant','Child','1789-07-14','1789-07-15'),('alone','Q3','Seule','Alone','1790','1791');
    INSERT INTO events(id,wikidata_id,label_fr,label_en,date) VALUES('terror','Q20','Terreur','Terror','1793-09-05'),('varennes',NULL,'Varennes','Varennes','1791-06-21');
    INSERT INTO story_periods(story_id,period_id,parent_period_id) VALUES(1,'root',NULL),(1,'bastille','root'),(2,'bastille',NULL),(2,'child','bastille'),(3,'alone',NULL);
    INSERT INTO story_events(story_id,event_id,importance) VALUES(1,'terror','major'),(3,'varennes','normal');
    UPDATE stories SET parent_story_id=1 WHERE id=2;
    INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES(2,'event','terror');
    INSERT INTO story_entry_points(source_story_id,target_story_id,event_id) VALUES(1,2,'terror');`);
  // Alice created the records of this catalogue: only a creator (or an editor) may convert one.
  await pool.query(`TRUNCATE catalogue_private.record_creators;
    INSERT INTO catalogue_private.record_creators(kind,entity_id,user_id)
      SELECT 'period', id, '${alice}'::uuid FROM periods UNION ALL SELECT 'event', id, '${alice}'::uuid FROM events`);
});
after(() => pool.end());

test('refuses a period with sub-periods in a frise, without writing anything', async () => {
  const res = await toEvent('bastille', eventBody);
  assert.equal(res.statusCode, 409);
  assert.match(res.payload.error, /sous-périodes dans 1 frise/);
  assert.equal((await rows("SELECT count(*)::int n FROM events WHERE id='ev-new'"))[0].n, 0);
  assert.equal((await rows("SELECT count(*)::int n FROM story_periods WHERE period_id='bastille'"))[0].n, 2);
});

test('moves every membership, entry point and anchor of a period to the new event and deletes the period', async () => {
  await pool.query("DELETE FROM story_periods WHERE period_id='child'");
  await pool.query("INSERT INTO story_entry_points(source_story_id,target_story_id,period_id) VALUES(1,2,'bastille')");
  await pool.query("INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES(2,'period','bastille')");
  const res = await toEvent('bastille', eventBody);
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.id, 'ev-new');
  assert.equal(res.payload.stories, 2);
  assert.deepEqual(res.payload.categories.map(c => c.id), [category]);
  assert.equal((await rows("SELECT count(*)::int n FROM periods WHERE id='bastille'"))[0].n, 0);
  assert.deepEqual(await rows("SELECT story_id, importance FROM story_events WHERE event_id='ev-new' ORDER BY story_id"), [{ story_id: 1, importance: 'normal' }, { story_id: 2, importance: 'normal' }]);
  assert.deepEqual(await rows("SELECT source_story_id, target_story_id FROM story_entry_points WHERE event_id='ev-new'"), [{ source_story_id: 1, target_story_id: 2 }]);
  assert.deepEqual(await rows("SELECT story_id FROM story_anchors WHERE anchor_type='event' AND anchor_id='ev-new'"), [{ story_id: 2 }]);
  assert.equal((await rows("SELECT count(*)::int n FROM story_anchors WHERE anchor_type='period' AND anchor_id='bastille'"))[0].n, 0);
});

test('turns an event into a root period of each frise and keeps its entry points and anchors', async () => {
  const res = await toPeriod('terror', periodBody);
  assert.equal(res.statusCode, 201);
  assert.equal((await rows("SELECT count(*)::int n FROM events WHERE id='terror'"))[0].n, 0);
  assert.deepEqual(await rows("SELECT story_id, parent_period_id FROM story_periods WHERE period_id='p-new'"), [{ story_id: 1, parent_period_id: null }]);
  assert.deepEqual(await rows("SELECT source_story_id, target_story_id FROM story_entry_points WHERE period_id='p-new'"), [{ source_story_id: 1, target_story_id: 2 }]);
  assert.deepEqual(await rows("SELECT story_id FROM story_anchors WHERE anchor_type='period' AND anchor_id='p-new'"), [{ story_id: 2 }]);
});

test('preserves a derived fact identity and original date precision in both conversion directions', async () => {
  const source = { qid: 'Q5593', property: 'P69', statementId: 'Q5593$11111111-1111-4111-8111-111111111111', references: 2, start: [{ time: '+00000001793-01-01T00:00:00Z', precision: 9 }] };
  const key = `fact:Q5593:P69:${source.statementId.toLowerCase()}`;
  await pool.query("UPDATE events SET wikidata_id=NULL, source_key=$1, wikidata_source=$2 WHERE id='terror'", [key, source]);
  const period = await toPeriod('terror', { ...periodBody, wikidata_id: null });
  assert.equal(period.statusCode, 201);
  assert.equal(period.payload.source_key, key);
  assert.deepEqual(period.payload.wikidata_source, source);
  assert.equal(period.payload.wikidata_id, null);
  const edited = await call('/periods/:id', { id: 'p-new' }, { ...periodBody, wikidata_id: null, label: { fr: 'Fait corrigé' } }, alice, 'put');
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.payload.label_fr, 'Fait corrigé');
  assert.deepEqual(edited.payload.wikidata_source, source);
  const event = await toEvent('p-new', { ...eventBody, wikidata_id: null });
  assert.equal(event.statusCode, 201);
  assert.equal(event.payload.source_key, key);
  assert.deepEqual(event.payload.wikidata_source, source);
  assert.deepEqual((await rows("SELECT source_key, wikidata_source, wikidata_id FROM events WHERE id='ev-new'"))[0], { source_key: key, wikidata_source: source, wikidata_id: null });
  assert.equal((await rows("SELECT count(*)::int n FROM story_events WHERE event_id='ev-new'"))[0].n, 1);
});

test('refuses a record used by a private frise of another account that RLS hides from the caller', async () => {
  const period = await toEvent('alone', { ...eventBody, wikidata_id: 'Q3' });
  assert.equal(period.statusCode, 409);
  assert.match(period.payload.error, /1 frise\(s\) d’autres comptes/);
  const event = await toPeriod('varennes', { ...periodBody, wikidata_id: 'Q30' });
  assert.equal(event.statusCode, 409);
  assert.equal((await rows("SELECT count(*)::int n FROM story_periods WHERE story_id=3 AND period_id='alone'"))[0].n, 1);
  assert.equal((await rows("SELECT count(*)::int n FROM story_events WHERE story_id=3 AND event_id='varennes'"))[0].n, 1);
});

test('refuses a period shown in a chronological view', async () => {
  await pool.query("DELETE FROM story_periods WHERE period_id='child'");
  await pool.query("INSERT INTO story_period_presentations VALUES(1,'bastille',2)");
  const res = await toEvent('bastille', eventBody);
  assert.equal(res.statusCode, 409);
  assert.match(res.payload.error, /parcours chronologique/);
});

test('rolls back the whole conversion when the new Q-id already exists for the target type', async () => {
  await pool.query("DELETE FROM story_periods WHERE period_id='child'");
  await pool.query("INSERT INTO events(id,wikidata_id,label_fr,label_en,date) VALUES('dup','Q10','Doublon','Duplicate','1789')");
  const res = await toEvent('bastille', eventBody);
  assert.equal(res.statusCode, 409);
  assert.equal((await rows("SELECT count(*)::int n FROM story_periods WHERE period_id='bastille'"))[0].n, 2);
});

test('refuses anonymous callers and unknown records', async () => {
  assert.equal((await toEvent('root', eventBody, null)).statusCode, 403);
  assert.equal((await toPeriod('missing', periodBody)).statusCode, 404);
});
