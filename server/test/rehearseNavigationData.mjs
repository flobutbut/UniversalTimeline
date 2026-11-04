// Rehearse the reviewed production-data transaction on an anonymized LOCAL copy.
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {readFile,writeFile} from 'node:fs/promises';
import {testPool,authFixture,alice} from './postgresFixture.mjs';
import {findStorySnapshot} from '../dist/repositories/storyRepository.js';
const pool=testPool();
mock.module(new URL('../dist/api/database.js',import.meta.url),{namedExports:{query:(text,values)=>pool.query(text,values),withTransaction:operation=>operation(pool)}});
const {getStory,listStories}=await import('../dist/services/storyService.js');
const root=new URL('../../',import.meta.url);
const audit=new URL('audits/navigation-2026-11-04/',root);
const snapshot=JSON.parse(await readFile(new URL('before.json',audit),'utf8'));
const plan=JSON.parse(await readFile(new URL('data-plan.json',audit),'utf8'));
const names=['stories','periods','events','story_periods','story_events','story_anchors','story_entry_points','story_period_presentations'];
async function insert(table,rows){
  if(!rows.length)return;
  const columns=Object.keys(rows[0]);assert.ok(columns.every(c=>/^[a-z_]+$/.test(c)));
  await pool.query(`INSERT INTO public.${table}(${columns.join(',')}) OVERRIDING SYSTEM VALUE SELECT ${columns.map(c=>'x.'+c).join(',')} FROM jsonb_populate_recordset(NULL::public.${table},$1::jsonb) x`,[JSON.stringify(rows)]);
}
async function state(){const result={};for(const table of names)result[table]=(await pool.query(`SELECT to_jsonb(t) row FROM public.${table} t ORDER BY to_jsonb(t)::text`)).rows.map(r=>r.row);return result;}
try{
  await pool.query(authFixture);
  await pool.query(await readFile(new URL('database/baseline/application.sql',root),'utf8'));
  await pool.query('INSERT INTO auth.users(id) VALUES($1)',[alice]);
  await insert('periods',snapshot.periods);await insert('events',snapshot.events.map(e=>({...e,label_en:e.label_en??e.label_fr})));
  await insert('stories',snapshot.stories.map(s=>({...s,author:'Local rehearsal',owner_user_id:alice,parent_story_id:null})));
  for(const s of snapshot.stories)if(s.parent_story_id!==null)await pool.query('UPDATE stories SET parent_story_id=$1 WHERE id=$2',[s.parent_story_id,s.id]);
  await insert('story_periods',snapshot.story_periods);await insert('story_events',snapshot.story_events);
  await insert('story_anchors',snapshot.story_anchors);await insert('story_entry_points',snapshot.story_entry_points);await insert('story_period_presentations',snapshot.story_period_presentations);
  for(const [table,column] of [['stories','id'],['story_anchors','id'],['story_entry_points','id']])await pool.query(`SELECT setval(pg_get_serial_sequence($1,$2),(SELECT max(${column}) FROM public.${table}))`,['public.'+table,column]);
  const original=await state();
  await pool.query(await readFile(new URL('database/data/20261104_navigation_without_wrappers.sql',root),'utf8'));
  const after=await state();
  for(const table of ['periods','events','stories','story_events','story_period_presentations'])assert.deepEqual(after[table],original[table],table+' must stay identical');
  assert.equal(after.story_periods.length,original.story_periods.length-4);
  assert.equal(after.story_entry_points.length,original.story_entry_points.length+9);
  assert.equal(after.story_anchors.length,original.story_anchors.length-8);
  for(const c of plan.removedMemberships){
    const target=await findStorySnapshot(pool,String(c.story_id));
    assert.ok(!target.periods.some(p=>p.id===c.period_id));
    assert.ok(target.navigation_contexts.some(context=>context.presentations.some(p=>String(p.story_id)===String(c.story_id)&&p.period_id===c.period_id)));
  }
  const homo=snapshot.stories.find(s=>s.title_fr==='Genre Homo');
  const techniques=snapshot.stories.find(s=>s.title_fr==='Histoire des techniques');
  assert.ok((await findStorySnapshot(pool,String(homo.id))).child_stories.some(s=>s.id===techniques.id&&s.at_root));
  // Verify all old destinations remain reachable, including the eight roots converted from legacy anchors.
  for(const s of snapshot.stories){
    const beforeTargets=new Set([...snapshot.stories.filter(t=>t.parent_story_id===s.id).map(t=>t.id),...snapshot.story_entry_points.filter(e=>e.source_story_id===s.id).map(e=>e.target_story_id)]);
    const afterTargets=new Set((await findStorySnapshot(pool,String(s.id))).child_stories.map(t=>t.id));
    for(const target of beforeTargets)assert.ok(afterTargets.has(target),`Lost destination ${s.id} -> ${target}`);
  }
  const api={stories:await listStories(),details:{}};
  for(const s of snapshot.stories)api.details[s.id]=await getStory(String(s.id));
  await writeFile('/private/tmp/navigation-postchange-api.json',JSON.stringify(api));
  await pool.query(await readFile(new URL('rollback-data.sql',audit),'utf8'));
  assert.deepEqual(await state(),original,'Rollback must restore every original row exactly');
  const report={localOnly:true,productionDataApplied:false,anonymizedOwner:true,countsBefore:Object.fromEntries(names.map(n=>[n,original[n].length])),countsAfter:Object.fromEntries(names.map(n=>[n,after[n].length])),factsUnchanged:true,allPreviousDestinationsReachable:true,allFourPresentationsRetained:true,rollbackRestoresExactRows:true};
  await writeFile(new URL('rehearsal.json',audit),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await pool.end();}
