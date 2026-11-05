// Actual compiled route handlers + real PostgreSQL transactions/RLS. No TCP, no .env, no remote pool.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';

const socket = process.env.TIMELINE_TEST_SOCKET;
const database = process.env.TIMELINE_TEST_DATABASE;
assert.ok(socket?.startsWith('/'), 'Local Unix socket required.');
assert.match(database ?? '', /^universaltimeline_test_[a-z0-9_]+$/, 'Disposable database required.');
const pool = new pg.Pool({ host: socket, port: 55439, database, max: 4, statement_timeout: 10000 });
const alice = '00000000-0000-0000-0000-000000000001', bob = '00000000-0000-0000-0000-000000000002';
const category = '00000000-0000-0000-0000-000000000010';
const tx = operation => runInTransaction(pool, async client => {
  await applyPrincipal(client, principalContext.getStore() ?? { userId: null, isAdmin: false });
  return operation(client);
});
// Substitute the connection provider before importing routes; database.js must never load server/.env.
mock.module(new URL('../dist/api/database.js', import.meta.url), { namedExports: {
  withTransaction: tx, query: (sql, params) => tx(client => client.query(sql, params)),
} });
const { default: router } = await import('../dist/api/routes.js');

async function call(method, path, body = {}, params = {}, userId = alice, search = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `Missing route ${method} ${path}`);
  const res = { statusCode: 200, payload: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send() { return this; } };
  await principalContext.run({ userId, isAdmin: false }, () => route.route.stack[0].handle({ body, params, query: search }, res));
  return res;
}
const awaitMigration = await readFile(new URL('../../database/migrations/20261102001509_frise_only_period_hierarchy.sql', import.meta.url),'utf8');
const periodBody = { id: 'new', wikidata_id: 'Q123', label: { fr: 'Nouvelle' }, start_date: 'M65', end_date: 'NOW', categories: [{ id: category }] };
const links = async () => (await pool.query('SELECT period_id FROM public.story_periods WHERE story_id=1 ORDER BY period_id')).rows.map(row => row.period_id);

before(async () => {
  await pool.query(`
    DO $roles$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $roles$;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$ SELECT nullif(auth.jwt()->>'sub','')::uuid $$;
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
    CREATE TABLE public.periods (id text PRIMARY KEY, wikidata_id text UNIQUE, label_fr text, label_en text, description_fr text, description_en text, start_date text, end_date text, start_years_bp numeric, end_years_bp numeric, parent_id text REFERENCES periods ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.events (id text PRIMARY KEY, wikidata_id text UNIQUE, label_fr text, label_en text, description_fr text, description_en text, date text, date_years_bp numeric, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.categories (id varchar PRIMARY KEY, label_fr text, label_en text, description_fr text, description_en text);
    CREATE TABLE public.period_categories (period_id text REFERENCES periods, category_id varchar REFERENCES categories, PRIMARY KEY(period_id,category_id));
    CREATE TABLE public.event_categories (event_id text REFERENCES events, category_id varchar REFERENCES categories, PRIMARY KEY(event_id,category_id));
    CREATE TABLE public.stories (id serial PRIMARY KEY, title_fr text, title_en text, description_fr text, description_en text, author text, is_public boolean DEFAULT true, parent_story_id int REFERENCES stories, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.story_periods (story_id int REFERENCES stories, period_id text REFERENCES periods, PRIMARY KEY(story_id,period_id));
    CREATE TABLE public.story_events (story_id int REFERENCES stories, event_id text REFERENCES events, PRIMARY KEY(story_id,event_id));
    CREATE TABLE public.story_categories (story_id int REFERENCES stories, category_id varchar REFERENCES categories, PRIMARY KEY(story_id,category_id));
    CREATE TABLE public.story_anchors (id serial PRIMARY KEY, story_id int REFERENCES stories, anchor_type text, anchor_id text, UNIQUE(story_id,anchor_type,anchor_id));
  `);
  await pool.query(await readFile(new URL('../../database/migrations/20261029090427_story_access.sql', import.meta.url), 'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261031204007_story_period_hierarchy.sql', import.meta.url), 'utf8'));
  await runInTransaction(pool,client=>client.query(awaitMigration));
  await pool.query(await readFile(new URL('../../database/migrations/20261031220914_hybrid_catalogue_search.sql',import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261102075026_story_entry_points.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261102131202_story_period_presentations.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261104132539_navigation_without_wrapper_periods.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261104184833_story_entry_point_display.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261102105902_account_profiles.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261102110027_account_functions_private_schema.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261102223946_story_event_importance.sql', import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../database/migrations/20261104234615_wikidata_fact_sources.sql', import.meta.url),'utf8'));
  // Frises are signed by a username: both accounts sign up with one.
  await pool.query(`INSERT INTO auth.users (id, raw_user_meta_data) VALUES ($1, '{"username":"Alice"}'),($2, '{"username":"Bob"}')`, [alice,bob]);
});
beforeEach(async () => {
  await pool.query('TRUNCATE stories,periods,events,categories,period_categories,event_categories,story_categories,story_periods,story_events,story_anchors RESTART IDENTITY CASCADE');
  await pool.query("INSERT INTO periods (id,label_fr,start_date,end_date) VALUES ('root','Original','M65','NOW'),('leaf','Feuille','M10','NOW'); INSERT INTO events(id,label_fr) VALUES ('e1','Un'),('e2','Deux')");
  await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES ($1,'Catégorie','Category')", [category]);
  await pool.query("INSERT INTO stories(title_fr,is_public,owner_user_id) VALUES ('Alice parent',false,$1),('Alice enfant',false,$1),('Bob publique',true,$2),('Bob privée',false,$2),('Alice autre',false,$1)", [alice,bob]);
});
after(() => pool.end());

