// Fictional data and a local Unix socket only. Never uses the production connection.
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {testPool,authFixture,alice,bob,schemaContract} from './postgresFixture.mjs';
import {runInTransaction} from '../dist/api/transaction.js';
import {applyPrincipal} from '../dist/auth/context.js';
import {changeEntryPoints} from '../dist/services/storyEntryPoints.js';
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
