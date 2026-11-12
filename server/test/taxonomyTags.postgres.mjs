// Thematic tags: additive migration on an existing catalogue, tag model limits and real RLS.
// Local disposable PostgreSQL only.
import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const baseline = await read('../../database/baseline/application.sql');
const migration = await read('../../database/migrations/20261108120000_taxonomy_tags.sql');
const tables = ['categories', 'event_categories', 'period_categories', 'story_categories', 'events', 'periods', 'stories'];
const rowsOf = async table => (await pool.query(`SELECT to_jsonb(t) AS data FROM public.${table} t ORDER BY to_jsonb(t)::text`)).rows.map(row => row.data);
const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, await rowsOf(table)])));
const policies = async prefix => (await pool.query('SELECT * FROM pg_policies WHERE schemaname=$1 AND policyname LIKE $2 ORDER BY tablename,policyname', ['public', prefix])).rows;
const claims = (sub, extra = {}) => ({ sub, role: 'authenticated', ...extra });
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, { params = {}, body = {}, query = {} } = {}, userId = alice) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `Missing route ${method.toUpperCase()} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params, query }, res));
  return res;
}
const ids = entity => entity.tags.map(tag => tag.id);
const eventBody = (id, extra = {}) => ({ id, label: { fr: id }, date: '1789-07-14', ...extra });
const periodBody = (id, extra = {}) => ({ id, label: { fr: id }, start_date: '1789-05-05', end_date: '1799-11-09', ...extra });

async function as(role, jwt, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt ?? {})]);
    await client.query(`SET LOCAL ROLE ${role}`);
    return await operation(client);
  } finally { await client.query('ROLLBACK'); client.release(); }
}

let publicStory; let privateStory;
const state = {};
before(async () => {
  await pool.query(authFixture);
  await pool.query(baseline.slice(0, baseline.indexOf('-- Closed thematic tag grid')) + 'COMMIT;');
  await pool.query('INSERT INTO auth.users(id) VALUES($1),($2)', [alice, bob]);
  await pool.query(`
    INSERT INTO categories(id,label_fr,label_en) VALUES('CAT_HIST','Histoire','History');
    INSERT INTO events(id,label_fr,label_en,date) VALUES('event-a','Conservé','Kept','1900');
    INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('period-a','Conservée','Kept','1800','1900');
    INSERT INTO event_categories(event_id,category_id) VALUES('event-a','CAT_HIST');
    INSERT INTO period_categories(period_id,category_id) VALUES('period-a','CAT_HIST');
  `);
  const stories = await pool.query("INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES('Publique','Public','Alice',true,$1),('Privée','Private','Alice',false,$1) RETURNING id", [alice]);
  [publicStory, privateStory] = stories.rows.map(row => row.id);
  await pool.query('INSERT INTO story_categories(story_id,category_id) VALUES($1,$2)', [publicStory, 'CAT_HIST']);
  Object.assign(state, { before: await snapshot(), beforePolicies: await policies('%') });
  await pool.query(migration);
  Object.assign(state, { after: await snapshot(), afterPolicies: await policies('%') });
  // Later migrations the compiled API relies on: split write policies, then the shared catalogue guard.
  await pool.query(await read('../../database/migrations/20261110103843_performance_read_policies.sql'));
  await pool.query(await read('../../database/migrations/20261112090000_catalogue_write_guard.sql'));
});
after(() => pool.end());

test('leaves every existing record and policy unchanged, apart from the new period flag', () => {
  const { after: migrated } = state;
  assert.ok(migrated.periods.every(row => row.non_thematic === false));
  migrated.periods.forEach(row => delete row.non_thematic);
  assert.deepEqual(migrated, state.before);
  const newTables = new Set(['tags', 'event_tags', 'period_tags', 'story_tags']);
  assert.deepEqual(state.afterPolicies.filter(policy => !newTables.has(policy.tablename)), state.beforePolicies);
});

test('keeps the 21 ut_ policies required by the production schema check', async () => {
  assert.equal((await policies('ut_%')).length, 21);
});

test('seeds the closed grid of 16 first-level tags in three display families', async () => {
  const { rows } = await pool.query('SELECT id, family, parent_id, taxonomy_version FROM tags ORDER BY position');
  assert.deepEqual(rows.map(row => row.id), [
    'cosmos', 'terre', 'vivant', 'peuplement-societe', 'pouvoir-institutions', 'conflits', 'economie-echanges',
    'territoires-exploration', 'sante-corps', 'catastrophes', 'techniques-inventions', 'sciences-savoirs',
    'philosophie-ideologies', 'religions-spiritualites', 'arts-culture-loisirs', 'sport',
  ]);
  const count = family => rows.filter(row => row.family === family).length;
  assert.deepEqual([count('monde-vivant'), count('societes'), count('productions')], [3, 7, 6]);
  assert.ok(rows.every(row => row.parent_id === null && row.taxonomy_version === 1));
});

test('allows three ranked tags per record and refuses anything else', async () => {
  const add = (tag, position, id = 'event-a') => pool.query('INSERT INTO event_tags(event_id,tag_id,position) VALUES($1,$2,$3)', [id, tag, position]);
  await add('conflits', 1); await add('pouvoir-institutions', 2);
  await assert.rejects(add('conflits', 3), /event_tags_pkey/);
  await assert.rejects(add('inconnu', 3), /foreign key/);
  await add('peuplement-societe', 3);
  await assert.rejects(add('sport', 4), /check/);
  await assert.rejects(add('sport', 3), /event_tags_event_id_position_key/);
  await assert.rejects(pool.query("DELETE FROM tags WHERE id='conflits'"), /foreign key/);
  await pool.query('DELETE FROM event_tags');
});

test('removes tag links with their record and keeps legacy links independent', async () => {
  await pool.query("INSERT INTO events(id,label_fr,label_en,date) VALUES('event-b','Éphémère','Temporary','1901')");
  await pool.query("INSERT INTO event_tags(event_id,tag_id,position) VALUES('event-b','sport',1),('event-a','sport',1)");
  await pool.query("DELETE FROM events WHERE id='event-b'");
  assert.equal((await pool.query("SELECT count(*)::int n FROM event_tags WHERE event_id='event-b'")).rows[0].n, 0);
  await pool.query("DELETE FROM event_categories WHERE event_id='event-a'");
  assert.equal((await pool.query("SELECT count(*)::int n FROM event_tags WHERE event_id='event-a'")).rows[0].n, 1);
  await pool.query("INSERT INTO event_categories(event_id,category_id) VALUES('event-a','CAT_HIST')");
  await pool.query('DELETE FROM event_tags');
});

test('lets visitors read the grid and catalogue links, without any write', async () => {
  await pool.query("INSERT INTO event_tags(event_id,tag_id,position) VALUES('event-a','conflits',1)");
  assert.equal(await as('anon', null, async client => (await client.query('SELECT count(*)::int n FROM tags')).rows[0].n), 16);
  assert.equal(await as('anon', null, async client => (await client.query('SELECT count(*)::int n FROM event_tags')).rows[0].n), 1);
  await assert.rejects(as('anon', null, client => client.query("INSERT INTO period_tags(period_id,tag_id,position) VALUES('period-a','conflits',1)")), /permission denied/);
  await pool.query('DELETE FROM event_tags');
});

test('keeps the grid closed to API accounts', async () => {
  await assert.rejects(as('authenticated', claims(alice), client => client.query("INSERT INTO tags(id,family,label_fr,label_en,position) VALUES('autre','societes','Autre','Other',17)")), /permission denied/);
  await assert.rejects(as('authenticated', claims(alice), client => client.query("UPDATE tags SET label_fr='Modifié' WHERE id='sport'")), /permission denied/);
});

test('follows catalogue write rules: the record creator yes, other and anonymous accounts no', async () => {
  const insert = client => client.query("INSERT INTO period_tags(period_id,tag_id,position) VALUES('period-a','conflits',1) RETURNING tag_id");
  await assert.rejects(as('authenticated', claims(bob), insert), /row-level security/);
  await pool.query("INSERT INTO catalogue_private.record_creators(kind,entity_id,user_id) VALUES('period','period-a',$1)", [alice]);
  assert.equal((await as('authenticated', claims(alice), insert)).rowCount, 1);
  assert.equal((await as('authenticated', claims(bob), client => client.query("DELETE FROM period_tags WHERE period_id='period-a'"))).rowCount, 0);
  await assert.rejects(as('authenticated', claims(alice, { is_anonymous: true }), insert), /row-level security/);
});

test('follows story access for story tags', async () => {
  await pool.query('INSERT INTO story_tags(story_id,tag_id,position) VALUES($1,$3,1),($2,$3,1)', [publicStory, privateStory, 'conflits']);
  const visible = (role, jwt) => as(role, jwt, async client => (await client.query('SELECT story_id FROM story_tags ORDER BY story_id')).rows.map(row => row.story_id));
  assert.deepEqual(await visible('anon', null), [publicStory]);
  assert.deepEqual(await visible('authenticated', claims(bob)), [publicStory]);
  assert.deepEqual(await visible('authenticated', claims(alice)), [publicStory, privateStory].sort((a, b) => a - b));
  const add = story => client => client.query('INSERT INTO story_tags(story_id,tag_id,position) VALUES($1,$2,2) RETURNING tag_id', [story, 'sport']);
  assert.equal((await as('authenticated', claims(alice), add(privateStory))).rowCount, 1);
  await assert.rejects(as('authenticated', claims(bob), add(publicStory)), /row-level security/);
  await pool.query('DELETE FROM story_tags');
});

test('marks exactly the reviewed non-thematic periods, refuses a mismatch and rolls back', async () => {
  const batch = await read('../../database/data/20261108_tags_lot1_non_thematiques.sql');
  const undo = await read('../../database/data/20261108_tags_lot1_non_thematiques_rollback.sql');
  const values = batch.slice(batch.indexOf('VALUES'), batch.indexOf('DO $guard$'));
  const labels = [...values.matchAll(/^  \('((?:[^']|'')+)', '/gm)].map(match => match[1].replace(/''/g, "'"));
  assert.ok(labels.length > 200);
  // A refused script leaves its explicit transaction aborted on the connection: never reuse it open.
  const run = async script => { const client = await pool.connect(); try { await client.query(script); } finally { await client.query('ROLLBACK'); client.release(); } };
  const marked = async () => (await pool.query('SELECT label_fr FROM periods WHERE non_thematic ORDER BY label_fr')).rows.map(row => row.label_fr);
  await pool.query("DELETE FROM period_tags WHERE period_id = 'period-a'");
  await pool.query('INSERT INTO periods(id,label_fr,label_en,start_date,end_date) SELECT $1 || ordinality, label, label, $2, $3 FROM unnest($4::text[]) WITH ORDINALITY AS t(label, ordinality)', ['lot-', '1800', '1900', labels.slice(1)]);
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('dinos','Règne des dinosaures non aviens','Dinosaurs','M230','M66')");
  const before = await pool.query("SELECT to_jsonb(p) - 'non_thematic' AS data FROM periods p ORDER BY id");
  await assert.rejects(run(batch), /Libellé absent ou ambigu/);
  assert.deepEqual(await marked(), []);
  await pool.query('INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES($1,$2,$2,$3,$4)', ['lot-first', labels[0], '1800', '1900']);
  await pool.query("INSERT INTO period_tags(period_id,tag_id,position) VALUES('lot-first','sport',1)");
  await assert.rejects(run(batch), /déjà taguée/);
  await pool.query("DELETE FROM period_tags WHERE period_id = 'lot-first'");
  await run(batch);
  assert.deepEqual(new Set(await marked()), new Set(labels));
  assert.ok(!(await marked()).includes('Règne des dinosaures non aviens'));
  assert.deepEqual((await pool.query("SELECT to_jsonb(p) - 'non_thematic' AS data FROM periods p WHERE id <> 'lot-first' ORDER BY id")).rows, before.rows);
  await run(batch);
  assert.equal((await marked()).length, labels.length);
  await run(undo);
  assert.deepEqual(await marked(), []);
  assert.equal((await pool.query("SELECT tgenabled FROM pg_trigger WHERE tgname='trg_periods_updated_at'")).rows[0].tgenabled, 'O');
  await pool.query("DELETE FROM periods WHERE id LIKE 'lot-%' OR id = 'dinos'");
});

test('tags the reviewed thematic periods in rank order, refuses a mismatch and rolls back', async () => {
  const batch = await read('../../database/data/20261109_tags_lot2_periodes.sql');
  const undo = await read('../../database/data/20261109_tags_lot2_periodes_rollback.sql');
  const rows = [...batch.matchAll(/^  \('((?:[^']|'')+)', ARRAY\[([^\]]+)\], (\d+)\)/gm)].map(([, label, tags, expected]) => ({ label: label.replace(/''/g, "'"), tags: tags.split(',').map(tag => tag.slice(1, -1)), expected: Number(expected) }));
  assert.ok(rows.length > 300);
  const run = async script => { const client = await pool.connect(); try { await client.query(script); } finally { await client.query('ROLLBACK'); client.release(); } };
  const links = async () => (await pool.query('SELECT p.label_fr, t.tag_id, t.position FROM period_tags t JOIN periods p ON p.id = t.period_id ORDER BY 1,3')).rows;
  await pool.query('DELETE FROM period_tags');
  const copies = rows.flatMap(row => Array.from({ length: row.expected }, () => row.label));
  await pool.query('INSERT INTO periods(id,label_fr,label_en,start_date,end_date) SELECT $1 || ordinality, label, label, $2, $3 FROM unnest($4::text[]) WITH ORDINALITY AS t(label, ordinality)', ['lot2-', '1800', '1900', copies.slice(1)]);
  await assert.rejects(run(batch), /Libellé absent ou ambigu/);
  assert.deepEqual(await links(), []);
  await pool.query('INSERT INTO periods(id,label_fr,label_en,start_date,end_date,non_thematic) VALUES($1,$2,$2,$3,$4,true)', ['lot2-first', copies[0], '1800', '1900']);
  await assert.rejects(run(batch), /non thématique ou déjà taguée/);
  await pool.query("UPDATE periods SET non_thematic = false WHERE id = 'lot2-first'");
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('lot2-other','Hors lot','Outside','1800','1900')");
  await run(batch);
  const stored = await links();
  assert.equal(stored.length, rows.reduce((total, row) => total + row.tags.length * row.expected, 0));
  const sample = rows.find(row => row.tags.length === 2);
  assert.deepEqual(stored.filter(link => link.label_fr === sample.label).slice(0, 2).map(link => link.tag_id), sample.tags);
  assert.ok(!stored.some(link => link.label_fr === 'Hors lot'));
  await pool.query("INSERT INTO period_tags(period_id,tag_id,position) VALUES('lot2-other','sport',1)");
  await run(undo);
  assert.deepEqual((await links()).map(link => link.label_fr), ['Hors lot']);
  await pool.query("DELETE FROM period_tags; DELETE FROM periods WHERE id LIKE 'lot2-%'");
});

test('tags the reviewed events in rank order, refuses a mismatch and rolls back', async () => {
  const batch = await read('../../database/data/20261109_tags_lot3_evenements.sql');
  const undo = await read('../../database/data/20261109_tags_lot3_evenements_rollback.sql');
  const run = async script => { const client = await pool.connect(); try { await client.query(script); } finally { await client.query('ROLLBACK'); client.release(); } };
  // The batch is read back from its own SQL, so escaped labels are compared as PostgreSQL parses them.
  const client = await pool.connect();
  let rows;
  try {
    await client.query(batch.slice(0, batch.indexOf('DO $guard$')));
    rows = (await client.query('SELECT label, tags FROM event_tags_batch ORDER BY label')).rows;
  } finally { await client.query('ROLLBACK'); client.release(); }
  assert.ok(rows.length > 600);
  assert.ok(rows.every(row => row.tags.length >= 1 && row.tags.length <= 3 && new Set(row.tags).size === row.tags.length));
  const links = async () => (await pool.query('SELECT e.label_fr, t.tag_id, t.position FROM event_tags t JOIN events e ON e.id = t.event_id ORDER BY 1,3')).rows;
  await pool.query('DELETE FROM event_tags');
  const labels = rows.map(row => row.label);
  await pool.query('INSERT INTO events(id,label_fr,label_en,date) SELECT $1 || ordinality, label, label, $2 FROM unnest($3::text[]) WITH ORDINALITY AS t(label, ordinality)', ['lot3-', '1800', labels.slice(1)]);
  await assert.rejects(run(batch), /Libellé absent ou ambigu/);
  assert.deepEqual(await links(), []);
  await pool.query('INSERT INTO events(id,label_fr,label_en,date) VALUES($1,$2,$2,$3)', ['lot3-first', labels[0], '1800']);
  await pool.query("INSERT INTO event_tags(event_id,tag_id,position) VALUES('lot3-first','sport',1)");
  await assert.rejects(run(batch), /déjà tagué/);
  await pool.query('DELETE FROM event_tags');
  await pool.query("INSERT INTO events(id,label_fr,label_en,date) VALUES('lot3-other','Hors lot','Outside','1800')");
  await run(batch);
  const stored = await links();
  assert.equal(stored.length, rows.reduce((total, row) => total + row.tags.length, 0));
  const sample = rows.find(row => row.tags.length === 2);
  assert.deepEqual(stored.filter(link => link.label_fr === sample.label).map(link => link.tag_id), sample.tags);
  await pool.query("INSERT INTO event_tags(event_id,tag_id,position) VALUES('lot3-other','sport',1)");
  await run(undo);
  assert.deepEqual((await links()).map(link => link.label_fr), ['Hors lot']);
  await pool.query("DELETE FROM event_tags; DELETE FROM events WHERE id LIKE 'lot3-%'");
});

test('tags the reviewed stories by id and title, marks the last period and rolls back', async () => {
  const batch = await read('../../database/data/20261109_tags_lot4_frises.sql');
  const undo = await read('../../database/data/20261109_tags_lot4_frises_rollback.sql');
  const run = async script => { const client = await pool.connect(); try { await client.query(script); } finally { await client.query('ROLLBACK'); client.release(); } };
  const client = await pool.connect();
  let rows;
  try {
    await client.query(batch.slice(0, batch.indexOf('DO $guard$')));
    rows = (await client.query('SELECT story_id, title, tags FROM story_tags_batch ORDER BY story_id')).rows;
  } finally { await client.query('ROLLBACK'); client.release(); }
  assert.equal(rows.length, 35);
  const links = async () => (await pool.query('SELECT story_id, tag_id, position FROM story_tags ORDER BY 1,3')).rows;
  await pool.query('DELETE FROM story_tags; DELETE FROM stories');
  for (const row of rows.slice(1)) await pool.query("INSERT INTO stories(id,title_fr,title_en,author,owner_user_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$2,'Alice',$3)", [row.story_id, row.title, alice]);
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date,updated_at) VALUES('egypte','Égypte et Levant','Egypt','900','1100','2020-01-01')");
  await assert.rejects(run(batch), /absente ou renommée/);
  await pool.query("INSERT INTO stories(id,title_fr,title_en,author,owner_user_id) OVERRIDING SYSTEM VALUE VALUES($1,'Autre titre','Other','Alice',$2)", [rows[0].story_id, alice]);
  await assert.rejects(run(batch), /absente ou renommée/);
  await pool.query('UPDATE stories SET title_fr=$1 WHERE id=$2', [rows[0].title, rows[0].story_id]);
  await run(batch);
  const stored = await links();
  assert.equal(stored.length, rows.reduce((total, row) => total + row.tags.length, 0));
  assert.equal(stored.find(link => link.story_id === rows[0].story_id && link.position === 1).tag_id, rows[0].tags[0]);
  const egypt = async () => (await pool.query("SELECT non_thematic, updated_at FROM periods WHERE id='egypte'")).rows[0];
  assert.equal((await egypt()).non_thematic, true);
  assert.equal((await egypt()).updated_at.getUTCFullYear(), 2020);
  await run(undo);
  assert.deepEqual(await links(), []);
  assert.equal((await egypt()).non_thematic, false);
  assert.equal((await pool.query("SELECT tgenabled FROM pg_trigger WHERE tgname='trg_periods_updated_at'")).rows[0].tgenabled, 'O');
  await pool.query("DELETE FROM periods WHERE id='egypte'; DELETE FROM stories");
  const restored = await pool.query("INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES('Publique','Public','Alice',true,$1),('Privée','Private','Alice',false,$1) RETURNING id", [alice]);
  [publicStory, privateStory] = restored.rows.map(row => row.id);
});

test('lists the closed grid in display order', async () => {
  const { payload, statusCode } = await call('get', '/tags');
  assert.equal(statusCode, 200);
  assert.equal(payload.length, 16);
  assert.deepEqual(payload[0], { id: 'cosmos', parentId: null, family: 'monde-vivant', label: { fr: 'Cosmos', en: 'Cosmos' }, position: 1, description: 'Univers, astres et phénomènes astronomiques.' });
});

test('keeps the rank of written tags and reads them back everywhere', async () => {
  const created = await call('post', '/events', { body: eventBody('api-event', { tags: ['conflits', 'pouvoir-institutions'] }) });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(ids(created.payload), ['conflits', 'pouvoir-institutions']);
  const listed = (await call('get', '/events')).payload.find(event => event.id === 'api-event');
  assert.deepEqual(ids(listed), ['conflits', 'pouvoir-institutions']);
  assert.equal(listed.tags[0].family, 'societes');
});

test('preserves omitted tags, clears on an empty list and leaves categories alone', async () => {
  await pool.query("INSERT INTO event_categories(event_id,category_id) VALUES('api-event','CAT_HIST')");
  const body = eventBody('api-event');
  delete body.id;
  const kept = await call('put', '/events/:id', { params: { id: 'api-event' }, body });
  assert.deepEqual(ids(kept.payload), ['conflits', 'pouvoir-institutions']);
  const swapped = await call('put', '/events/:id', { params: { id: 'api-event' }, body: { ...body, tags: ['pouvoir-institutions', 'conflits'] } });
  assert.deepEqual(ids(swapped.payload), ['pouvoir-institutions', 'conflits']);
  const cleared = await call('put', '/events/:id', { params: { id: 'api-event' }, body: { ...body, tags: [] } });
  assert.deepEqual(cleared.payload.tags, []);
  assert.equal((await pool.query("SELECT count(*)::int n FROM event_categories WHERE event_id='api-event'")).rows[0].n, 1);
});

test('refuses malformed tag lists before any write', async () => {
  for (const tags of [['a', 'b', 'c', 'd'], ['conflits', 'conflits'], ['Conflits'], 'conflits', [1]]) {
    assert.equal((await call('post', '/events', { body: eventBody('refused', { tags }) })).statusCode, 400, JSON.stringify(tags));
  }
  assert.equal((await call('post', '/events', { body: eventBody('refused', { tags: ['inconnu'] }) })).statusCode, 409);
  assert.equal((await pool.query("SELECT count(*)::int n FROM events WHERE id='refused'")).rows[0].n, 0);
});

test('keeps a period either thematic or non-thematic', async () => {
  const created = await call('post', '/periods', { body: periodBody('api-period', { tags: ['conflits'] }) });
  assert.deepEqual(ids(created.payload), ['conflits']);
  const body = periodBody('api-period');
  delete body.id;
  const flagged = await call('put', '/periods/:id', { params: { id: 'api-period' }, body: { ...body, nonThematic: true } });
  assert.equal(flagged.payload.non_thematic, true);
  assert.deepEqual(flagged.payload.tags, []);
  assert.equal((await call('put', '/periods/:id', { params: { id: 'api-period' }, body: { ...body, nonThematic: true, tags: ['conflits'] } })).statusCode, 400);
  const tagged = await call('put', '/periods/:id', { params: { id: 'api-period' }, body: { ...body, tags: ['sport'] } });
  assert.equal(tagged.payload.non_thematic, false);
  const detail = (await call('get', '/periods/:id', { params: { id: 'api-period' } })).payload;
  assert.equal(detail.nonThematic, false);
  assert.deepEqual(ids(detail), ['sport']);
});

test('carries tags and categories through a conversion when the form omits them', async () => {
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('to-convert','Source','Source','1800','1900'); INSERT INTO period_categories(period_id,category_id) VALUES('to-convert','CAT_HIST'); INSERT INTO period_tags(period_id,tag_id,position) VALUES('to-convert','terre',1),('to-convert','vivant',2)");
  await pool.query("INSERT INTO catalogue_private.record_creators(kind,entity_id,user_id) VALUES('period','to-convert',$1)", [alice]);
  const converted = await call('post', '/periods/:id/convert-to-event', { params: { id: 'to-convert' }, body: eventBody('converted') });
  assert.equal(converted.statusCode, 201);
  assert.deepEqual(ids(converted.payload), ['terre', 'vivant']);
  assert.deepEqual(converted.payload.categories.map(category => category.id), ['CAT_HIST']);
});

test('searches by tag and includes its sub-domains', async () => {
  await pool.query("INSERT INTO tags(id,parent_id,family,label_fr,label_en,position) VALUES('droit','pouvoir-institutions','societes','Droit','Law',101)");
  await pool.query("INSERT INTO events(id,label_fr,label_en,date) VALUES('code-civil','Code civil','Civil code','1804'),('code-noir','Code noir','Black code','1685'); INSERT INTO event_tags(event_id,tag_id,position) VALUES('code-civil','droit',1),('code-noir','sport',1)");
  const search = async tag => (await call('get', '/search', { query: { q: 'code', tag, only: 'events' } })).payload.events.map(event => event.id);
  assert.deepEqual(await search('pouvoir-institutions'), ['code-civil']);
  assert.deepEqual(await search('droit'), ['code-civil']);
  await pool.query("DELETE FROM event_tags WHERE tag_id='droit'; DELETE FROM tags WHERE id='droit'");
});

test('writes story tags without changing the story categories', async () => {
  await pool.query("INSERT INTO profiles (user_id,username) VALUES ($1,'Alice')", [alice]);
  const story = await call('post', '/stories', { body: { title: { fr: 'Taguée' }, description: null, tags: ['arts-culture-loisirs'] } });
  assert.equal(story.statusCode, 201);
  assert.deepEqual(ids(story.payload), ['arts-culture-loisirs']);
  const read = (await call('get', '/stories/:id', { params: { id: String(story.payload.id) } })).payload;
  assert.deepEqual(ids(read), ['arts-culture-loisirs']);
  assert.ok((await call('get', '/stories')).payload.some(row => row.id === story.payload.id && ids(row)[0] === 'arts-culture-loisirs'));
});
