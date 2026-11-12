// Wikipedia titles: migration on an existing catalogue, HTTP writes, conversion, reads and the reviewed
// backfill script. Actual compiled route handlers with real RLS. Local disposable PostgreSQL only.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const baseline = await read('../../database/baseline/application.sql');
const migration = await read('../../database/migrations/20261106100000_wikipedia_titles.sql');
const tagMigration = await read('../../database/migrations/20261108120000_taxonomy_tags.sql');
const backfill = await read('../../database/data/20261106_wikipedia_titles.sql');
const rollback = await read('../../database/data/20261106_wikipedia_titles_rollback.sql');
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');

async function call(method, path, params = {}, body = {}, userId = alice) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `Missing route ${method.toUpperCase()} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params, query: {} }, res));
  return res;
}
const rows = async (sql, params = []) => (await pool.query(sql, params)).rows;
const titlesOf = async (table, id) => (await rows(`SELECT wikipedia_title_fr fr, wikipedia_title_en en FROM ${table} WHERE id=$1`, [id]))[0];
const periodBody = { wikidata_id: 'Q6534', label: { fr: 'Révolution française' }, start_date: '1789-05-05', end_date: '1799-11-09', categories: [] };
const eventBody = { wikidata_id: 'Q2', label: { fr: 'Prise de la Bastille' }, date: '1789-07-14', categories: [] };

const snapshot = async () => (await pool.query("SELECT to_jsonb(e) data FROM events e UNION ALL SELECT to_jsonb(p) FROM periods p ORDER BY 1")).rows;
const policies = async () => (await pool.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
const migrated = {};
before(async () => {
  await pool.query(authFixture);
  // Existing catalogue before the migration: the slice stops at the new section of the baseline.
  await pool.query(baseline.slice(0, baseline.indexOf('-- Wikipedia article titles')));
  await pool.query('INSERT INTO auth.users(id) VALUES($1)', [alice]);
  await pool.query("INSERT INTO events(id,wikidata_id,label_fr,label_en,date) VALUES('existing-event','Q1','Conservé','Preserved','1900'); INSERT INTO periods(id,wikidata_id,label_fr,label_en,start_date,end_date) VALUES('existing-period','Q2','Ancien','Existing','1800','1900')");
  Object.assign(migrated, { beforeRows: await snapshot(), beforePolicies: await policies() });
  await pool.query(migration);
  Object.assign(migrated, { afterRows: await snapshot(), afterPolicies: await policies() });
  await pool.query(tagMigration);
  // Later migrations the compiled API relies on: split write policies, then the shared catalogue guard.
  await pool.query(await read('../../database/migrations/20261110103843_performance_read_policies.sql'));
  await pool.query(await read('../../database/migrations/20261112090000_catalogue_write_guard.sql'));
});
after(() => pool.end());

test('adds nullable title columns to an existing catalogue without changing its records or policies', async () => {
  const afterRows = migrated.afterRows.map(({ data }) => {
    assert.equal(data.wikipedia_title_fr, null); assert.equal(data.wikipedia_title_en, null);
    const { wikipedia_title_fr, wikipedia_title_en, ...rest } = data; return { data: rest };
  });
  assert.equal(afterRows.length, 2);
  assert.deepEqual(afterRows, migrated.beforeRows);
  assert.deepEqual(migrated.afterPolicies, migrated.beforePolicies);
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('check','Contrôle','Check','1800','1900')");
  for (const title of ['', ' Espace', 'Avec_tiret_bas', 'Crochet [x]', 'Ancre#section', 'x'.repeat(256), 'Ligne\nsuivante']) {
    await assert.rejects(pool.query("UPDATE periods SET wikipedia_title_fr=$1 WHERE id='check'", [title]), { code: '23514' }, JSON.stringify(title));
  }
  await pool.query("UPDATE periods SET wikipedia_title_fr='Révolution française', wikipedia_title_en='C++ (langage)' WHERE id='check'");
});

beforeEach(async () => {
  await pool.query("TRUNCATE stories, periods, events, story_anchors RESTART IDENTITY CASCADE");
  await pool.query("INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES('Révolution','Revolution','Alice',true,$1)", [alice]);
});

test('stores titles at creation, keeps them when an update omits them and clears them on null', async () => {
  const created = await call('post', '/periods', {}, { ...periodBody, id: 'rev', wikipedia: { fr: 'Révolution_française', en: ' French Revolution ' } });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(await titlesOf('periods', 'rev'), { fr: 'Révolution française', en: 'French Revolution' });
  assert.equal((await call('put', '/periods/:id', { id: 'rev' }, { ...periodBody, label: { fr: 'Révolution' } })).statusCode, 200);
  assert.deepEqual(await titlesOf('periods', 'rev'), { fr: 'Révolution française', en: 'French Revolution' });
  assert.equal((await call('put', '/periods/:id', { id: 'rev' }, { ...periodBody, wikipedia: { fr: null, en: 'French Revolution' } })).statusCode, 200);
  assert.deepEqual(await titlesOf('periods', 'rev'), { fr: null, en: 'French Revolution' });

  assert.equal((await call('post', '/events', {}, { ...eventBody, id: 'bastille', wikipedia: { fr: 'Prise de la Bastille' } })).statusCode, 201);
  assert.equal((await call('put', '/events/:id', { id: 'bastille' }, eventBody)).statusCode, 200);
  assert.deepEqual(await titlesOf('events', 'bastille'), { fr: 'Prise de la Bastille', en: null });
  assert.equal((await call('put', '/events/:id', { id: 'bastille' }, { ...eventBody, wikipedia: null })).statusCode, 200);
  assert.deepEqual(await titlesOf('events', 'bastille'), { fr: null, en: null });
});

test('refuses an invalid title before SQL', async () => {
  const res = await call('post', '/events', {}, { ...eventBody, id: 'bad', wikipedia: { fr: 'Titre#ancre' } });
  assert.equal(res.statusCode, 400);
  assert.equal((await rows("SELECT count(*)::int n FROM events WHERE id='bad'"))[0].n, 0);
});

test('reads titles in the catalogue, the record detail and the frise detail', async () => {
  await call('post', '/periods', {}, { ...periodBody, id: 'rev', wikipedia: { fr: 'Révolution française', en: 'French Revolution' } });
  await call('post', '/events', {}, { ...eventBody, id: 'bastille' });
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES(1,'rev'); INSERT INTO story_events(story_id,event_id) VALUES(1,'bastille')");
  const expected = { fr: 'Révolution française', en: 'French Revolution' };
  assert.deepEqual((await call('get', '/periods')).payload.find(period => period.id === 'rev').wikipedia, expected);
  assert.deepEqual((await call('get', '/periods/:id', { id: 'rev' })).payload.wikipedia, expected);
  const story = (await call('get', '/stories/:id', { id: '1' })).payload;
  assert.deepEqual(story.periods.find(period => period.id === 'rev').wikipedia, expected);
  assert.deepEqual(story.events.find(event => event.id === 'bastille').wikipedia, { fr: null, en: null });
  assert.deepEqual((await call('get', '/events')).payload.find(event => event.id === 'bastille').wikipedia, { fr: null, en: null });
});

test('a conversion keeps the titles of the record unless the form submits its own', async () => {
  await pool.query("INSERT INTO periods(id,wikidata_id,label_fr,label_en,start_date,end_date,wikipedia_title_fr,wikipedia_title_en) VALUES('bastille','Q10','Bastille','Bastille','1789-07-14','1789-07-15','Prise de la Bastille','Storming of the Bastille')");
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES(1,'bastille')");
  await pool.query("INSERT INTO catalogue_private.record_creators(kind,entity_id,user_id) VALUES('period','bastille',$1)", [alice]);
  const event = await call('post', '/periods/:id/convert-to-event', { id: 'bastille' }, { ...eventBody, id: 'ev', wikidata_id: 'Q10' });
  assert.equal(event.statusCode, 201);
  assert.deepEqual(await titlesOf('events', 'ev'), { fr: 'Prise de la Bastille', en: 'Storming of the Bastille' });
  const period = await call('post', '/events/:id/convert-to-period', { id: 'ev' }, { ...periodBody, id: 'p', wikidata_id: 'Q10', wikipedia: { fr: 'Bastille', en: null } });
  assert.equal(period.statusCode, 201);
  assert.deepEqual(await titlesOf('periods', 'p'), { fr: 'Bastille', en: null });
});

test('the reviewed backfill fills only rows without titles, never derived facts, and its rollback restores them', async () => {
  const source = { qid: 'Q6534', property: 'P793', statementId: 'Q6534$11111111-1111-4111-8111-111111111111', references: 1 };
  await pool.query(`INSERT INTO periods(id,wikidata_id,label_fr,label_en,start_date,end_date,wikipedia_title_fr) VALUES
      ('rev','Q6534','Révolution','Revolution','1789','1799',NULL),('earth','Q2','Terre','Earth','G4.5','NOW','Titre manuel'),('none','Q999999999','Sans','None','1900','1901',NULL);
    INSERT INTO events(id,wikidata_id,label_fr,label_en,date) VALUES('universe','Q1','Univers','Universe','G13.8')`);
  await pool.query("INSERT INTO events(id,wikidata_id,label_fr,label_en,date,source_key,wikidata_source) VALUES('fact',NULL,'Fait','Fact','1790',$1,$2)",
    [`fact:Q6534:P793:${source.statementId.toLowerCase()}`, source]);
  await pool.query(backfill);
  assert.deepEqual(await titlesOf('periods', 'rev'), { fr: 'Révolution française', en: 'French Revolution' });
  assert.deepEqual(await titlesOf('periods', 'earth'), { fr: 'Titre manuel', en: null });
  assert.deepEqual(await titlesOf('periods', 'none'), { fr: null, en: null });
  assert.deepEqual(await titlesOf('events', 'universe'), { fr: 'Univers', en: 'Universe' });
  assert.deepEqual(await titlesOf('events', 'fact'), { fr: null, en: null });
  await pool.query(rollback);
  assert.deepEqual(await titlesOf('periods', 'rev'), { fr: null, en: null });
  assert.deepEqual(await titlesOf('periods', 'earth'), { fr: 'Titre manuel', en: null });
  assert.deepEqual(await titlesOf('events', 'universe'), { fr: null, en: null });
});