test('creates shared period facts and categories without a global parent',async()=>{
 const res=await call('post','/periods',periodBody);assert.equal(res.statusCode,201);assert.equal(res.payload.parent_id,null);
 assert.equal(res.payload.categories[0].id,category);
 assert.equal((await pool.query("SELECT * FROM story_periods WHERE period_id='new'")).rowCount,0);
});
test('a missing parent leaves neither a new period nor categories behind', async () => {
  assert.equal((await call('post','/periods',{...periodBody,parent_id:'missing'})).statusCode,400);
  assert.equal((await pool.query("SELECT * FROM periods WHERE id='new'")).rowCount,0);
  assert.equal((await pool.query('SELECT * FROM period_categories')).rowCount,0);
});
test('a category failure rolls back a creation and its already-applied parent', async () => {
  assert.equal((await call('post','/periods',{...periodBody,categories:[{id:bob}]})).statusCode,409);
  assert.equal((await pool.query("SELECT * FROM periods WHERE id='new'")).rowCount,0);
});
test('refuses a catalogue parent before changing shared metadata',async()=>{
 const res=await call('put','/periods/:id',{...periodBody,label:{fr:'Changed'},parent_id:'leaf'},{id:'root'});
 assert.equal(res.statusCode,400);assert.equal((await pool.query("SELECT label_fr FROM periods WHERE id='root'")).rows[0].label_fr,'Original');
});
test('a category refusal rolls back metadata and a valid detachment', async () => {
  const res=await call('put','/periods/:id',{...periodBody,label:{fr:'Changed'},parent_id:null,categories:[{id:bob}]},{id:'leaf'});
  assert.equal(res.statusCode,409);
  assert.deepEqual((await pool.query("SELECT label_fr FROM periods WHERE id='leaf'")).rows,[{label_fr:'Feuille'}]);
});
test('shared metadata edits preserve the placement in every frise',async()=>{
 await pool.query("INSERT INTO story_periods VALUES (1,'root',null),(1,'leaf','root')");
 assert.equal((await call('put','/periods/:id',periodBody,{id:'leaf'})).statusCode,200);
 assert.equal((await pool.query("SELECT parent_period_id FROM story_periods WHERE story_id=1 AND period_id='leaf'")).rows[0].parent_period_id,'root');
});
test('story creation preserves categories and defaults to the verified owner and private visibility', async () => {
  const res=await call('post','/stories',{title:{fr:'Nouvelle'},author:'Auteur',categories:[{id:category}]});
  assert.equal(res.statusCode,201); assert.equal(res.payload.owner_user_id,alice); assert.equal(res.payload.is_public,false);
  assert.equal(res.payload.categories[0].id,category);
  assert.equal((await call('post','/stories',{title:{fr:'Bad'},author:'Auteur',categories:[{id:bob}]})).statusCode,409);
  assert.equal((await pool.query("SELECT * FROM stories WHERE title_fr='Bad'")).rowCount,0);
});
test('a picker selection with one absent entity changes no associations', async () => {
  const res=await call('post','/stories/:storyId/periods',{ids:['leaf','missing'],operation:'add'},{storyId:'1'});
  assert.equal(res.statusCode,404); assert.deepEqual(await links(),[]);
});
test('replaying the same batch adds or removes links without duplicates', async () => {
  for(let i=0;i<2;i++) assert.equal((await call('post','/stories/:storyId/periods',{ids:['root','leaf','root'],operation:'add'},{storyId:'1'})).statusCode,200);
  assert.deepEqual(await links(),['leaf','root']);
  for(let i=0;i<2;i++) assert.equal((await call('post','/stories/:storyId/periods',{ids:['root','leaf'],operation:'remove'},{storyId:'1'})).statusCode,200);
  assert.deepEqual(await links(),[]);
});
test('a failed removal rolls back all deletions in the selection', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root'),(1,'leaf'); CREATE FUNCTION reject_removal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.period_id='root' THEN RAISE EXCEPTION 'refuse'; END IF; RETURN OLD; END; $$; CREATE TRIGGER reject_removal BEFORE DELETE ON story_periods FOR EACH ROW EXECUTE FUNCTION reject_removal()");
  try {
    assert.equal((await call('post','/stories/:storyId/periods',{ids:['root','leaf'],operation:'remove'},{storyId:'1'})).statusCode,500);
    assert.deepEqual(await links(),['leaf','root']);
  } finally { await pool.query('DROP TRIGGER reject_removal ON story_periods; DROP FUNCTION reject_removal()'); }
});
test('FOR UPDATE refuses another owner’s public story, including no-op removals', async () => {
  for(const storyId of ['3','4']) for(const operation of ['add','remove']) {
    assert.equal((await call('post','/stories/:storyId/events',{ids:['e1'],operation},{storyId})).statusCode,404);
  }
  assert.equal((await pool.query('SELECT * FROM story_events')).rowCount,0);
});
test('a batch can attach several children belonging to the same owner', async () => {
  assert.equal((await call('post','/stories/:parentId/child-stories',{childStoryIds:['2','5']},{parentId:'1'})).statusCode,200);
  assert.deepEqual((await pool.query('SELECT parent_story_id FROM stories WHERE id IN (2,5)')).rows,[{parent_story_id:1},{parent_story_id:1}]);
});
test('one foreign or missing child rolls back the other child attachments', async () => {
  for(const other of ['3','99']) {
    assert.equal((await call('post','/stories/:parentId/child-stories',{childStoryIds:['2',other]},{parentId:'1'})).statusCode,404);
    assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id,null);
  }
});
test('self and ancestor attachments are refused without changing the story tree', async () => {
  await pool.query('UPDATE stories SET parent_story_id=1 WHERE id=2');
  for(const ids of [['2'],['1']]) assert.equal((await call('post','/stories/:parentId/child-stories',{childStoryIds:ids},{parentId:'2'})).statusCode,409);
});
test('a wrong parent cannot delete a child’s anchors before the relation is checked', async () => {
  await pool.query("UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'event','e1')");
  assert.equal((await call('delete','/stories/:parentId/child-stories/:childId',{}, {parentId:'5',childId:'2'})).statusCode,404);
  assert.equal((await pool.query('SELECT * FROM story_anchors WHERE story_id=2')).rowCount,1);
});
test('a refused detachment restores the deleted anchors in the same transaction', async () => {
  await pool.query("UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'event','e1'); ALTER TABLE stories ADD CONSTRAINT require_parent CHECK (id<>2 OR parent_story_id IS NOT NULL)");
  try {
    assert.equal((await call('delete','/stories/:parentId/child-stories/:childId',{}, {parentId:'1',childId:'2'})).statusCode,409);
    assert.equal((await pool.query('SELECT * FROM story_anchors WHERE story_id=2')).rowCount,1);
    assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id,1);
  } finally { await pool.query('ALTER TABLE stories DROP CONSTRAINT require_parent'); }
});
test('concurrent crossed story attachments cannot both commit', async () => {
  const responses=await Promise.all([
    call('post','/stories/:parentId/child-stories',{childStoryIds:['2']},{parentId:'1'}),
    call('post','/stories/:parentId/child-stories',{childStoryIds:['1']},{parentId:'2'}),
  ]);
  assert.deepEqual(responses.map(res=>res.statusCode).sort(),[200,409]);
});
test('event batches add and remove the entire selection without duplicate links on replay', async () => {
  for(const operation of ['add','add','remove','remove']) {
    const res=await call('post','/stories/:storyId/events',{ids:['e1','e2'],operation},{storyId:'1'});
    assert.equal(res.statusCode,200);
    assert.equal((await pool.query('SELECT * FROM story_events WHERE story_id=1')).rowCount,operation==='add'?2:0);
  }
});
test('concurrent crossed period moves serialize within the owning frise',async()=>{
 await pool.query("INSERT INTO story_periods VALUES (1,'root',null),(1,'leaf',null)");
 const responses=await Promise.all([
 call('post','/stories/:storyId/periods',{ids:['root'],operation:'add',parentPeriodId:'leaf'},{storyId:'1'}),
 call('post','/stories/:storyId/periods',{ids:['leaf'],operation:'add',parentPeriodId:'root'},{storyId:'1'})]);
 assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);
});
test('wire normalization preserves historical date text and a blank end means NOW', async () => {
  const res=await call('post','/periods',{...periodBody,wikidata_id:' q123 ',start_date:'8. millennium BCE',end_date:''});
  assert.equal(res.statusCode,201);assert.equal(res.payload.wikidata_id,'Q123');
  assert.equal(res.payload.start_date,'8. millennium BCE');assert.equal(res.payload.start_years_bp,null);assert.equal(res.payload.end_date,'NOW');
});
test('invalid visibility or multilingual values do not create any rows', async () => {
  assert.equal((await call('post','/stories',{title:{fr:'Invalid'},author:'Auteur',isPublic:'false'})).statusCode,400);
  assert.equal((await call('post','/periods',{...periodBody,label:{fr:{wrong:'shape'}}})).statusCode,400);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM stories')).rows[0].count,5);
  assert.equal((await pool.query("SELECT * FROM periods WHERE id='new'")).rowCount,0);
});
test('the numeric single-child legacy payload still attaches a story', async () => {
  assert.equal((await call('post','/stories/:parentId/child-stories',{childStoryId:2},{parentId:'1'})).statusCode,200);
  assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id,1);
});
test('search filters periods and events by historical varchar category IDs', async () => {
  await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES ('legacy-category','Ancienne','Legacy'); INSERT INTO period_categories VALUES ('root','legacy-category'); INSERT INTO event_categories VALUES ('e1','legacy-category'); UPDATE events SET label_fr='Original événement' WHERE id='e1'");
  const res=await call('get','/search',{}, {},alice,{q:'Original',category:'legacy-category'});
  assert.equal(res.statusCode,200);assert.deepEqual(res.payload.periods.map(row=>row.id),['root']);assert.deepEqual(res.payload.events.map(row=>row.id),['e1']);
});

