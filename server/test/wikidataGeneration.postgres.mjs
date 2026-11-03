// Real transactions and RLS, exclusively on a disposable local database (testPool enforces it).
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, applicationTables } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const pool = testPool();
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, { userId: principalContext.getStore()?.userId ?? null, isAdmin: false });
  return operation(client);
});
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
const event = { qid: 'Q2', type: 'event', title: 'Événement importé', description: 'Depuis Wikidata', startDate: '1789-07-14', endDate: '' };
const period = { qid: 'Q3', type: 'period', title: 'Période importée', description: '', startDate: '1789', endDate: '1799' };
const body = () => ({ qid: 'Q1', title: 'Frise de test', items: [event, period] });
async function call(payload = body(), userId = alice) {
  const route = router.stack.find(layer => layer.route?.path === '/stories/from-wikidata' && layer.route.methods.post);
  const res = { statusCode: 200, payload: undefined,
    status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body: payload }, res));
  return res;
}

async function lookup(qid, title, userId = alice) {
  const route = router.stack.find(layer => layer.route?.path === '/stories/wikidata-matches' && layer.route.methods.get);
  const res = { statusCode: 200, payload: undefined, set() { return this; },
    status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ query: { qid, title } }, res));
  return res;
}
before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await pool.query(`TRUNCATE ${applicationTables.map(table => 'public.' + table).join(',')} RESTART IDENTITY CASCADE`);
  await pool.query('DELETE FROM auth.users');
  await pool.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ($1, 'alice@example.test', '{"username":"Alice_1","terms_version":"2026-11-03"}'),
    ($2, 'bob@example.test', '{"username":"Bob_1","terms_version":"2026-11-03"}')`, [alice, bob]);
});
after(() => pool.end());

test('creates a private owned frise with dated UUID entities, inaccessible to another account or a visitor', async () => {
  const response = await call(); assert.equal(response.statusCode, 201);
  const { id } = response.payload;
  const story = (await pool.query('SELECT is_public, owner_user_id, author, description_fr FROM stories WHERE id=$1', [id])).rows[0];
  assert.deepEqual(story, { is_public: false, owner_user_id: alice, author: 'Alice_1', description_fr: 'Source : https://www.wikidata.org/wiki/Q1' });
  assert.equal((await pool.query('SELECT count(*)::int n FROM story_periods WHERE story_id=$1', [id])).rows[0].n, 1);
  const saved = (await pool.query('SELECT e.id, e.date, e.date_years_bp FROM events e JOIN story_events se ON se.event_id=e.id WHERE se.story_id=$1', [id])).rows[0];
  assert.match(saved.id, /^[0-9a-f-]{36}$/); assert.equal(saved.date, '1789-07-14'); assert.ok(saved.date_years_bp > 200);
  for (const userId of [bob, null]) {
    const seen = await principalContext.run({ userId, isAdmin: false }, () => tx(async client => (await client.query('SELECT id FROM public.stories WHERE id=$1', [id])).rows));
    assert.deepEqual(seen, []);
  }
});

test('reuses a stored Wikidata link without overwriting data or confusing a Q-shaped internal ID', async () => {
  await pool.query(`INSERT INTO events (id,wikidata_id,label_fr,label_en,date) VALUES ('Q2','Q777','Autre','Other','1900'),('existing','Q2','Titre conservé','Saved','1789')`);
  const response = await call({ ...body(), items: [event] }); assert.equal(response.statusCode, 201);
  assert.equal((await pool.query('SELECT event_id FROM story_events WHERE story_id=$1', [response.payload.id])).rows[0].event_id, 'existing');
  assert.deepEqual((await pool.query("SELECT label_fr,date FROM events WHERE id='existing'")).rows[0], { label_fr: 'Titre conservé', date: '1789' });
});

test('creates a public frise only when explicitly selected, retaining the authenticated owner', async () => {
  const response = await call({ ...body(), isPublic: true }); assert.equal(response.statusCode, 201);
  const id = response.payload.id;
  assert.deepEqual((await pool.query('SELECT is_public, owner_user_id FROM stories WHERE id=$1', [id])).rows[0], { is_public: true, owner_user_id: alice });
  for (const userId of [bob, null]) {
    const visible = await principalContext.run({ userId, isAdmin: false }, () => tx(async client => (await client.query('SELECT id FROM public.stories WHERE id=$1', [id])).rows));
    assert.equal(String(visible[0]?.id), id);
  }
});

test('persists the edited story description, including blank text, without overwriting catalogue descriptions', async () => {
  const acknowledgedStoryIds = [];
  for (const description of ['Description modifiée\nDeuxième ligne.', '']) {
    const response = await call({ ...body(), description, acknowledgedStoryIds }); assert.equal(response.statusCode, 201);
    acknowledgedStoryIds.push(response.payload.id);
    assert.equal((await pool.query('SELECT description_fr FROM stories WHERE id=$1', [response.payload.id])).rows[0].description_fr, description || null);
  }
  assert.equal((await pool.query('SELECT description_fr FROM events WHERE wikidata_id=$1', ['Q2'])).rows[0].description_fr, event.description);
});

test('concurrent imports share one catalogue row while retaining separate private frises', async () => {
  const responses = await Promise.all([call({ ...body(), items: [event] }, alice), call({ ...body(), items: [event] }, bob)]);
  assert.deepEqual(responses.map(response => response.statusCode), [201, 201]);
  assert.equal((await pool.query('SELECT count(*)::int n FROM events WHERE wikidata_id=$1', ['Q2'])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(DISTINCT story_id)::int n FROM story_events')).rows[0].n, 2);
});

test('detects an existing subject after renaming and requires acknowledgement without modifying the original frise', async () => {
  const payload = { ...body(), qid: 'Q6534', title: 'Révolution française', items: [{ ...period, qid: 'Q6534' }] };
  const first = await call(payload); assert.equal(first.statusCode, 201);
  const found = await lookup('Q6534', 'Un nouveau titre');
  assert.deepEqual(found.payload, [{ id: first.payload.id, title: 'Révolution française', reason: 'subject' }]);
  const blocked = await call({ ...payload, title: 'Un nouveau titre' });
  assert.equal(blocked.statusCode, 409);
  assert.equal(blocked.payload.existingStories[0].id, first.payload.id);
  assert.equal((await pool.query('SELECT count(*)::int n FROM stories')).rows[0].n, 1);
  const deliberate = await call({ ...payload, title: 'Un nouveau titre', acknowledgedStoryIds: [first.payload.id] });
  assert.equal(deliberate.statusCode, 201);
  assert.deepEqual((await pool.query('SELECT title_fr,description_fr FROM stories WHERE id=$1', [first.payload.id])).rows[0], { title_fr: 'Révolution française', description_fr: 'Source : https://www.wikidata.org/wiki/Q6534' });
  assert.equal((await pool.query('SELECT count(*)::int n FROM periods')).rows[0].n, 1);
});

test('does not treat a broader frise containing the subject as a duplicate, while still detecting its identical title', async () => {
  const broader = await call({ ...body(), title: 'Époque moderne', description: 'Une frise plus large', isPublic: true, items: [{ ...period, qid: 'Q6534' }, event] });
  assert.equal(broader.statusCode, 201);
  assert.deepEqual((await lookup('Q6534', 'Révolution française')).payload, []);
  assert.deepEqual((await lookup('Q2', 'Autre sujet')).payload, []);
  const sameTitle = await lookup('Q6534', 'EPOQUE MODERNE');
  assert.deepEqual(sameTitle.payload, [{ id: broader.payload.id, title: 'Époque moderne', reason: 'title' }]);
  const result = await call({ ...body(), qid: 'Q6534', title: 'Révolution française', items: [{ ...period, qid: 'Q6534' }] });
  assert.equal(result.statusCode, 201);
  assert.equal((await pool.query('SELECT count(*)::int n FROM stories')).rows[0].n, 2);
  assert.equal((await pool.query('SELECT count(*)::int n FROM periods')).rows[0].n, 1);
});

test('does not disclose other accounts’ private frises in lookup results or conflict errors', async () => {
  const first = await call(); assert.equal(first.statusCode, 201);
  for (const user of [bob, null]) assert.deepEqual((await lookup('Q1', 'Frise de test', user)).payload, []);
  const separate = await call(body(), bob); assert.equal(separate.statusCode, 201);
  const own = await lookup('Q1', 'Frise de test', bob);
  assert.deepEqual(own.payload.map(story => story.id), [separate.payload.id]);
});

test('finds public frises and normalized identical titles, while matching legacy source URLs exactly', async () => {
  const first = await call({ ...body(), qid: 'Q10', title: 'Révolution française', isPublic: true }); assert.equal(first.statusCode, 201);
  assert.deepEqual((await lookup('Q1', 'Autre titre')).payload, []); // Q1 must not match Q10.
  assert.equal((await lookup('Q10', 'Autre titre', null)).payload[0].reason, 'subject');
  const sameTitle = await lookup('Q999', '  REVOLUTION FRANCAISE  ', bob);
  assert.deepEqual(sameTitle.payload, [{ id: first.payload.id, title: 'Révolution française', reason: 'title' }]);
});

test('serializes concurrent creations by the same account before checking for a duplicate', async () => {
  const responses = await Promise.all([call(), call()]);
  assert.deepEqual(responses.map(response => response.statusCode).sort(), [201, 409]);
  for (const table of ['stories','periods','events']) assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 1);
});

test('serializes concurrent public creations across accounts without exposing private frises', async () => {
  const responses = await Promise.all([call({ ...body(), isPublic: true }, alice), call({ ...body(), isPublic: true }, bob)]);
  assert.deepEqual(responses.map(response => response.statusCode).sort(), [201, 409]);
  assert.equal((await pool.query('SELECT count(*)::int n FROM stories')).rows[0].n, 1);
});

test('refuses a stale acknowledgement when an additional matching frise has appeared', async () => {
  const first = await call(); assert.equal(first.statusCode, 201);
  const second = await call({ ...body(), acknowledgedStoryIds: [first.payload.id] }); assert.equal(second.statusCode, 201);
  const stale = await call({ ...body(), acknowledgedStoryIds: [first.payload.id] });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.payload.existingStories.length, 2);
  assert.equal((await pool.query('SELECT count(*)::int n FROM stories')).rows[0].n, 2);
});

test('persists nested local parents using reused IDs, without modifying other frises or clipping dates', async () => {
  await pool.query(`INSERT INTO periods (id,wikidata_id,label_fr,label_en,start_date,end_date) VALUES
    ('stored-parent','Q3','Parent conservé','Saved parent','1789','1799'),
    ('stored-child','Q4','Enfant conservé','Saved child','1790','1802')`);
  const first = await call({ ...body(), items: [period, { ...period, qid: 'Q4' }] });
  assert.equal(first.statusCode, 201);
  const payload = { ...body(), acknowledgedStoryIds: [first.payload.id], items: [
    { ...period, qid: 'Q5', parentQid: 'Q4', startDate: '1791', endDate: '1792' },
    { ...period, qid: 'Q4', parentQid: 'Q3', startDate: '1790', endDate: '1802' }, period,
  ] };
  const response = await call(payload); assert.equal(response.statusCode, 201);
  const links = (await pool.query(`SELECT p.wikidata_id, sp.period_id, sp.parent_period_id FROM story_periods sp
    JOIN periods p ON p.id=sp.period_id WHERE sp.story_id=$1 ORDER BY p.wikidata_id`, [response.payload.id])).rows;
  assert.deepEqual(links.slice(0, 2), [
    { wikidata_id: 'Q3', period_id: 'stored-parent', parent_period_id: null },
    { wikidata_id: 'Q4', period_id: 'stored-child', parent_period_id: 'stored-parent' },
  ]);
  assert.equal(links[2].parent_period_id, 'stored-child');
  assert.equal((await pool.query('SELECT count(*)::int n FROM story_periods WHERE story_id=$1 AND parent_period_id IS NOT NULL', [first.payload.id])).rows[0].n, 0);
  assert.deepEqual((await pool.query("SELECT label_fr,end_date FROM periods WHERE id='stored-child'")).rows[0], { label_fr: 'Enfant conservé', end_date: '1802' });
});

test('rolls back imports and the frise if saving a parent placement fails', async () => {
  await pool.query(`CREATE FUNCTION public.reject_generation_parent_test() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.parent_period_id IS NOT NULL THEN RAISE EXCEPTION 'test-only parent failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_generation_parent_test BEFORE INSERT ON public.story_periods FOR EACH ROW EXECUTE FUNCTION public.reject_generation_parent_test()`);
  try {
    assert.equal((await call({ ...body(), items: [period, { ...period, qid: 'Q4', parentQid: 'Q3' }] })).statusCode, 500);
    for (const table of ['stories', 'periods', 'story_periods']) assert.equal((await pool.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n, 0);
  } finally { await pool.query('DROP TRIGGER reject_generation_parent_test ON public.story_periods; DROP FUNCTION public.reject_generation_parent_test()'); }
});

test('a failed association rolls back the story and every newly imported item', async () => {
  await pool.query(`CREATE FUNCTION public.reject_generation_test_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only link failure'; END $$;
    CREATE TRIGGER reject_generation_test_link BEFORE INSERT ON public.story_events FOR EACH ROW EXECUTE FUNCTION public.reject_generation_test_link()`);
  try {
    assert.equal((await call()).statusCode, 500);
    for (const table of ['stories', 'events', 'periods', 'story_periods', 'story_events']) assert.equal((await pool.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n, 0);
  } finally { await pool.query('DROP TRIGGER reject_generation_test_link ON public.story_events; DROP FUNCTION public.reject_generation_test_link()'); }
});

test('anonymous writes are refused by RLS and missing period ends are rejected without saving', async () => {
  assert.equal((await call(body(), null)).statusCode, 403);
  assert.equal((await call({ ...body(), items: [{ ...period, endDate: '' }] })).statusCode, 400);
  assert.equal((await pool.query('SELECT count(*)::int n FROM stories')).rows[0].n, 0);
});
