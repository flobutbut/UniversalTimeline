// Jeu minimal pour la répétition locale d'un lot : node seed.mjs <content.mjs> <dernier id de frise> <sortie.sql>
import { writeFileSync } from 'node:fs';
const { stories, reused, sources, sourceTitles } = await import(new URL(process.argv[2], import.meta.url));
const u = '00000000-0000-0000-0000-000000000001', q = v => v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`;
const L = [`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ('${u}','owner@example.test',now());`];
L.push(`INSERT INTO public.stories(id,title_fr,title_en,author,is_public,owner_user_id) OVERRIDING SYSTEM VALUE VALUES ${Object.keys(sources).map(id => `(${id},${q(sourceTitles[id])},'x','flobutbut',true,'${u}')`).join(',')};`);
L.push(`SELECT setval(pg_get_serial_sequence('public.stories','id'),${process.argv[3]});`);
if (Object.keys(reused.events).length) L.push(`INSERT INTO public.events(id,label_fr,label_en,date,wikidata_id) VALUES ${Object.entries(reused.events).map(([id, e], i) => `(${q(id)},'seed e${i}','x',${q(e.date)},${q(e.q)})`).join(',')};`);
if (Object.keys(reused.periods).length) L.push(`INSERT INTO public.periods(id,label_fr,label_en,start_date,end_date,wikidata_id) VALUES ${Object.entries(reused.periods).map(([id, p], i) => `(${q(id)},'seed p${i}','x',${q(p.start)},${q(p.end)},${q(p.q)})`).join(',')};`);
const anchors = [...new Set(stories.flatMap(s => s.entries.filter(e => e[1]).map(([source, event]) => `(${source},${q(event)})`)))];
if (anchors.length) L.push(`INSERT INTO public.story_events(story_id,event_id) VALUES ${anchors.join(',')};`);
writeFileSync(process.argv[4], L.join('\n'));