test('reads catalogue roots, children, details and categories through the real SQL repositories', async () => {
  await pool.query("UPDATE periods SET wikidata_id='Q123',start_years_bp=65000000,end_years_bp=0 WHERE id='root'");
  await pool.query("INSERT INTO period_categories VALUES ('root',$1)",[category]);
  await pool.query("INSERT INTO event_categories VALUES ('e1',$1)",[category]);
  const roots=await call('get','/periods'); assert.equal(roots.statusCode,200);
  assert.deepEqual(roots.payload.map(row=>row.id),['root','leaf']); assert.equal(roots.payload[0].categories[0].id,category);
  const children=await call('get','/periods/:id/children',{}, {id:'root'});
  assert.equal(children.statusCode,410);
  const detail=await call('get','/periods/:id',{}, {id:'root'});
  const byQid=await call('get','/periods/wikidata/:wikidataId',{}, {wikidataId:'q123'});
  assert.equal(detail.statusCode,200); assert.equal(byQid.statusCode,200); assert.deepEqual(detail.payload,byQid.payload);
  assert.equal(detail.payload.startYearsBP,65000000); assert.equal(detail.payload.hasChildren,false);
  const events=await call('get','/events'); assert.equal(events.statusCode,200);
  assert.equal(events.payload.find(row=>row.id==='e1').categories[0].label.en,'Category');
  const categories=await call('get','/categories'); assert.equal(categories.statusCode,200); assert.equal(categories.payload[0].id,category);
});
test('read services preserve story ownership, private visibility and linked details under real RLS', async () => {
  await pool.query('INSERT INTO story_categories VALUES (1,$1)',[category]);
  await pool.query("INSERT INTO story_periods VALUES (1,'root'); INSERT INTO story_events VALUES (1,'e1'); UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','root')");
  const list=await call('get','/stories'); assert.equal(list.statusCode,200);
  assert.deepEqual(list.payload.map(row=>row.id).sort(),[1,2,3,5]);
  assert.equal(list.payload.find(row=>row.id===1).owner_user_id,alice);
  const detail=await call('get','/stories/:id',{}, {id:'1'});
  assert.equal(detail.statusCode,200); assert.equal(detail.payload.isPublic,false); assert.equal(detail.payload.ownerUserId,alice);
  assert.equal(detail.payload.categories[0].id,category); assert.deepEqual(detail.payload.periods.map(row=>row.id),['root']);
  assert.deepEqual(detail.payload.events.map(row=>row.id),['e1']);
  assert.deepEqual(detail.payload.childStories,[{id:'2',title:{fr:'Alice enfant',en:'Alice enfant'},anchors:[{type:'period',id:'root'}],atRoot:false}]);
  assert.equal((await call('get','/stories/:id',{}, {id:'1'},bob)).statusCode,404);
  assert.equal((await call('get','/stories/:id',{}, {id:'3'},null)).statusCode,200);
  assert.deepEqual((await call('get','/stories',{}, {},null)).payload.map(row=>row.id),[3]);
  assert.equal((await call('get','/stories/:storyId/periods',{}, {storyId:'1'})).payload[0].id,'root');
  assert.equal((await call('get','/stories/:storyId/events',{}, {storyId:'1'})).payload[0].id,'e1');
});
test('suggestions combine period and event anchors without exposing another owner’s private stories', async () => {
  await pool.query("UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','root'),(2,'event','e1')");
  for (const search of [{story_id:'1',period_ids:'root'}, {story_id:'1',event_ids:'e1'}, {story_id:'1',period_ids:'root',event_ids:'e1'}]) {
    const found=await call('get','/stories/suggestions',{}, {},alice,search); assert.equal(found.statusCode,200); assert.deepEqual(found.payload.map(row=>row.id),[2]);
    const hidden=await call('get','/stories/suggestions',{}, {},bob,search); assert.equal(hidden.statusCode,200); assert.deepEqual(hidden.payload,[]);
  }
});

