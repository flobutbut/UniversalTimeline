// Fictional data and a local Unix socket only. Never uses the production connection.
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {testPool,authFixture,alice,bob,schemaContract,snapshotRows} from './postgresFixture.mjs';
import {runInTransaction} from '../dist/api/transaction.js';
import {applyPrincipal} from '../dist/auth/context.js';
import {changeEntryPoints,moveEntryPoint,changeEntryDisplay} from '../dist/services/storyEntryPoints.js';
import {findStorySnapshot} from '../dist/repositories/storyRepository.js';
const pool=testPool();
const scoped=(user,fn)=>runInTransaction(pool,async c=>{await applyPrincipal(c,{userId:user,isAdmin:false});return fn(c);});
before(async()=>{
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql',import.meta.url),'utf8'));
  // Reconstruct the preceding constraints so the migration itself is exercised with data.
  await pool.query(`ALTER TABLE story_entry_points DROP CONSTRAINT story_entry_points_location;
    ALTER TABLE story_entry_points ADD CONSTRAINT story_entry_points_location CHECK(num_nonnulls(period_id,event_id)=1);
    ALTER TABLE story_period_presentations DROP CONSTRAINT story_period_presentations_target;
    ALTER TABLE story_period_presentations ADD CONSTRAINT story_period_presentations_target FOREIGN KEY(target_story_id,period_id) REFERENCES story_periods(story_id,period_id) ON DELETE CASCADE;
    INSERT INTO auth.users(id) VALUES('${alice}'),('${bob}');
    INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('earth','Earth','Earth','G4.54','TODAY'),('phase','Phase','Phase','M100','TODAY');
    INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES
    ('Source','Source','A',true,'${alice}'),('Target','Target','A',true,'${alice}'),('Private','Private','A',false,'${alice}');
    INSERT INTO story_periods(story_id,period_id) VALUES(1,'earth'),(2,'earth'),(2,'phase');
    UPDATE story_periods SET parent_period_id='earth' WHERE story_id=2 AND period_id='phase';
    INSERT INTO story_period_presentations VALUES(1,'earth',2);`);
  await pool.query(await readFile(new URL('../../database/migrations/20261104132539_navigation_without_wrapper_periods.sql',import.meta.url),'utf8'));
  if(process.env.UPDATE_NAVIGATION_SCHEMA==='true')await writeFile(new URL('./fixtures/application-schema.json',import.meta.url),JSON.stringify(await schemaContract(pool),null,2)+'\n');
});
after(()=>pool.end());
test('the additive migration preserves existing rows and wrapper removal preserves the view',async()=>{
  assert.equal((await pool.query('SELECT * FROM story_period_presentations')).rowCount,1);
  await pool.query("UPDATE story_periods SET parent_period_id=NULL WHERE story_id=2 AND period_id='phase'; DELETE FROM story_periods WHERE story_id=2 AND period_id='earth'");
  assert.equal((await pool.query('SELECT * FROM story_period_presentations')).rowCount,1);
  const source=await scoped(null,c=>findStorySnapshot(c,'1'));
  assert.equal(source.child_stories[0].id,2);
  assert.deepEqual(source.child_stories[0].anchors,[{type:'period',id:'earth'}]);
});
test('root and period entries coexist, deduplicate and remove independently',async()=>{
  await scoped(alice,c=>changeEntryPoints(c,'1',['2'],null,false));
  await scoped(alice,c=>changeEntryPoints(c,'1',['2'],null,false));
  await scoped(alice,c=>changeEntryPoints(c,'1',['2'],{anchorType:'period',anchorId:'earth'},false));
  assert.equal((await pool.query('SELECT * FROM story_entry_points')).rowCount,2);
  const source=await scoped(null,c=>findStorySnapshot(c,'1'));
  assert.equal(source.child_stories[0].at_root,true);
  assert.equal(source.child_stories[0].anchors.length,1);
  await scoped(alice,c=>changeEntryPoints(c,'1',['2'],null,true));
  assert.equal((await pool.query('SELECT * FROM story_entry_points')).rowCount,1);
  assert.equal((await pool.query('SELECT * FROM story_period_presentations')).rowCount,1);
});
test('root entries retain ownership and destination visibility checks',async()=>{
  await assert.rejects(scoped(bob,c=>changeEntryPoints(c,'1',['2'],null,false)));
  await scoped(alice,c=>changeEntryPoints(c,'1',['3'],null,false));
  const publicSource=await scoped(null,c=>findStorySnapshot(c,'1'));
  assert.ok(!publicSource.child_stories.some(s=>s.id===3));
  const ownerSource=await scoped(alice,c=>findStorySnapshot(c,'1'));
  assert.ok(ownerSource.child_stories.some(s=>s.id===3&&s.at_root));
});
test('two simultaneous anchor kinds are still rejected',async()=>{
  await assert.rejects(pool.query("INSERT INTO story_entry_points(source_story_id,target_story_id,period_id,event_id) VALUES(1,2,'earth','event')"),{code:'23514'});
});

