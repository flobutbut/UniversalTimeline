import fs from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
const before=JSON.parse(await fs.readFile(new URL('before.json',dir),'utf8'));
const q=s=>s===null?'NULL':"'"+String(s).replaceAll("'","''")+"'";
const sm=new Map(before.stories.map(s=>[s.id,s]));
const pm=new Map(before.periods.map(p=>[p.id,p]));
const caps=before.story_period_presentations.map(v=>({story:sm.get(v.target_story_id),period:pm.get(v.period_id)}));
if(caps.length!==4)throw new Error('Expected the four reviewed presentations');
const removed=caps.map(c=>before.story_periods.find(sp=>sp.story_id===c.story.id&&sp.period_id===c.period.id));
if(removed.some(c=>!c))throw new Error('A reviewed membership changed');
const children=before.story_periods.filter(sp=>removed.some(c=>c.story_id===sp.story_id&&c.period_id===sp.parent_period_id));
const staleAnchors=before.story_anchors.filter(a=>a.anchor_type==='period'&&removed.some(c=>c.story_id===sm.get(a.story_id).parent_story_id&&c.period_id===a.anchor_id));
const staleEntries=before.story_entry_points.filter(e=>removed.some(c=>c.story_id===e.source_story_id&&c.period_id===e.period_id));
const rootPairs=[...new Map([...staleAnchors.map(a=>[sm.get(a.story_id).parent_story_id,a.story_id]),...staleEntries.map(e=>[e.source_story_id,e.target_story_id]),
  [before.stories.find(s=>s.title_fr==='Genre Homo').id,before.stories.find(s=>s.title_fr==='Histoire des techniques').id]].map(p=>[p.join(':'),p])).values()];
const rows=caps.map(({story,period})=>`(${[story.title_fr,period.label_fr,period.start_date,period.end_date].map(q).join(',')})`).join(',\n');
const sql=`-- Reviewed prototype scope only. Catalogue facts and all events are preserved.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.stories,public.story_periods,public.story_entry_points,public.story_anchors,public.story_period_presentations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE _navigation_expected(story_title text,period_title text,start_date text,end_date text) ON COMMIT DROP;
INSERT INTO _navigation_expected VALUES ${rows};
CREATE TEMP TABLE _navigation_wrappers ON COMMIT DROP AS
SELECT s.id story_id,p.id period_id FROM _navigation_expected e
JOIN public.stories s ON s.title_fr=e.story_title
JOIN public.story_periods sp ON sp.story_id=s.id
JOIN public.periods p ON p.id=sp.period_id AND p.label_fr=e.period_title AND p.start_date IS NOT DISTINCT FROM e.start_date AND p.end_date IS NOT DISTINCT FROM e.end_date;
DO $$ BEGIN
  IF (SELECT count(*) FROM _navigation_wrappers)<>4 OR (SELECT count(DISTINCT story_id) FROM _navigation_wrappers)<>4 THEN
    RAISE EXCEPTION 'The four reviewed memberships changed. Re-audit before applying.';
  END IF;
  IF EXISTS(SELECT 1 FROM story_period_presentations v JOIN _navigation_wrappers c ON c.story_id=v.context_story_id AND c.period_id=v.period_id) THEN
    RAISE EXCEPTION 'A wrapper is now a source context. Preserve it and review the plan.';
  END IF;
  IF EXISTS(SELECT 1 FROM _navigation_wrappers c WHERE NOT EXISTS(SELECT 1 FROM story_period_presentations v WHERE v.target_story_id=c.story_id AND v.period_id=c.period_id)) THEN
    RAISE EXCEPTION 'A reviewed chronological presentation changed.';
  END IF;
END $$;
CREATE TEMP TABLE _navigation_control ON COMMIT DROP AS SELECT
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.periods t) periods,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.events t) events,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY story_id,event_id)::text,'')) FROM public.story_events t) story_events,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.stories t) stories,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY context_story_id,period_id,target_story_id)::text,'')) FROM public.story_period_presentations t) presentations;
INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id)
SELECT DISTINCT s.parent_story_id,s.id,NULL,NULL FROM public.stories s JOIN public.story_anchors a ON a.story_id=s.id
JOIN _navigation_wrappers c ON c.story_id=s.parent_story_id AND a.anchor_type='period' AND a.anchor_id=c.period_id
ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id)
SELECT DISTINCT e.source_story_id,e.target_story_id,NULL,NULL FROM public.story_entry_points e
JOIN _navigation_wrappers c ON c.story_id=e.source_story_id AND c.period_id=e.period_id ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
DELETE FROM public.story_anchors a USING public.stories s,_navigation_wrappers c
WHERE a.story_id=s.id AND s.parent_story_id=c.story_id AND a.anchor_type='period' AND a.anchor_id=c.period_id;
UPDATE public.story_periods sp SET parent_period_id=NULL FROM _navigation_wrappers c WHERE sp.story_id=c.story_id AND sp.parent_period_id=c.period_id;
DELETE FROM public.story_periods sp USING _navigation_wrappers c WHERE sp.story_id=c.story_id AND sp.period_id=c.period_id;
DO $$ DECLARE source_id integer;target_id integer; BEGIN
  SELECT id INTO STRICT source_id FROM public.stories WHERE title_fr='Genre Homo';
  SELECT id INTO STRICT target_id FROM public.stories WHERE title_fr='Histoire des techniques';
  IF NOT EXISTS(SELECT 1 FROM public.stories a JOIN public.stories b ON a.owner_user_id=b.owner_user_id WHERE a.id=source_id AND b.id=target_id) THEN
    RAISE EXCEPTION 'The reviewed root entry ownership changed.';
  END IF;
  INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id) VALUES(source_id,target_id,NULL,NULL) ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
END $$;
DO $$ BEGIN
${rootPairs.map(([source,target])=>` IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr=${q(sm.get(source).title_fr)} AND t.title_fr=${q(sm.get(target).title_fr)} AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;`).join('\n')}
 IF EXISTS(SELECT 1 FROM _navigation_control b WHERE
  b.periods IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.periods t) OR
  b.events IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.events t) OR
  b.story_events IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY story_id,event_id)::text,'')) FROM public.story_events t) OR
  b.stories IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.stories t) OR
  b.presentations IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY context_story_id,period_id,target_story_id)::text,'')) FROM public.story_period_presentations t)) THEN
    RAISE EXCEPTION 'Facts, event memberships, stories or chronological presentations changed unexpectedly.';
 END IF;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
`;
await fs.writeFile(new URL('../../database/data/20261104_navigation_without_wrappers.sql',dir),sql);
const plan={extracted_at:before.extracted_at,removedMemberships:removed,rootedChildren:children,removedAnchors:staleAnchors,removedEntries:staleEntries,rootPairs,
  reviewed:caps.map(c=>({story:c.story.title_fr,period:c.period.label_fr})),preserveAllOtherCandidates:true};