test('rejects reversed geological, equal and impossible calendar periods before persisting any row', async () => {
  for(const [start_date,end_date] of [['M10','M65'],['M65','M65'],['2024-02-30','NOW'],['NOW','M65']]) {
    const res=await call('post','/periods',{...periodBody,start_date,end_date});
    assert.equal(res.statusCode,400); assert.equal((await pool.query("SELECT * FROM periods WHERE id='new'")).rowCount,0);
    assert.equal((await pool.query('SELECT * FROM period_categories')).rowCount,0);
  }
});
test('stores timestamp text unchanged and retains its seconds and timezone in the numerical coordinate', async () => {
  const date='1944-06-06T16:32:45+02:00'; const before=Date.now();
  const res=await call('post','/events',{id:'seconds',label:{fr:'Secondes'},date});const after=Date.now();
  assert.equal(res.statusCode,201); assert.equal(res.payload.date,date);
  const bp=Number(res.payload.date_years_bp), year=365.25*86400000;
  const instant=Date.parse('1944-06-06T14:32:45Z');
  assert.ok(bp>=(before-instant)/year && bp<=(after-instant)/year);
});
test('retains an unrecognized historical expression without manufacturing a present-day coordinate', async () => {
  const date='8. millennium BCE';const res=await call('post','/events',{id:'historical',label:{fr:'Historique'},date});
  assert.equal(res.statusCode,201);assert.equal(res.payload.date,date);assert.equal(res.payload.date_years_bp,null);
  const list=await call('get','/events');assert.equal(list.payload.find(row=>row.id==='historical').date,date);
});
test('keeps future period bounds distinct and ordered, with metadata and parent in the same transaction', async () => {
  const res=await call('post','/periods',{...periodBody,start_date:'2030-01-01',end_date:'2031-01-01'});
  assert.equal(res.statusCode,201);assert.equal(res.payload.start_date,'2030-01-01');assert.equal(res.payload.end_date,'2031-01-01');
  assert.ok(Number(res.payload.start_years_bp)<0);assert.ok(Number(res.payload.start_years_bp)>Number(res.payload.end_years_bp));
  assert.equal(res.payload.parent_id,null);assert.equal(res.payload.categories[0].id,category);
});


