// Local disposable PostgreSQL only; never imports the production connection provider.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, schemaContract } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal } from '../dist/auth/context.js';
import { findStorySnapshot } from '../dist/repositories/storyRepository.js';
import { createStoryFromPeriod } from '../dist/services/storyAssociations.js';
const pool = testPool();
const scoped = (userId, fn) => runInTransaction(pool, async c => { await applyPrincipal(c,{userId,isAdmin:false}); return fn(c); });
before(async () => {
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('../../database/baseline/application.sql', import.meta.url),'utf8'));
  // Keep the empty-install schema fixture in sync with the additive migration.
  if (process.env.UPDATE_NAVIGATION_SCHEMA === 'true') await writeFile(new URL('./fixtures/application-schema.json',import.meta.url), JSON.stringify(await schemaContract(pool),null,2)+'\n');
  await pool.query('INSERT INTO auth.users(id) VALUES($1),($2)',[alice,bob]);
  await pool.query(`INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES
    ('ancient','Ancient','Ancient','-3200-01-01','0476-09-04'),('medieval','Medieval','Medieval','0476-09-04','1492-10-12'),('modern','Modern','Modern','1492-10-12','1789-01-01'),('renaissance','Renaissance','Renaissance','1400','1650');
    INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES
      ('Context','Context','Alice',true,'${alice}'),('Medieval','Medieval','Alice',true,'${alice}'),('Private','Private','Alice',false,'${alice}'),('Bob','Bob','Bob',true,'${bob}');
    INSERT INTO story_periods(story_id,period_id) VALUES(1,'ancient'),(1,'medieval'),(1,'modern'),(2,'medieval'),(3,'modern'),(4,'modern');`);
});
after(() => pool.end());

test('the reference must belong to its context, while the target may omit the wrapper', async () => {
  await assert.rejects(pool.query("INSERT INTO story_period_presentations VALUES(1,'renaissance',2)"),{code:'23503'});
  await pool.query("INSERT INTO story_period_presentations VALUES(1,'ancient',2)");
  await assert.rejects(pool.query("INSERT INTO story_period_presentations VALUES(1,'ancient',9999)"),{code:'23503'});
  await pool.query("DELETE FROM story_period_presentations WHERE period_id='ancient'");
});
test('owners declare a view, duplicates are idempotent, and foreign owners cannot redirect it', async () => {
  await scoped(alice,c=>c.query("INSERT INTO story_period_presentations VALUES(1,'medieval',2) ON CONFLICT DO NOTHING"));
  await scoped(alice,c=>c.query("INSERT INTO story_period_presentations VALUES(1,'medieval',2) ON CONFLICT DO NOTHING"));
  await assert.rejects(scoped(bob,c=>c.query("INSERT INTO story_period_presentations VALUES(1,'modern',4)")),{code:'42501'});
  await assert.rejects(scoped(null,c=>c.query("INSERT INTO story_period_presentations VALUES(1,'modern',3)")),{code:'42501'});
});
test('public snapshots hide private destination identities while owners retain their views', async () => {
  await scoped(alice,c=>c.query("INSERT INTO story_period_presentations VALUES(1,'modern',3)"));
  const publicSnapshot = await scoped(null,c=>findStorySnapshot(c,'2'));
  assert.equal(publicSnapshot.navigation_contexts.length,1);
  assert.deepEqual(publicSnapshot.navigation_contexts[0].presentations.map(p=>p.story_id),[2]);
  const ownerSnapshot = await scoped(alice,c=>findStorySnapshot(c,'2'));
  assert.deepEqual(ownerSnapshot.navigation_contexts[0].presentations.map(p=>p.story_id),[2,3]);
});
test('creating a frise from a period registers a presentation without changing old entry points', async () => {
  const result = await scoped(alice,c=>createStoryFromPeriod(c,'1','ancient','Antiquity detail'));
  const rows=await pool.query('SELECT * FROM story_period_presentations WHERE target_story_id=$1',[result.id]);
  assert.deepEqual(rows.rows,[{context_story_id:1,period_id:'ancient',target_story_id:Number(result.id)}]);
  assert.equal((await pool.query('SELECT count(*)::int n FROM story_anchors WHERE story_id=$1',[result.id])).rows[0].n,1);
});
test('a newly added period appears in the context snapshot without rewriting old presentations', async () => {
  await scoped(alice,c=>c.query("INSERT INTO story_periods(story_id,period_id) VALUES(1,'renaissance')"));
  const snapshot = await scoped(null,c=>findStorySnapshot(c,'2'));
  assert.ok(snapshot.navigation_contexts[0].periods.some(p=>p.id==='renaissance'));
});
test('removing a target wrapper preserves the presentation and its source period', async () => {
  await pool.query("DELETE FROM story_periods WHERE story_id=2 AND period_id='medieval'");
  assert.equal((await pool.query('SELECT * FROM story_period_presentations WHERE target_story_id=2')).rowCount,1);
  assert.equal((await pool.query("SELECT * FROM story_periods WHERE story_id=1 AND period_id='medieval'")).rowCount,1);
});
