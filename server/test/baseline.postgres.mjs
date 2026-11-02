import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, category, applicationTables, snapshotRows, schemaContract } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';
import { checkAccessSchema } from '../dist/auth/preflight.js';

const pool = testPool();
const baseline = await readFile(new URL('../../database/baseline/application.sql', import.meta.url), 'utf8');
const expected = JSON.parse(await readFile(new URL('./fixtures/application-schema.json', import.meta.url), 'utf8'));
const scoped = (userId, operation) => runInTransaction(pool, async client => {
  await applyPrincipal(client, { userId, isAdmin: false });
  return operation(client);
});
const tx = operation => scoped(principalContext.getStore()?.userId ?? null, operation);
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');
async function call(method, path, body = {}, params = {}, userId = alice) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `${method} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(data) { this.payload = data; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params, query: {} }, res));
  return res;
}
let initialEmpty;
before(async () => {
  assert.ok(Number((await pool.query('SHOW server_version_num')).rows[0].server_version_num) >= 170000);
  await pool.query(authFixture);
  await pool.query(baseline);
  initialEmpty = Object.values(await snapshotRows(pool)).every(rows => rows.length === 0)
    && (await pool.query('SELECT count(*)::int AS count FROM auth.users')).rows[0].count === 0;
  await pool.query("INSERT INTO auth.users (id,email,email_confirmed_at) VALUES ($1,'alice@example.test',now()),($2,'bob@example.test',now())", [alice,bob]);
});
beforeEach(async () => {
  await pool.query(`TRUNCATE ${applicationTables.map(t => 'public.' + t).join(',')} RESTART IDENTITY CASCADE`);
  await pool.query("INSERT INTO profiles (user_id,username) VALUES ($1,'Alice'),($2,'Bob')", [alice,bob]);
  await pool.query("INSERT INTO categories (id,label_fr,label_en) VALUES ($1,'Catégorie','Category')", [category]);
  await pool.query("INSERT INTO periods (id,label_fr,label_en,start_date,end_date) VALUES ('root','Racine','Root','M65','NOW')");
  await pool.query("INSERT INTO events (id,label_fr,label_en,date) VALUES ('event','Événement','Event','1944-06-06')");
  await pool.query("INSERT INTO stories (title_fr,title_en,author,is_public,owner_user_id) VALUES ('Public','Public','Alice',true,$1),('Privé','Private','Alice',false,$1),('Privé Bob','Bob private','Bob',false,$2)", [alice,bob]);
  await pool.query("INSERT INTO story_periods VALUES (2,'root'); INSERT INTO story_events VALUES (2,'event'); INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','root')");
  await pool.query('INSERT INTO story_categories VALUES (2,$1)', [category]);
});
after(() => pool.end());

test('installs a zero-data schema and passes the real Auth startup preflight', async () => {
  assert.ok(initialEmpty);
  await checkAccessSchema(pool);
});
test('matches the reviewed Supabase columns, identity, constraints, indexes, triggers and access policies', async () => {
  assert.deepEqual(await schemaContract(pool), expected);
});
test('refuses replay on an existing application without changing its rows', async () => {
  const previous = await snapshotRows(pool);
  const client = await pool.connect();
  try { await assert.rejects(client.query(baseline), /Application objects already exist/); }
  finally { await client.query('ROLLBACK'); client.release(); }
  assert.deepEqual(await snapshotRows(pool), previous);
  await checkAccessSchema(pool);
});
test('creates a private owned story through the real handler with an ALWAYS generated integer ID', async () => {
  const result = await call('post','/stories',{ id: 999, owner_user_id: bob, title: {fr:'Nouvelle'}, author:'Alice', categories:[{id:category}] });
  assert.equal(result.statusCode,201); assert.equal(typeof result.payload.id,'number');
  const saved = (await pool.query('SELECT owner_user_id,is_public FROM stories WHERE id=$1',[result.payload.id])).rows[0];
  assert.deepEqual(saved,{owner_user_id:alice,is_public:false});
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM story_categories WHERE story_id=$1',[result.payload.id])).rows[0].n,1);
});
test('reads public stories anonymously and keeps another account’s private data hidden', async () => {
  assert.deepEqual((await call('get','/stories',{}, {}, null)).payload.map(s=>s.id),[1]);
  const mine = await scoped(alice, client => client.query('SELECT id FROM stories ORDER BY id'));
  assert.deepEqual(mine.rows,[{id:1},{id:2}]);
  for (const table of ['story_periods','story_events','story_categories','story_anchors']) {
    assert.equal((await scoped(bob, client => client.query(`SELECT * FROM ${table}`))).rowCount,0);
    assert.equal((await scoped(alice, client => client.query(`SELECT * FROM ${table}`))).rowCount,1);
  }
});
test('loads complete timeline snapshots and shared-content links under the caller’s RLS', async () => {
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES ('leaf','Feuille','Leaf','M10','NOW'); INSERT INTO story_periods VALUES (1,'root',null),(1,'leaf','root'),(3,'root',null); INSERT INTO story_events VALUES (1,'event'),(3,'event')");
  await pool.query('INSERT INTO period_categories VALUES ($1,$2)', ['root',category]);
  await pool.query('INSERT INTO event_categories VALUES ($1,$2)', ['event',category]);
  await pool.query('UPDATE stories SET parent_story_id=1 WHERE id=2');
  const anon = await call('get','/stories/:id',{}, {id:'1'},null);
  assert.equal(anon.statusCode,200);
  assert.deepEqual(anon.payload.periods.map(p=>p.id),['leaf','root']);
  assert.equal(anon.payload.periods.find(p=>p.id==='root').hasChildren,true);
  assert.equal(anon.payload.periods.find(p=>p.id==='leaf').storyParentId,'root');
  assert.equal(anon.payload.periods.find(p=>p.id==='root').categories[0].id,category);
  assert.equal(anon.payload.events[0].categories[0].id,category);
  assert.deepEqual(anon.payload.childStories,[]);
  assert.deepEqual(anon.payload.relatedStories,[]);
  const own = await call('get','/stories/:id',{}, {id:'1'},alice);
  assert.deepEqual(own.payload.childStories.map(s=>s.id),['2']);
  assert.deepEqual(own.payload.relatedStories.map(s=>({id:s.id,periods:s.periodIds,events:s.eventIds})),[{id:'2',periods:['root'],events:['event']}]);
  const other = await call('get','/stories/:id',{}, {id:'1'},bob);
  assert.deepEqual(other.payload.relatedStories.map(s=>s.id),['3']);
  assert.equal((await call('get','/stories/:id',{}, {id:'2'},null)).statusCode,404);
});
test('adds multiple sources and locations without replacing legacy entry points, then removes only the chosen location', async () => {
  await pool.query("INSERT INTO stories(title_fr,title_en,author,owner_user_id) VALUES ('Autre source','Other source','Alice',$1)", [alice]);
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES (1,'root'),(4,'root'); INSERT INTO story_events VALUES (1,'event')");
  await pool.query('UPDATE stories SET parent_story_id=1 WHERE id=2');
  const entry = (sourceId, anchorType, anchorId, operation = 'add') => call('post','/stories/:sourceId/entry-points',{ childStoryIds:['2'], anchor:{anchorType,anchorId},operation },{sourceId});
  assert.equal((await entry('4','period','root')).statusCode,204);
  assert.equal((await entry('1','period','root')).statusCode,204);
  assert.equal((await entry('1','period','root')).statusCode,204);
  assert.equal((await entry('1','event','event')).statusCode,204);
  assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id,1);
  assert.equal((await pool.query('SELECT * FROM story_entry_points')).rowCount,3);
  const detail = await call('get','/stories/:id',{}, {id:'2'});
  assert.deepEqual(detail.payload.parentStories.map(parent=>({id:parent.id,anchors:parent.anchors.map(a=>a.type+':'+a.id).sort()})).sort((a,b)=>a.id.localeCompare(b.id)),[
    {id:'1',anchors:['event:event','period:root']},{id:'4',anchors:['period:root']},
  ]);
  assert.equal(detail.payload.parentStories.find(parent=>parent.id==='4').anchors[0].label.fr,'Racine');
  const source = await call('get','/stories/:id',{}, {id:'4'});
  assert.deepEqual(source.payload.childStories,[{id:'2',title:{fr:'Privé',en:'Private'},anchors:[{type:'period',id:'root'}]}]);
  assert.equal((await entry('1','period','root','remove')).statusCode,204);
  const retained = (await call('get','/stories/:id',{}, {id:'2'})).payload.parentStories;
  assert.deepEqual(retained.find(parent=>parent.id==='1').anchors.map(a=>a.type+':'+a.id),['event:event']);
  assert.equal(retained.find(parent=>parent.id==='4').anchors[0].id,'root');
  await scoped(alice,client=>client.query("DELETE FROM story_periods WHERE story_id=4 AND period_id='root'"));
  assert.deepEqual((await call('get','/stories/:id',{}, {id:'2'})).payload.parentStories.map(parent=>parent.id),['1']);
});
test('enforces entry-point ownership, readable endpoints and source membership', async () => {
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES (1,'root'),(3,'root')");
  const body = {childStoryIds:['2'],anchor:{anchorType:'period',anchorId:'root'},operation:'add'};
  assert.equal((await call('post','/stories/:sourceId/entry-points',body,{sourceId:'1'},bob)).statusCode,404);
  assert.equal((await call('post','/stories/:sourceId/entry-points',{...body,childStoryIds:['3']},{sourceId:'1'})).statusCode,404);
  assert.equal((await call('post','/stories/:sourceId/entry-points',{...body,childStoryIds:['1']},{sourceId:'1'})).statusCode,409);
  assert.equal((await call('post','/stories/:sourceId/entry-points',{...body,anchor:{anchorType:'period',anchorId:'missing'}},{sourceId:'1'})).statusCode,409);
  assert.equal((await call('post','/stories/:sourceId/entry-points',body,{sourceId:'1'})).statusCode,204);
  assert.equal((await scoped(null,client=>client.query('SELECT * FROM story_entry_points'))).rowCount,0);
  await pool.query('UPDATE stories SET is_public=true WHERE id=2');
  assert.equal((await scoped(null,client=>client.query('SELECT * FROM story_entry_points'))).rowCount,1);
  assert.equal((await call('get','/stories/:id',{}, {id:'2'},null)).payload.parentStories[0].id,'1');
  await assert.rejects(scoped(bob,client=>client.query("INSERT INTO story_entry_points(source_story_id,target_story_id,period_id) VALUES (3,2,'root')")),{code:'42501'});
});
test('creates a period and event with canonical categories, numeric bounds and timestamps', async () => {
  const p=await call('post','/periods',{id:'legacy-period',wikidata_id:'Q999909',label:{fr:'Nouvelle'},start_date:'M65',end_date:'NOW',categories:[{id:category}]});
  assert.equal(p.statusCode,201); assert.equal(p.payload.parent_id,null);
  assert.equal(Number(p.payload.start_years_bp),65000000); assert.equal(p.payload.categories[0].id,category); assert.ok(p.payload.created_at);
  const e=await call('post','/events',{id:'legacy-event',wikidata_id:'Q999908',label:{fr:'Nouveau'},date:'1944-06-06',categories:[{id:category}]});
  assert.equal(e.statusCode,201); assert.equal(e.payload.categories[0].id,category); assert.ok(Number.isFinite(Number(e.payload.date_years_bp)));
});
test('writes associations and generated anchors only for the story owner', async () => {
  assert.equal((await call('post','/stories/:storyId/periods',{ids:['root'],operation:'add'},{storyId:'1'})).statusCode,200);
  assert.equal((await call('post','/stories/:storyId/anchors',{anchorType:'period',anchorId:'root'},{storyId:'1'})).statusCode,201);
  assert.equal((await call('post','/stories/:storyId/events',{ids:['event'],operation:'add'},{storyId:'1'},bob)).statusCode,404);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM story_events WHERE story_id=1')).rows[0].n,0);
});
test('stores an event importance per frise, for the frise owner only', async () => {
  const path = '/stories/:storyId/events/:eventId/importance';
  const importance = async () => (await pool.query("SELECT importance FROM story_events WHERE story_id=2 AND event_id='event'")).rows[0].importance;
  assert.equal(await importance(), 'normal');
  const saved = await call('put', path, { importance: 'major' }, { storyId: '2', eventId: 'event' });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.payload, { storyId: '2', eventId: 'event', importance: 'major' });
  assert.equal((await call('get', '/stories/:id', {}, { id: '2' })).payload.events[0].importance, 'major');
  // Un autre compte ne voit pas la frise privée ; une valeur hors liste ou un événement absent sont refusés.
  assert.equal((await call('put', path, { importance: 'minor' }, { storyId: '2', eventId: 'event' }, bob)).statusCode, 404);
  assert.equal((await call('put', path, { importance: 'critical' }, { storyId: '2', eventId: 'event' })).statusCode, 400);
  assert.equal((await call('put', path, { importance: 'minor' }, { storyId: '1', eventId: 'event' })).statusCode, 404);
  assert.equal(await importance(), 'major');
  // La contrainte protège aussi les écritures directes.
  await assert.rejects(pool.query("UPDATE story_events SET importance='critical' WHERE story_id=2"), /story_events_importance_check/);
});
test('rolls back metadata when a referenced category does not exist', async () => {
  const result=await call('post','/periods',{id:'refused',wikidata_id:'Q999906',label:{fr:'Refusée'},start_date:'M65',end_date:'NOW',categories:[{id:'00000000-0000-0000-0000-000000000099'}]});
  assert.ok(result.statusCode>=400); assert.equal((await pool.query("SELECT * FROM periods WHERE id='refused'")).rowCount,0);
});
test('prevents cross-owner parenting at the database constraint as well as in the API', async () => {
  await assert.rejects(pool.query('UPDATE stories SET parent_story_id=3 WHERE id=2'),{code:'23503'});
  assert.equal((await call('post','/stories/:parentId/child-stories',{childStoryIds:['3']},{parentId:'1'})).statusCode,404);
});
test('gives authenticated inserts sequence usage without anonymous access or setval privileges', async () => {
  await assert.rejects(scoped(null,client=>client.query("SELECT nextval('stories_id_seq')")),{code:'42501'});
  await assert.rejects(scoped(alice,client=>client.query("SELECT setval('stories_id_seq',999)")),{code:'42501'});
  assert.equal((await scoped(alice,client=>client.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS allowed"))).rows[0].allowed,false);
});
test('updates timestamps through the restricted trigger without exposing the legacy repair routine', async () => {
  await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date,updated_at) VALUES ('old','Ancienne','Old','M65','NOW','1970-01-01')");
  const result=await call('put','/periods/:id',{wikidata_id:'Q999907',label:{fr:'Modifiée'},start_date:'M65',end_date:'NOW'},{id:'old'});
  assert.equal(result.statusCode,200);
  assert.ok(new Date(result.payload.updated_at).getUTCFullYear()>2020);
  await assert.rejects(scoped(alice,client=>client.query('SELECT public.set_updated_at()')),{code:'42501'});
  assert.equal((await pool.query("SELECT to_regprocedure('public.maintain_period_relations()') AS routine")).rows[0].routine,null);
});

test('adding a presentation enrolls the period in its context atomically and enforces ownership', async () => {
  const body = { periodId:'root', targetStoryId:'2', operation:'add' };
  const success = await call('post','/stories/:contextId/presentations',body,{contextId:'1'});
  assert.equal(success.statusCode,204);
  assert.equal((await pool.query("SELECT * FROM story_periods WHERE story_id=1 AND period_id='root'")).rowCount,1);
  assert.equal((await pool.query('SELECT * FROM story_period_presentations')).rowCount,1);
  assert.equal((await call('post','/stories/:contextId/presentations',body,{contextId:'1'})).statusCode,204);
  assert.equal((await pool.query('SELECT * FROM story_period_presentations')).rowCount,1);
  assert.equal((await call('post','/stories/:contextId/presentations',{...body,targetStoryId:'1'},{contextId:'1'})).statusCode,400);
  assert.equal((await call('post','/stories/:contextId/presentations',body,{contextId:'3'})).statusCode,404);
  assert.equal((await pool.query("SELECT * FROM story_periods WHERE story_id=3 AND period_id='root'")).rowCount,0);
});
test('a missing target period rolls back enrollment in the context', async () => {
  const response = await call('post','/stories/:contextId/presentations',{periodId:'root',targetStoryId:'3',operation:'add'},{contextId:'1'});
  assert.ok(response.statusCode >= 400);
  assert.equal((await pool.query("SELECT * FROM story_periods WHERE story_id=1 AND period_id='root'")).rowCount,0);
});