test('replaces the root atomically while keeping its associated branch and all events', async () => {
  await pool.query("INSERT INTO periods(id,label_fr) VALUES ('other','Autre'),('grandchild','Suite'); INSERT INTO story_periods VALUES (1,'root',null),(1,'leaf','root'),(1,'grandchild','leaf'),(1,'other',null); INSERT INTO story_events VALUES (1,'e1')");
  const result = await call('put', '/stories/:storyId/root-period', { periodId: 'leaf' }, { storyId: '1' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(await links(), ['grandchild', 'leaf']);
  assert.equal((await pool.query('SELECT * FROM story_events WHERE story_id=1')).rowCount, 1);
  assert.equal((await pool.query("SELECT NULL::text AS parent_id FROM periods WHERE id='leaf'")).rows[0].parent_id, null);
});
test('rejects missing or malformed roots without losing the original period associations', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root'),(1,'leaf')");
  for (const [periodId, expected] of [['missing',404], ['',400], [null,400]]) {
    assert.equal((await call('put','/stories/:storyId/root-period',{periodId},{storyId:'1'})).statusCode,expected);
    assert.deepEqual(await links(),['leaf','root']);
  }
});
test('does not allow another owner to replace the root of a public story', async () => {
  await pool.query("INSERT INTO story_periods VALUES (3,'root')");
  assert.equal((await call('put','/stories/:storyId/root-period',{periodId:'leaf'},{storyId:'3'})).statusCode,404);
  assert.equal((await pool.query("SELECT period_id FROM story_periods WHERE story_id=3")).rows[0].period_id,'root');
});
test('adds a child story and its period anchor in the same transaction', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root')");
  const result=await call('post','/stories/:parentId/child-stories',{childStoryIds:['2'],anchor:{anchorType:'period',anchorId:'root'}},{parentId:'1'});
  assert.equal(result.statusCode,200);
  assert.deepEqual((await pool.query('SELECT anchor_type,anchor_id FROM story_anchors WHERE story_id=2')).rows,[{anchor_type:'period',anchor_id:'root'}]);
});
test('rolls back the child link when its requested anchor does not belong to the parent story', async () => {
  const result=await call('post','/stories/:parentId/child-stories',{childStoryIds:['2'],anchor:{anchorType:'period',anchorId:'leaf'}},{parentId:'1'});
  assert.equal(result.statusCode,409);
  assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id,null);
});
test('returns real preview periods and events with list stories', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root'); INSERT INTO story_events VALUES (1,'e1')");
  const result=await call('get','/stories');
  assert.equal(result.statusCode,200);
  const story=result.payload.find(s=>s.id===1);
  assert.equal(story.preview_periods[0].id,'root');
  assert.equal(story.preview_events[0].id,'e1');
});