const location = id => ({anchorType:'period',anchorId:id});
async function moveFixture() {
  const {rows} = await pool.query(`INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id)
    VALUES('Move source','Source','A',true,$1),('Move target','Target','A',true,$1),('Other source','Other','A',true,$1) RETURNING id`,[alice]);
  const [source,target,other]=rows.map(row=>String(row.id));
  await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES($1,'earth'),($1,'phase'),($2,'earth')",[source,other]);
  await pool.query("INSERT INTO events(id,label_fr,label_en,date) VALUES('move-event','Event','Event','TODAY') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO story_events(story_id,event_id) VALUES($1,'move-event')",[source]);
  const add=(from,anchor)=>scoped(alice,c=>changeEntryPoints(c,from,[target],anchor,false));
  const move=(from,to)=>scoped(alice,c=>moveEntryPoint(c,source,target,from,to));
  const child=async()=> (await scoped(alice,c=>findStorySnapshot(c,source))).child_stories.find(row=>String(row.id)===target);
  return {source,target,other,add,move,child};
}
test('moving one explicit occurrence preserves other periods, event anchors and sources, and deduplicates destinations',async()=>{
  const f=await moveFixture();
  await f.add(f.source,location('earth'));await f.add(f.source,location('phase'));
  await f.add(f.source,{anchorType:'event',anchorId:'move-event'});await f.add(f.other,location('earth'));
  await f.move(location('earth'),null);
  assert.equal((await f.child()).at_root,true);
  assert.deepEqual((await f.child()).anchors,[{type:'event',id:'move-event'},{type:'period',id:'phase'}]);
  await f.move(null,location('earth'));
  assert.equal((await f.child()).at_root,false);
  await f.move(location('phase'),location('earth'));
  assert.deepEqual((await f.child()).anchors,[{type:'event',id:'move-event'},{type:'period',id:'earth'}]);
  assert.equal((await scoped(alice,c=>findStorySnapshot(c,f.other))).child_stories[0].anchors[0].id,'earth');
});
test('moving a historical anchor retains its parent and does not leave a phantom root',async()=>{
  const f=await moveFixture();
  await pool.query('UPDATE stories SET parent_story_id=$1 WHERE id=$2',[f.source,f.target]);
  await pool.query("INSERT INTO story_anchors(story_id,anchor_type,anchor_id) VALUES($1,'period','earth')",[f.target]);
  await f.move(location('earth'),location('phase'));
  assert.equal((await f.child()).at_root,false);
  assert.deepEqual((await f.child()).anchors,[{type:'period',id:'phase'}]);
  await f.move(location('phase'),null);assert.equal((await f.child()).at_root,true);
  await f.move(null,location('earth'));assert.equal((await f.child()).at_root,false);
  assert.equal(String((await pool.query('SELECT parent_story_id FROM stories WHERE id=$1',[f.target])).rows[0].parent_story_id),f.source);
});
test('an implicit historical root can move into a period and back without reparenting',async()=>{
  const f=await moveFixture();await pool.query('UPDATE stories SET parent_story_id=$1 WHERE id=$2',[f.source,f.target]);
  await f.move(null,location('earth'));assert.equal((await f.child()).at_root,false);
  await f.move(location('earth'),null);assert.equal((await f.child()).at_root,true);
  assert.equal(String((await pool.query('SELECT parent_story_id FROM stories WHERE id=$1',[f.target])).rows[0].parent_story_id),f.source);
});
test('event-only links cannot move or change display from a nonexistent root',async()=>{
  const f=await moveFixture();await f.add(f.source,{anchorType:'event',anchorId:'move-event'});
  await assert.rejects(f.move(null,location('earth')),error=>error.status===409);
  await assert.rejects(scoped(alice,c=>changeEntryDisplay(c,f.source,f.target,null,true)),error=>error.status===409);
  assert.equal((await f.child()).at_root,false);
  assert.deepEqual((await f.child()).anchors,[{type:'event',id:'move-event'}]);
  await f.add(f.source,null);
  await f.move(null,location('earth'));
  assert.equal((await f.child()).at_root,false);
  assert.deepEqual((await f.child()).anchors,[{type:'event',id:'move-event'},{type:'period',id:'earth'}]);
});

