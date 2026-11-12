// Shared catalogue write guard: compiled route handlers and direct SQL under real RLS. Local disposable PostgreSQL only.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, category } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const carol = '00000000-0000-0000-0000-000000000003';
const plain = userId => ({ userId, isAdmin: false });
const editor = { userId: carol, isAdmin: false, isEditor: true };
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');

async function call(method, path, params = {}, body = {}, principal = plain(alice)) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `Missing route ${method.toUpperCase()} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send() { return this; }, set() { return this; } };
  await principalContext.run(principal, () => route.route.stack[0].handle({ body, params, query: {} }, res));
  return res;
}
/** Same access as the Data API: the caller's role and claims, arbitrary SQL. */
const sql = (principal, text, params = []) => principalContext.run(principal, () => tx(client => client.query(text, params)));
const one = async (text, params = []) => (await pool.query(text, params)).rows[0];
const eventBody = (label, extra = {}) => ({ label: { fr: label }, date: '1789-07-14', categories: [{ id: category }], tags: ['conflits'], ...extra });
const periodBody = (label, extra = {}) => ({ label: { fr: label }, start_date: '1789', end_date: '1799', categories: [], ...extra });

before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
  await pool.query(`INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data) VALUES
    ($1,'alice@example.test',now(),'{}'),($2,'bob@example.test',now(),'{}'),($3,'carol@example.test',now(),'{"role":"editor"}')`, [alice, bob, carol]);
  await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES($1,'Politique','Politics')", [category]);
});
beforeEach(async () => {
  await pool.query(`TRUNCATE stories, periods, events, story_anchors, catalogue_private.record_creators RESTART IDENTITY CASCADE;
    INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES
      ('Alice','Alice','Alice',true,'${alice}'),('Bob','Bob','Bob',false,'${bob}');
    INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES ('shared-period','Partagée','Shared','1789','1799');
    INSERT INTO events(id,label_fr,label_en,date) VALUES ('shared-event','Partagé','Shared','1789-07-14');
    INSERT INTO event_tags(event_id,tag_id,position) VALUES ('shared-event','sport',1);
    INSERT INTO story_events(story_id,event_id) VALUES (1,'shared-event')`);
});
after(() => pool.end());

test('a plain account cannot rewrite, reclassify or delete a record it did not create', async () => {
  for (const user of [alice, bob]) {
    assert.equal((await call('put', '/events/:id', { id: 'shared-event' }, eventBody('Vandalisé'), plain(user))).statusCode, 403);
    assert.equal((await call('delete', '/events/:id', { id: 'shared-event' }, {}, plain(user))).statusCode, 403);
    assert.equal((await call('put', '/periods/:id', { id: 'shared-period' }, periodBody('Vandalisée'), plain(user))).statusCode, 403);
    assert.equal((await call('delete', '/periods/:id', { id: 'shared-period' }, {}, plain(user))).statusCode, 403);
    // Bob is first told that another account's frise uses the event (409); Alice that she is not its creator.
    assert.equal((await call('post', '/events/:id/convert-to-period', { id: 'shared-event' }, periodBody('Convertie', { id: 'converted' }), plain(user))).statusCode, user === alice ? 403 : 409);
  }
  assert.equal((await one("SELECT label_fr FROM events WHERE id='shared-event'")).label_fr, 'Partagé');
  assert.equal((await one("SELECT label_fr FROM periods WHERE id='shared-period'")).label_fr, 'Partagée');
  assert.deepEqual((await pool.query("SELECT tag_id FROM event_tags WHERE event_id='shared-event'")).rows, [{ tag_id: 'sport' }]);
  assert.equal((await one('SELECT count(*)::int AS n FROM story_events')).n, 1);
});

test('direct SQL with an account role is refused the same way', async () => {
  await assert.rejects(sql(plain(bob), "UPDATE events SET label_fr='x' WHERE id='shared-event'"), { code: '42501' });
  await assert.rejects(sql(plain(bob), 'DELETE FROM events'), { code: '42501' });
  await assert.rejects(sql(plain(bob), "DELETE FROM periods WHERE id <> 'none'"), { code: '42501' });
  await assert.rejects(sql(plain(bob), "INSERT INTO event_tags(event_id,tag_id,position) VALUES('shared-event','conflits',2)"), { code: '42501' });
  assert.equal((await sql(plain(bob), "DELETE FROM event_tags WHERE event_id='shared-event'")).rowCount, 0);
  assert.equal((await sql(plain(bob), "UPDATE event_tags SET position=3 WHERE event_id='shared-event'")).rowCount, 0);
  await assert.rejects(sql(plain(bob), "SELECT * FROM catalogue_private.record_creators"), /permission denied/);
  assert.equal((await one('SELECT count(*)::int AS n FROM events')).n, 1);
});

test('a shared record can still join the frise of a plain account', async () => {
  assert.equal((await call('post', '/stories/:storyId/periods/:periodId', { storyId: '2', periodId: 'shared-period' }, {}, plain(bob))).statusCode, 201);
  assert.equal((await call('post', '/stories/:storyId/events/:eventId', { storyId: '2', eventId: 'shared-event' }, {}, plain(bob))).statusCode, 201);
  assert.equal((await one('SELECT count(*)::int AS n FROM story_periods WHERE story_id=2')).n, 1);
});

test('the creator edits and deletes its record until another account uses it', async () => {
  const created = await call('post', '/events', {}, eventBody('Brouillon', { id: 'mine' }));
  assert.equal(created.statusCode, 201);
  assert.deepEqual(await one("SELECT kind, user_id FROM catalogue_private.record_creators WHERE entity_id='mine'"), { kind: 'event', user_id: alice });
  assert.equal((await call('put', '/events/:id', { id: 'mine' }, eventBody('Corrigé', { tags: ['sport'] }))).statusCode, 200);
  assert.equal((await one("SELECT label_fr FROM events WHERE id='mine'")).label_fr, 'Corrigé');
  assert.equal((await call('put', '/events/:id', { id: 'mine' }, eventBody('Pris'), plain(bob))).statusCode, 403);

  await call('post', '/stories/:storyId/events/:eventId', { storyId: '2', eventId: 'mine' }, {}, plain(bob));
  assert.equal((await call('put', '/events/:id', { id: 'mine' }, eventBody('Trop tard'))).statusCode, 403);
  assert.equal((await call('delete', '/events/:id', { id: 'mine' })).statusCode, 403);
  assert.equal((await one("SELECT label_fr FROM events WHERE id='mine'")).label_fr, 'Corrigé');

  await pool.query("DELETE FROM story_events WHERE event_id='mine'");
  assert.equal((await call('delete', '/events/:id', { id: 'mine' })).statusCode, 204);
  assert.equal((await one("SELECT count(*)::int AS n FROM catalogue_private.record_creators")).n, 0);
});

test('the creator of a period keeps its own records editable, including conversion', async () => {
  assert.equal((await call('post', '/periods', {}, periodBody('Période', { id: 'my-period' }))).statusCode, 201);
  assert.equal((await call('put', '/periods/:id', { id: 'my-period' }, periodBody('Renommée'))).statusCode, 200);
  const converted = await call('post', '/periods/:id/convert-to-event', { id: 'my-period' }, eventBody('Devenue événement', { id: 'my-event' }));
  assert.equal(converted.statusCode, 201);
  assert.deepEqual((await pool.query('SELECT kind, entity_id FROM catalogue_private.record_creators')).rows, [{ kind: 'event', entity_id: 'my-event' }]);
});

test('an editor maintains the whole catalogue; a stale editor claim is not enough', async () => {
  assert.equal((await call('put', '/events/:id', { id: 'shared-event' }, eventBody('Relu'), editor)).statusCode, 200);
  assert.equal((await call('put', '/periods/:id', { id: 'shared-period' }, periodBody('Relue'), editor)).statusCode, 200);
  assert.equal((await call('put', '/events/:id', { id: 'shared-event' }, eventBody('Faux'), { ...plain(bob), isEditor: true })).statusCode, 403);
  assert.equal((await one("SELECT label_fr FROM events WHERE id='shared-event'")).label_fr, 'Relu');
});

test('deleting an account forgets its authorship without touching the records', async () => {
  await call('post', '/events', {}, eventBody('Orphelin', { id: 'orphan' }), plain(bob));
  await pool.query('DELETE FROM stories WHERE owner_user_id=$1; DELETE FROM auth.users WHERE id=$1'.replaceAll('$1', `'${bob}'`));
  assert.equal((await one("SELECT count(*)::int AS n FROM events WHERE id='orphan'")).n, 1);
  assert.equal((await one('SELECT count(*)::int AS n FROM catalogue_private.record_creators')).n, 0);
  await pool.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'bob@example.test',now())", [bob]);
});