test('cleans obsolete period anchors after replacing the root and preserves event anchors', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root'),(1,'leaf'); UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','root'),(2,'period','leaf'),(2,'event','e1')");
  assert.equal((await call('put','/stories/:storyId/root-period',{periodId:'leaf'},{storyId:'1'})).statusCode,200);
  assert.deepEqual((await pool.query('SELECT anchor_type,anchor_id FROM story_anchors ORDER BY anchor_type,anchor_id')).rows,[{anchor_type:'event',anchor_id:'e1'},{anchor_type:'period',anchor_id:'leaf'}]);
});
test('restores the original root and its branch when inserting the replacement is refused', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root')");
  await pool.query(`CREATE FUNCTION public.test_reject_root() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.period_id='leaf' THEN RAISE EXCEPTION 'test refusal'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_reject_root BEFORE INSERT ON public.story_periods FOR EACH ROW EXECUTE FUNCTION public.test_reject_root()`);
  try {
    assert.equal((await call('put','/stories/:storyId/root-period',{periodId:'leaf'},{storyId:'1'})).statusCode,500);
    assert.deepEqual(await links(),['root']);
  } finally { await pool.query('DROP TRIGGER test_reject_root ON public.story_periods; DROP FUNCTION public.test_reject_root()'); }
});

test('places an already-associated catalogue root below Univers in this frise only', async () => {
  await pool.query("INSERT INTO periods(id,label_fr) VALUES ('univers','Univers')");
  const add = (storyId, ids, parentPeriodId) => call('post','/stories/:storyId/periods',{ids,operation:'add',...(parentPeriodId !== undefined ? {parentPeriodId}: {})},{storyId});
  assert.equal((await add('1',['univers','root'])).statusCode,200);
  assert.equal((await add('2',['root'])).statusCode,200);
  for (let replay=0; replay<2; replay++) assert.equal((await add('1',['root'],'univers')).statusCode,200);
  assert.deepEqual(await links(),['root','univers']);
  const list=await call('get','/stories/:storyId/periods',{}, {storyId:'1'});
  assert.equal(list.statusCode,200); assert.equal(list.payload.find(p=>p.id==='root').story_parent_id,'univers');
  const detail=await call('get','/stories/:id',{}, {id:'1'});
  assert.equal(detail.statusCode,200); assert.equal(detail.payload.periods.find(p=>p.id==='root').storyParentId,'univers');
  const other=await call('get','/stories/:storyId/periods',{}, {storyId:'2'});
  assert.equal(other.payload[0].story_parent_id,null);
  assert.equal((await pool.query("SELECT NULL::text AS parent_id FROM periods WHERE id='root'")).rows[0].parent_id,null);
  assert.equal((await call('put','/stories/:storyId/root-period',{periodId:'univers'},{storyId:'1'})).statusCode,200);
  assert.deepEqual(await links(),['root','univers']);
});