test('a chronological occurrence moves without leaving a duplicate or changing other presentations and facts',async()=>{
  const f=await moveFixture();
  await pool.query("INSERT INTO story_period_presentations(context_story_id,period_id,target_story_id) VALUES($1,'earth',$2),($3,'earth',$2)",[f.source,f.target,f.other]);
  const before=await snapshotRows(pool);await f.move(location('earth'),null);
  assert.equal((await f.child()).at_root,true);assert.deepEqual((await f.child()).anchors,[]);
  const after=await snapshotRows(pool);
  for(const table of ['periods','events','stories','story_periods','story_events'])assert.deepEqual(after[table],before[table],table);
  assert.equal(after.story_period_presentations.length,before.story_period_presentations.length-1);
  assert.ok(after.story_period_presentations.some(row=>String(row.context_story_id)===f.other&&String(row.target_story_id)===f.target));
});
test('missing or stale origins, foreign destinations and unauthorized accounts leave the relation unchanged',async()=>{
  const f=await moveFixture();await f.add(f.source,location('earth'));
  const before=await snapshotRows(pool);
  await assert.rejects(f.move(location('earth'),location('missing')));
  await assert.rejects(f.move(location('phase'),null));
  await assert.rejects(scoped(bob,c=>moveEntryPoint(c,f.source,f.target,location('earth'),null)));
  await assert.rejects(scoped(alice,c=>moveEntryPoint(c,f.source,f.source,location('earth'),null)));
  assert.deepEqual(await snapshotRows(pool),before);
});
test('a late transaction failure rolls back both the destination and removal',async()=>{
  const f=await moveFixture();await f.add(f.source,location('earth'));const before=await snapshotRows(pool);
  await assert.rejects(scoped(alice,async c=>{await moveEntryPoint(c,f.source,f.target,location('earth'),null);throw new Error('Late failure');}),/Late failure/);
  assert.deepEqual(await snapshotRows(pool),before);
  await f.move(location('earth'),null);assert.equal((await f.child()).at_root,true);
});
test('concurrent moves of the same occurrence serialize and reject the stale move',async()=>{
  const f=await moveFixture();await f.add(f.source,location('earth'));
  const results=await Promise.allSettled([f.move(location('earth'),null),f.move(location('earth'),location('phase'))]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
  const c=await f.child();assert.ok(c.at_root !== c.anchors.some(a=>a.type==='period'&&a.id==='phase'));
});

test('display preferences belong to one location, survive moves and never create catalogue periods',async()=>{
  const f=await moveFixture();await f.add(f.source,location('earth'));await f.add(f.source,location('phase'));await f.add(f.other,location('earth'));
  const before=await snapshotRows(pool);
  await scoped(alice,c=>changeEntryDisplay(c,f.source,f.target,location('earth'),true));
  assert.deepEqual((await f.child()).anchors,[{type:'period',id:'earth',displayAsPeriod:true},{type:'period',id:'phase'}]);
  assert.equal((await scoped(alice,c=>findStorySnapshot(c,f.other))).child_stories[0].anchors[0].displayAsPeriod,undefined);
  await f.move(location('earth'),null);assert.equal((await f.child()).root_display_as_period,true);
  await scoped(alice,c=>changeEntryDisplay(c,f.source,f.target,null,false));
  assert.equal((await f.child()).root_display_as_period,false);assert.equal((await f.child()).at_root,true);
  const after=await snapshotRows(pool);
  for(const table of ['stories','periods','events','story_periods','story_events'])assert.deepEqual(after[table],before[table],table);
});
test('display updates reject inaccessible or missing links and deletion only removes that occurrence',async()=>{
  const f=await moveFixture();await f.add(f.source,location('earth'));await f.add(f.source,location('phase'));await f.add(f.other,location('earth'));
  const before=await snapshotRows(pool);
  await assert.rejects(scoped(bob,c=>changeEntryDisplay(c,f.source,f.target,location('earth'),true)));
  await assert.rejects(scoped(alice,c=>changeEntryDisplay(c,f.source,f.target,{anchorType:'event',anchorId:'missing'},true)));
  assert.deepEqual(await snapshotRows(pool),before);
  await scoped(alice,c=>changeEntryDisplay(c,f.source,f.target,location('earth'),true));
  await scoped(alice,c=>changeEntryPoints(c,f.source,[f.target],location('earth'),true));
  assert.deepEqual((await f.child()).anchors,[{type:'period',id:'phase'}]);
  assert.ok((await scoped(alice,c=>findStorySnapshot(c,f.other))).child_stories.some(child=>String(child.id)===f.target));
  assert.ok((await pool.query('SELECT id FROM stories WHERE id=$1',[f.target])).rowCount);
});