await fs.writeFile(new URL('data-plan.json',dir),JSON.stringify(plan,null,2)+'\n');
const story=id=>`(SELECT id FROM public.stories WHERE title_fr=${q(sm.get(id).title_fr)})`;
const period=id=>{
  if(id===null)return 'NULL';
  const p=pm.get(id);
  return `(SELECT id FROM public.periods WHERE label_fr=${q(p.label_fr)} AND start_date IS NOT DISTINCT FROM ${q(p.start_date)} AND end_date IS NOT DISTINCT FROM ${q(p.end_date)})`;
};
const newRoots=rootPairs.filter(([source,target])=>!before.story_entry_points.some(e=>e.source_story_id===source&&e.target_story_id===target&&e.period_id===null&&e.event_id===null));
const childWhere=c=>`story_id=${story(c.story_id)} AND period_id=${period(c.period_id)}`;
const restore=`-- Restore reviewed memberships and historical anchors only; retain unrelated later edits.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.stories,public.story_periods,public.story_entry_points,public.story_anchors,public.story_period_presentations IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
${removed.map(c=>` IF EXISTS(SELECT 1 FROM public.story_periods WHERE ${childWhere(c)}) THEN RAISE EXCEPTION 'A removed period was reattached. Re-audit before rollback.'; END IF;`).join('\n')}
${children.map(c=>` IF NOT EXISTS(SELECT 1 FROM public.story_periods WHERE ${childWhere(c)} AND parent_period_id IS NULL) THEN RAISE EXCEPTION 'A child placement changed. Re-audit before rollback.'; END IF;`).join('\n')}
${newRoots.map(([source,target])=>` IF NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE source_story_id=${story(source)} AND target_story_id=${story(target)} AND period_id IS NULL AND event_id IS NULL) THEN RAISE EXCEPTION 'A root entry changed. Re-audit before rollback.'; END IF;`).join('\n')}
END $$;
INSERT INTO public.story_periods(story_id,period_id,parent_period_id) VALUES
${removed.map(c=>`(${story(c.story_id)},${period(c.period_id)},${period(c.parent_period_id)})`).join(',\n')};
${children.map(c=>`UPDATE public.story_periods SET parent_period_id=${period(c.parent_period_id)} WHERE ${childWhere(c)};`).join('\n')}
${staleAnchors.length?`INSERT INTO public.story_anchors(id,story_id,anchor_type,anchor_id) VALUES\n${staleAnchors.map(a=>`(${a.id},${story(a.story_id)},'period',${period(a.anchor_id)})`).join(',\n')};`:''}
${staleEntries.length?`INSERT INTO public.story_entry_points(id,source_story_id,target_story_id,period_id,event_id) VALUES\n${staleEntries.map(e=>`(${q(e.id)},${story(e.source_story_id)},${story(e.target_story_id)},${period(e.period_id)},${q(e.event_id)})`).join(',\n')};`:''}
${newRoots.map(([source,target])=>`DELETE FROM public.story_entry_points WHERE source_story_id=${story(source)} AND target_story_id=${story(target)} AND period_id IS NULL AND event_id IS NULL;`).join('\n')}
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
`;
await fs.writeFile(new URL('rollback-data.sql',dir),restore);
console.log(JSON.stringify({reviewed:plan.reviewed,rootedChildren:children.length,removedAnchors:staleAnchors.length,removedEntries:staleEntries.length,rootPairs:rootPairs.length}));