test('rejects cycles and missing parents without changing existing placements', async () => {
  await pool.query("INSERT INTO story_periods(story_id,period_id,parent_period_id) VALUES (1,'root',null),(1,'leaf','root')");
  const place=body=>call('post','/stories/:storyId/periods',{operation:'add',...body},{storyId:'1'});
  assert.equal((await place({ids:['root'],parentPeriodId:'leaf'})).statusCode,409);
  assert.equal((await place({ids:['root'],parentPeriodId:'root'})).statusCode,409);
  assert.equal((await place({ids:['leaf'],parentPeriodId:'missing'})).statusCode,404);
  assert.deepEqual((await pool.query('SELECT period_id,parent_period_id FROM story_periods WHERE story_id=1 ORDER BY period_id')).rows,[{period_id:'leaf',parent_period_id:'root'},{period_id:'root',parent_period_id:null}]);
  assert.equal((await place({ids:['leaf'],parentPeriodId:null})).statusCode,200);
  const rows=(await call('get','/stories/:storyId/periods',{}, {storyId:'1'})).payload;
  assert.equal(rows.find(p=>p.id==='leaf').story_parent_id,null);
  assert.equal((await pool.query("SELECT NULL::text AS parent_id FROM periods WHERE id='leaf'")).rows[0].parent_id,null);
});

test('new memberships are roots and reject a parent outside their frise',async()=>{
 await pool.query("INSERT INTO story_periods VALUES (1,'leaf',null)");
 const result=await call('post','/stories/:storyId/periods',{ids:['leaf'],operation:'add',parentPeriodId:'root'},{storyId:'1'});
 assert.equal(result.statusCode,409);assert.deepEqual(await links(),['leaf']);
 assert.equal((await call('get','/stories/:storyId/periods',{}, {storyId:'1'})).payload[0].story_parent_id,null);
});

test('blocks catalogue deletion when a period is still a scoped parent', async () => {
  await pool.query("INSERT INTO periods(id,label_fr) VALUES ('scoped-parent','Parent'); INSERT INTO story_periods(story_id,period_id,parent_period_id) VALUES (1,'scoped-parent',null),(1,'leaf','scoped-parent')");
  assert.equal((await call('delete','/periods/:id',{}, {id:'scoped-parent'})).statusCode,409);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM periods WHERE id='scoped-parent'")).rows[0].n,1);
});

