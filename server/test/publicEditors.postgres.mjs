// Real RLS and HTTP handlers; exclusively a disposable PostgreSQL database over a local Unix socket.
import { before, beforeEach, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { testPool, authFixture, alice, bob, category, applicationTables } from './postgresFixture.mjs';
import { runInTransaction } from '../dist/api/transaction.js';
import { applyPrincipal, principalContext } from '../dist/auth/context.js';
const adminId='00000000-0000-0000-0000-000000000003', ordinaryId='00000000-0000-0000-0000-000000000004';
const editor={userId:alice,isAdmin:false,isEditor:true},admin={userId:adminId,isAdmin:true},ordinary={userId:ordinaryId,isAdmin:false};
const pool=testPool();
const scoped=(principal,fn)=>runInTransaction(pool,async c=>{await applyPrincipal(c,principal);return fn(c);});
const tx=fn=>scoped(principalContext.getStore()??{userId:null,isAdmin:false},fn);
mock.module(new URL('../dist/api/database.js',import.meta.url),{namedExports:{withTransaction:tx,query:(sql,params)=>tx(c=>c.query(sql,params))}});
const {default:router}=await import('../dist/api/routes.js');
async function call(method,path,{body={},params={},principal=editor}={}){
 const route=router.stack.find(l=>l.route?.path===path&&l.route.methods[method]);assert.ok(route,path);
 const res={locals:{principal},statusCode:200,payload:undefined,status(n){this.statusCode=n;return this;},json(v){this.payload=v;return this;},send(){return this;}};
 await principalContext.run(principal,()=>route.route.stack[0].handle({body,params,query:{}},res));return res;
}
const sql=(principal,q,p=[])=>scoped(principal,c=>c.query(q,p));
before(async()=>{
 await pool.query(authFixture);
 const baseline=await readFile(new URL('../../database/baseline/application.sql',import.meta.url),'utf8');
 const marker=baseline.indexOf('-- Editors can maintain public frises');assert.ok(marker>0);
 await pool.query(baseline.slice(0,marker)+'COMMIT;');
 await pool.query(await readFile(new URL('../../database/migrations/20261103143455_public_story_editors.sql',import.meta.url),'utf8'));
 await pool.query(await readFile(new URL('../../database/migrations/20261108120000_taxonomy_tags.sql',import.meta.url),'utf8'));
});
beforeEach(async()=>{
 await pool.query(`TRUNCATE ${applicationTables.map(t=>'public.'+t).join(',')},admin_private.audit_log RESTART IDENTITY CASCADE`);await pool.query('DELETE FROM auth.users');
 for(const[id,name,role]of [[alice,'Alice','editor'],[bob,'Bob','user'],[adminId,'Carol','admin'],[ordinaryId,'David','user']])await pool.query("INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,now(),$3,$4)",[id,name+'@example.test',{role},{username:name}]);
 await pool.query("INSERT INTO categories(id,label_fr,label_en) VALUES($1,'Catégorie','Category')",[category]);
 await pool.query("INSERT INTO periods(id,label_fr,label_en,start_date,end_date) VALUES('root','Racine','Root','1945','1991'),('leaf','Enfant','Child','1960','1970'); INSERT INTO events(id,label_fr,label_en,date) VALUES('event','Événement','Event','1962')");
 await pool.query("INSERT INTO stories(title_fr,title_en,author,is_public,owner_user_id) VALUES('Publique','Public','Bob',true,$1),('Privée','Private','Bob',false,$1),('À moi','Mine','Alice',false,$2),('Autre publique','Other','Bob',true,$1)",[bob,alice]);
 await pool.query("INSERT INTO story_periods(story_id,period_id) VALUES(1,'root'),(2,'root'),(4,'root'); INSERT INTO story_events(story_id,event_id) VALUES(1,'event'),(2,'event')");
});
after(()=>pool.end());
test('editor and admin can edit another public frise, ordinary accounts cannot, private frises stay private',async()=>{
 const changed=await call('put','/stories/:id',{params:{id:'1'},body:{title:{fr:'Corrigée'},author:'Usurpation',isPublic:true,categories:[{id:category}]}});
 assert.equal(changed.statusCode,200);assert.equal(changed.payload.title_fr,'Corrigée');assert.equal(changed.payload.author,'Bob');
 assert.equal((await sql(ordinary,"UPDATE stories SET title_fr='Interdit' WHERE id=1")).rowCount,0);
 assert.equal((await sql(admin,"UPDATE stories SET title_fr='Admin' WHERE id=1")).rowCount,1);
 assert.equal((await sql(editor,'SELECT id FROM stories WHERE id=2')).rowCount,0);
 assert.equal((await sql(editor,"UPDATE stories SET title_fr='Interdit' WHERE id=2")).rowCount,0);
 assert.equal((await sql(editor,"UPDATE stories SET title_fr='À moi' WHERE id=3")).rowCount,1);
 assert.equal((await call('get','/admin/users')).statusCode,403);
});
test('editing does not grant ownership, privacy, author, creation-date or private-parent changes',async()=>{
 for(const q of ["UPDATE stories SET is_public=false WHERE id=1",`UPDATE stories SET owner_user_id='${alice}' WHERE id=1`,"UPDATE stories SET author='Alice' WHERE id=1","UPDATE stories SET id=DEFAULT WHERE id=1","UPDATE stories SET created_at='2000-01-01' WHERE id=1","UPDATE stories SET parent_story_id=2 WHERE id=1"])
  await assert.rejects(sql(editor,q),{code:'42501'},q);
 assert.equal((await sql(editor,'DELETE FROM stories WHERE id=1')).rowCount,0);
 const before=(await pool.query('SELECT * FROM story_periods WHERE story_id=1')).rows;
 assert.equal((await call('delete','/stories/:id',{params:{id:'1'}})).statusCode,404);
 assert.deepEqual((await pool.query('SELECT * FROM story_periods WHERE story_id=1')).rows,before);
 assert.equal((await pool.query('SELECT count(*)::int n FROM story_events WHERE story_id=1')).rows[0].n,1);
});
test('editor can maintain public memberships, period placement, categories and event importance',async()=>{
 assert.equal((await call('post','/stories/:storyId/periods',{params:{storyId:'1'},body:{ids:['leaf'],operation:'add',parentPeriodId:'root'}})).statusCode,200);
 assert.equal((await call('put','/stories/:storyId/events/:eventId/importance',{params:{storyId:'1',eventId:'event'},body:{importance:'major'}})).statusCode,200);
 assert.equal((await sql(editor,"SELECT parent_period_id FROM story_periods WHERE story_id=1 AND period_id='leaf'")).rows[0].parent_period_id,'root');
 await sql(editor,'INSERT INTO story_categories(story_id,category_id) VALUES(1,$1)',[category]);
 await assert.rejects(sql(editor,"INSERT INTO story_periods(story_id,period_id) VALUES(2,'leaf')"),{code:'42501'});
 assert.equal((await sql(editor,"DELETE FROM story_periods WHERE story_id=2 AND period_id='root'")).rowCount,0);
 await sql(editor,"DELETE FROM story_periods WHERE story_id=1 AND period_id='leaf'");
 assert.equal((await sql(editor,"SELECT * FROM story_periods WHERE story_id=1 AND period_id='leaf'")).rowCount,0);
});
test('relations require both frises to be editable; private targets cannot be modified indirectly',async()=>{
 assert.equal((await call('post','/stories/:sourceId/entry-points',{params:{sourceId:'1'},body:{childStoryIds:['4'],anchor:{anchorType:'period',anchorId:'root'},operation:'add'}})).statusCode,204);
 await sql(editor,"INSERT INTO story_period_presentations(context_story_id,period_id,target_story_id) VALUES(1,'root',4)");
 await assert.rejects(sql(editor,"INSERT INTO story_period_presentations(context_story_id,period_id,target_story_id) VALUES(1,'root',2)"),{code:'42501'});
 assert.equal((await call('post','/stories/:sourceId/entry-points',{params:{sourceId:'1'},body:{childStoryIds:['2'],anchor:{anchorType:'period',anchorId:'root'},operation:'add'}})).statusCode,404);
 assert.equal((await call('post','/stories/:storyId/from-period',{params:{storyId:'1'},body:{periodId:'root',title:'Dérivée'}})).statusCode,404);
});
test('a forged/stale role or a suspended account never grants public editing through RLS',async()=>{
 await pool.query("UPDATE auth.users SET raw_user_meta_data=raw_user_meta_data||'{\"role\":\"editor\"}' WHERE id=$1",[ordinaryId]);
 assert.equal((await sql({...ordinary,isEditor:true},"UPDATE stories SET title_fr='Interdit' WHERE id=1")).rowCount,0);
 await pool.query("UPDATE auth.users SET raw_app_meta_data='{\"role\":\"user\"}' WHERE id=$1",[alice]);
 assert.equal((await sql(editor,"UPDATE stories SET title_fr='Interdit' WHERE id=1")).rowCount,0);
 await pool.query("UPDATE auth.users SET raw_app_meta_data='{\"role\":\"editor\"}',banned_until=now()+interval '1 day' WHERE id=$1",[alice]);
 assert.equal((await sql(editor,"UPDATE stories SET title_fr='Interdit' WHERE id=1")).rowCount,0);
});
test('only admins grant/revoke editor, confirmed active targets only, and each change is journaled',async()=>{
 const change=(principal,id,editor)=>call('put','/admin/users/:id/editor',{principal,params:{id},body:{editor}});
 assert.equal((await change(ordinary,ordinaryId,true)).statusCode,403);
 assert.equal((await change(admin,ordinaryId,true)).statusCode,204);
 assert.equal((await call('get','/admin/users/:id',{principal:admin,params:{id:ordinaryId}})).payload.isEditor,true);
 assert.equal((await change(admin,ordinaryId,false)).statusCode,204);
 assert.equal((await change(admin,adminId,true)).statusCode,409);
 await pool.query('UPDATE auth.users SET email_confirmed_at=null WHERE id=$1',[ordinaryId]);
 assert.equal((await change(admin,ordinaryId,true)).statusCode,409);
 assert.deepEqual((await pool.query('SELECT action FROM admin_private.audit_log ORDER BY id')).rows,[{action:'grant_editor'},{action:'revoke_editor'}]);
});
