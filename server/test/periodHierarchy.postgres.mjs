// Real PostgreSQL 17, local Unix socket and disposable database only.
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { changeStoryAssociations } from '../dist/services/storyAssociations.js';

const pool = testPool();
const migration = await readFile(new URL('../../database/migrations/20261102001509_frise_only_period_hierarchy.sql', import.meta.url), 'utf8');
const previous = await readFile(new URL('../../database/migrations/20261031204007_story_period_hierarchy.sql', import.meta.url), 'utf8');
const place = (storyId, ids, parentId) => runInTransaction(pool, c => changeStoryAssociations(c, storyId, 'period', ids, false, parentId));
const placements = async storyId => (await pool.query('SELECT period_id,parent_period_id FROM story_periods WHERE story_id=$1 ORDER BY period_id', [storyId])).rows;
let migrated, beforeMigration, afterMigration;
before(async () => {
  await pool.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE TABLE periods (id varchar PRIMARY KEY, label_fr text, parent_id varchar REFERENCES periods(id));
    CREATE TABLE stories (id integer PRIMARY KEY);
    CREATE TABLE story_periods (story_id integer REFERENCES stories(id),period_id varchar REFERENCES periods(id),PRIMARY KEY(story_id,period_id));
    CREATE TABLE story_anchors (story_id integer,anchor_type text,anchor_id varchar);
    INSERT INTO periods VALUES ('cosmos','Univers',null),('root','Racine','cosmos'),('child','Enfant','root'),('grandchild','Suite','child'),('other','Autre',null);
    INSERT INTO stories VALUES (1),(2);
  `);
  await pool.query(previous);
  await pool.query(`INSERT INTO story_periods(story_id,period_id,parent_override,parent_period_id) VALUES
    (1,'root',false,null),(1,'child',false,null),(1,'grandchild',false,null),
    (2,'child',false,null),(2,'grandchild',true,null)`);
  // A refused migration must undo even its initial placement materialization.
  await pool.query("UPDATE periods SET parent_id='child' WHERE id='root'");
  const beforeFailure = (await pool.query('SELECT * FROM story_periods ORDER BY story_id,period_id')).rows;
  await assert.rejects(runInTransaction(pool,c=>c.query(migration)), /period cycle/);
  assert.deepEqual((await pool.query('SELECT * FROM story_periods ORDER BY story_id,period_id')).rows,beforeFailure);
  await pool.query("UPDATE periods SET parent_id='cosmos' WHERE id='root'");
  beforeMigration = (await pool.query('SELECT id,label_fr FROM periods ORDER BY id')).rows;
  await runInTransaction(pool, c => c.query(migration));
  migrated = await pool.query('SELECT story_id,period_id,parent_period_id FROM story_periods ORDER BY story_id,period_id');
  afterMigration = (await pool.query('SELECT id,label_fr FROM periods ORDER BY id')).rows;
});
beforeEach(async () => {
  await pool.query('TRUNCATE story_anchors,story_periods,stories,periods');
  await pool.query(`INSERT INTO periods(id,label_fr) VALUES ('root','Racine'),('child','Enfant'),('grandchild','Suite'),('other','Autre');
    INSERT INTO stories VALUES (1),(2);
    INSERT INTO story_periods VALUES (1,'root',null),(1,'child','root'),(1,'grandchild','child'),(1,'other',null),(2,'root',null),(2,'child',null)`);
});
after(() => pool.end());

test('migrates visible catalogue paths, explicit overrides and local roots without losing a membership or shared facts', async () => {
  assert.deepEqual(migrated.rows, [
    {story_id:1,period_id:'child',parent_period_id:'root'},
    {story_id:1,period_id:'grandchild',parent_period_id:'child'},
    {story_id:1,period_id:'root',parent_period_id:null},
    {story_id:2,period_id:'child',parent_period_id:null},
    {story_id:2,period_id:'grandchild',parent_period_id:null},
  ]);
  assert.deepEqual(afterMigration, beforeMigration);
  const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('periods','story_periods')")).rows.map(r=>r.column_name);
  assert.ok(!columns.includes('parent_id')); assert.ok(!columns.includes('parent_override'));
});
test('moves in one frise without changing another frise or the shared record', async () => {
  const other = await placements(2);
  await place('1',['child'],'other');
  assert.equal((await placements(1)).find(p=>p.period_id==='child').parent_period_id,'other');
  assert.deepEqual(await placements(2),other);
  assert.equal((await pool.query("SELECT label_fr FROM periods WHERE id='child'")).rows[0].label_fr,'Enfant');
});
test('makes new memberships roots and preserves a previous placement on an idempotent add', async () => {
  await place('2',['other'],undefined); await place('1',['child'],undefined);
  assert.equal((await placements(2)).find(p=>p.period_id==='other').parent_period_id,null);
  assert.equal((await placements(1)).find(p=>p.period_id==='child').parent_period_id,'root');
});
test('refuses a parent which exists only outside this frise, and missing targets', async () => {
  await assert.rejects(place('2',['child'],'grandchild'),{status:409});
  await assert.rejects(place('1',['child'],'missing'),{status:404});
  assert.equal((await placements(2)).find(p=>p.period_id==='child').parent_period_id,null);
});
test('refuses self parenting and indirect cycles, including direct SQL writes', async () => {
  await assert.rejects(place('1',['root'],'root'),{status:409});
  await assert.rejects(place('1',['root'],'grandchild'),{code:'23514'});
  await assert.rejects(pool.query("UPDATE story_periods SET parent_period_id='grandchild' WHERE story_id=1 AND period_id='root'"),{code:'23514'});
  assert.equal((await placements(1)).find(p=>p.period_id==='root').parent_period_id,null);
});
test('enforces same-frise parenting at the database constraint', async () => {
  await assert.rejects(pool.query("UPDATE story_periods SET parent_period_id='grandchild' WHERE story_id=2 AND period_id='child'"),{code:'23503'});
});
test('removing a period keeps children as roots and removes obsolete child-frise anchors', async () => {
  await pool.query("INSERT INTO story_anchors VALUES (2,'period','child')");
  // Only this fixture needs a parent relation for anchor cleanup.
  await pool.query('ALTER TABLE stories ADD COLUMN parent_story_id integer; UPDATE stories SET parent_story_id=1 WHERE id=2');
  try {
    await runInTransaction(pool,c=>changeStoryAssociations(c,'1','period',['child'],true));
    assert.equal((await placements(1)).find(p=>p.period_id==='grandchild').parent_period_id,null);
    assert.equal((await pool.query('SELECT * FROM story_anchors')).rowCount,0);
    assert.equal((await pool.query("SELECT * FROM periods WHERE id='child'")).rowCount,1);
    assert.ok((await placements(2)).some(p=>p.period_id==='child'));
  } finally { await pool.query('ALTER TABLE stories DROP COLUMN parent_story_id'); }
});
test('serializes crossed concurrent moves within a frise so only one commits', async () => {
  await place('1',['child'],null);
  const results = await Promise.allSettled([place('1',['root'],'child'),place('1',['child'],'root')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'23514');
});
test('rejects moving the identity of a membership through direct SQL', async () => {
  await assert.rejects(pool.query("UPDATE story_periods SET story_id=2 WHERE story_id=1 AND period_id='other'"),{code:'23514'});
});

test('direct concurrent SQL cannot create a cycle outside the API', async () => {
  await place('1',['child'],null);
  const result=await Promise.allSettled([
    pool.query("UPDATE story_periods SET parent_period_id='child' WHERE story_id=1 AND period_id='root'"),
    pool.query("UPDATE story_periods SET parent_period_id='root' WHERE story_id=1 AND period_id='child'")
  ]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.ok(['23514','40P01'].includes(result.find(r=>r.status==='rejected').reason.code));
});