// ─── Frise créée depuis une période ──────────────────────────────────────────
const sourceRows = async storyId => ({
  story: (await pool.query('SELECT title_fr,is_public,parent_story_id FROM stories WHERE id=$1', [storyId])).rows,
  periods: (await pool.query('SELECT period_id,parent_period_id FROM story_periods WHERE story_id=$1 ORDER BY period_id', [storyId])).rows,
  events: (await pool.query('SELECT event_id FROM story_events WHERE story_id=$1 ORDER BY event_id', [storyId])).rows,
});
async function seedSplitSource() {
  await pool.query(`
    INSERT INTO periods(id,label_fr,start_date,end_date,start_years_bp,end_years_bp) VALUES
      ('apollo','Apollo','1961-05-25','1972-12-19',65.4,53.9), ('gemini','Gemini','1961-12-07','1966-11-15',64.9,60.0), ('mir','Mir','1986-02-20','2001-03-23',40.7,25.6);
    INSERT INTO events(id,label_fr,date,date_years_bp) VALUES
      ('in','Apollo 11','1969-07-16',57.3), ('edge','Fin Apollo','1972-12-19',53.9), ('out','Mir','1986-02-20',40.7), ('undated','Sans date',null,null);
    UPDATE stories SET is_public=true WHERE id=1;
    INSERT INTO story_periods(story_id,period_id,parent_period_id) VALUES (1,'root',null),(1,'apollo','root'),(1,'gemini','apollo'),(1,'mir','root');
    INSERT INTO story_events(story_id,event_id) VALUES (1,'in'),(1,'edge'),(1,'out'),(1,'undated');
    INSERT INTO story_categories VALUES (1,'${category}');`);
}
test('creates a child frise from a period: its sub-periods move, the period stays as anchor, events are copied', async () => {
  await seedSplitSource();
  const before = await sourceRows(1);
  const result = await call('post', '/stories/:storyId/from-period', { periodId: 'apollo', title: '  Programme Apollo ' }, { storyId: '1' });
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.payload, { id: '6', parentStoryId: '1', periodId: 'apollo', periodCount: 1, eventCount: 2, movedPeriodCount: 1, linkedStoryCount: 0 });
  assert.deepEqual(await sourceRows(1), { ...before, periods: before.periods.filter(row => row.period_id !== 'gemini') });
  const created = await sourceRows(6);
  assert.deepEqual(created.story, [{ title_fr: 'Programme Apollo', is_public: true, parent_story_id: 1 }]);
  assert.deepEqual(created.periods, [
    { period_id: 'gemini', parent_period_id: null },
  ]);
  assert.deepEqual(created.events.map(row => row.event_id), ['edge', 'in']);
  assert.deepEqual((await pool.query('SELECT anchor_type,anchor_id FROM story_anchors WHERE story_id=6')).rows, [{ anchor_type: 'period', anchor_id: 'apollo' }]);
  assert.deepEqual((await pool.query('SELECT category_id FROM story_categories WHERE story_id=6')).rows, [{ category_id: category }]);
  assert.equal((await pool.query('SELECT owner_user_id FROM stories WHERE id=6')).rows[0].owner_user_id, alice);
});
test('an event on the first day of the period is copied even without a stored coordinate', async () => {
  await seedSplitSource();
  await pool.query("INSERT INTO events(id,label_fr,date) VALUES ('first-day','Discours','1961-05-25'); INSERT INTO story_events VALUES (1,'first-day')");
  const result = await call('post', '/stories/:storyId/from-period', { periodId: 'apollo', title: 'Apollo' }, { storyId: '1' });
  assert.deepEqual((await pool.query('SELECT event_id FROM story_events WHERE story_id=$1 ORDER BY event_id', [result.payload.id])).rows.map(row => row.event_id), ['edge', 'first-day', 'in']);
});
test('an undated leaf creates a frise without a wrapper or events', async () => {
  await seedSplitSource();
  await pool.query("INSERT INTO periods(id,label_fr) VALUES ('vague','Sans dates'); INSERT INTO story_periods(story_id,period_id) VALUES (1,'vague')");
  const result = await call('post', '/stories/:storyId/from-period', { periodId: 'vague', title: 'Vague' }, { storyId: '1' });
  assert.equal(result.statusCode, 201);
  assert.deepEqual([result.payload.periodCount, result.payload.eventCount], [0, 0]);
});
test('refuses another owner, a period outside the frise or a blank title without creating anything', async () => {
  await seedSplitSource();
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES (3,'apollo')");
  const count = async () => (await pool.query('SELECT count(*)::int AS n FROM stories')).rows[0].n;
  const total = await count();
  assert.equal((await call('post', '/stories/:storyId/from-period', { periodId: 'apollo', title: 'Copie' }, { storyId: '3' })).statusCode, 404);
  assert.equal((await call('post', '/stories/:storyId/from-period', { periodId: 'leaf', title: 'Absente' }, { storyId: '1' })).statusCode, 404);
  assert.equal((await call('post', '/stories/:storyId/from-period', { periodId: 'apollo', title: '   ' }, { storyId: '1' })).statusCode, 400);
  // Anonymous writes are refused by the middleware in production; the database refuses them too.
  assert.equal((await call('post', '/stories/:storyId/from-period', { periodId: 'apollo', title: 'Anonyme' }, { storyId: '1' }, null)).statusCode, 403);
  assert.equal(await count(), total);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM story_anchors')).rows[0].n, 0);
});
test('a child moving to another parent drops its old anchors, while relinking to the same parent keeps them', async () => {
  await pool.query("INSERT INTO story_periods VALUES (1,'root'),(5,'leaf'); UPDATE stories SET parent_story_id=1 WHERE id=2; INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES (2,'period','root')");
  assert.equal((await call('post', '/stories/:parentId/child-stories', { childStoryIds: ['2'] }, { parentId: '1' })).statusCode, 200);
  assert.deepEqual((await pool.query('SELECT anchor_id FROM story_anchors WHERE story_id=2')).rows, [{ anchor_id: 'root' }]);
  assert.equal((await call('post', '/stories/:parentId/child-stories', { childStoryIds: ['2'], anchor: { anchorType: 'period', anchorId: 'leaf' } }, { parentId: '5' })).statusCode, 200);
  assert.deepEqual((await pool.query('SELECT anchor_id FROM story_anchors WHERE story_id=2')).rows, [{ anchor_id: 'leaf' }]);
  assert.equal((await pool.query('SELECT parent_story_id FROM stories WHERE id=2')).rows[0].parent_story_id, 5);
});
