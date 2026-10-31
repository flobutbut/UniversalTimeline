import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { testPool, snapshotRows, schemaContract, alice } from './postgresFixture.mjs';
import { checkAccessSchema } from '../dist/auth/preflight.js';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal } from '../dist/auth/context.js';

assert.equal(process.env.TIMELINE_TEST_DATABASE,'universaltimeline_test_restore');
assert.equal(process.env.TIMELINE_TEST_SOURCE_DATABASE,'universaltimeline_test_baseline');
const restored=testPool(), source=testPool(process.env.TIMELINE_TEST_SOURCE_DATABASE);
after(async()=>{await Promise.all([restored.end(),source.end()]);});
test('restores every fictional row and the exact constraints, triggers, RLS and policies',async()=>{
  assert.deepEqual(await snapshotRows(restored),await snapshotRows(source));
  assert.deepEqual(await schemaContract(restored),await schemaContract(source));
  await checkAccessSchema(restored);
});
test('preserves private visibility, trigger restrictions and sequence privileges after restore',async()=>{
  const sql=(user,query)=>runInTransaction(restored,async client=>{await applyPrincipal(client,{userId:user,isAdmin:false});return client.query(query);});
  assert.deepEqual((await sql(null,'SELECT id FROM stories ORDER BY id')).rows,[{id:1}]);
  assert.deepEqual((await sql(alice,'SELECT id FROM stories ORDER BY id')).rows,[{id:1},{id:2}]);
  await assert.rejects(sql(null,"SELECT nextval('stories_id_seq')"),{code:'42501'});
  await assert.rejects(sql(alice,'SELECT public.set_updated_at()'),{code:'42501'});
});
test('restores identity counters and can create the next owned private story without collisions',async()=>{
  const result=await runInTransaction(restored,async client=>{await applyPrincipal(client,{userId:alice,isAdmin:false});return client.query("INSERT INTO stories(title_fr,title_en,author) VALUES ('Après restauration','After restore','Alice') RETURNING id,owner_user_id,is_public");});
  assert.ok(result.rows[0].id>3);assert.equal(result.rows[0].owner_user_id,alice);assert.equal(result.rows[0].is_public,false);
});
