// Génère le lot « personnalités » : JSON source, SQL transactionnel et retour arrière.
// Usage : node --experimental-strip-types build.mjs <repo> [content.mjs]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const repo = process.argv[2];
const content = await import(new URL(process.argv[3] ?? './content.mjs', import.meta.url));
const { stories, reused } = content;
const lot = content.lot ?? { slug: '20261112_personnalites', title: 'Personnalités (Jésus, Bouddha, Newton, Einstein, Hitler, Truman)', count: 'six' };
const { storedYearsBeforePresent, periodDateErrors } = await import(`${repo}/server/src/shared/temporal.ts`);
const REFERENCE = '2026-11-12T12:00:00Z';
const now = Date.parse(REFERENCE);
const idsFile = new URL('./ids.json', import.meta.url);
const ids = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, 'utf8')) : {};
const idOf = key => (ids[key] ??= randomUUID());
const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const fail = message => { console.error(message); process.exit(1); };
const bp = date => { const v = storedYearsBeforePresent(date, now); if (v === null || !Number.isFinite(v)) fail(`Date illisible : ${date}`); return v; };

const out = { reference_time: REFERENCE, stories: [], reusedPeriods: reused.periods, reusedEvents: reused.events };
const newPeriods = [], newEvents = [];
for (const s of stories) {
  const story = { key: s.key, parent_story_id: s.parent, title_fr: s.title[0], title_en: s.title[1], description_fr: s.description[0], description_en: s.description[1], tags: s.tags, periods: [], events: [], entries: s.entries.map(([source, event]) => ({ source_story_id: source, event_id: event })) };
  for (const p of s.periods) {
    const parentOf = ref => ref ? (reused.periods[ref] ? ref : (ids[ref] ?? fail(`Parent inconnu ${ref}`))) : null;
    if (p.id) { if (!reused.periods[p.id]) fail(`Période réutilisée inconnue ${p.id}`); story.periods.push({ period_id: p.id, parent_period_id: parentOf(p.parent), reused: true }); continue; }
    const errors = periodDateErrors(p.start, p.end, now);
    if (errors.start || errors.end) fail(`${p.key} : ${JSON.stringify(errors)}`);
    const row = { id: idOf(p.key), label_fr: p.label[0], label_en: p.label[1], description_fr: p.description[0], description_en: p.description[1], wikidata_id: p.q ?? null, wikipedia_title_fr: p.wiki?.[0] ?? null, wikipedia_title_en: p.wiki?.[1] ?? null, start_date: p.start, end_date: p.end, start_years_bp: bp(p.start), end_years_bp: bp(p.end), non_thematic: !!p.nonThematic };
    if (row.non_thematic !== (p.tags.length === 0)) fail(`${p.key} : tags et non_thematic incohérents`);
    newPeriods.push({ row, tags: p.tags }); story.periods.push({ period_id: row.id, parent_period_id: parentOf(p.parent), reused: false });
  }
  for (const e of s.events) {
    if (e.id) { if (!reused.events[e.id]) fail(`Événement réutilisé inconnu ${e.id}`); story.events.push({ event_id: e.id, importance: e.importance, reused: true }); continue; }
    if (!e.tags.length || e.tags.length > 3) fail(`${e.key} : 1 à 3 tags`);
    const row = { id: idOf(e.key), label_fr: e.label[0], label_en: e.label[1], description_fr: e.description[0], description_en: e.description[1], wikidata_id: e.q ?? null, wikipedia_title_fr: e.wiki?.[0] ?? null, wikipedia_title_en: e.wiki?.[1] ?? null, date: e.date, date_years_bp: bp(e.date) };
    newEvents.push({ row, tags: e.tags }); story.events.push({ event_id: row.id, importance: e.importance, reused: false });
  }
  if (story.events.length >= 16) fail(`${s.key} : 16 événements ou plus`);
  for (const entry of story.entries) if (entry.event_id && !reused.events[entry.event_id]) fail(`Ancre inconnue ${entry.event_id}`);
  out.stories.push(story);
}
out.newPeriods = newPeriods; out.newEvents = newEvents;
for (const [kind, list] of [['periods', newPeriods], ['events', newEvents]]) {
  const qids = list.map(x => x.row.wikidata_id).filter(Boolean), labels = list.map(x => x.row.label_fr.toLowerCase());
  if (new Set(qids).size !== qids.length || new Set(labels).size !== labels.length) fail(`Doublon dans les nouvelles fiches (${kind})`);
}
writeFileSync(idsFile, JSON.stringify(ids, null, 2));

const HEAD = kind => `-- ${lot.title}, 12 novembre 2026. ${kind}
-- Sources et décisions : ${lot.slug}.json et audits/2026-11-12-personnalites.md.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;
`;
const depth = (s, p) => p.parent_period_id ? 1 + depth(s, s.periods.find(x => x.period_id === p.parent_period_id)) : 0;
const check = (cond, message) => `IF NOT (${cond}) THEN RAISE EXCEPTION ${q(message)}; END IF;`;
const sources = [...new Set(stories.flatMap(s => [s.parent, ...s.entries.map(e => e[0])]))].sort((a, b) => a - b);
const sourceTitles = content.sources ?? JSON.parse(readFileSync(new URL('./sources.json', import.meta.url), 'utf8'));
const L = [];
L.push(HEAD(lot.heading ?? `Création de ${lot.count} frises.`));
L.push('DO $people$ DECLARE owner uuid; writer text; sid integer; BEGIN');
L.push(check(`(SELECT count(DISTINCT owner_user_id) FROM public.stories WHERE id IN (${sources.join(',')}))=1 AND (SELECT count(DISTINCT author) FROM public.stories WHERE id IN (${sources.join(',')}))=1`, 'Les frises sources n’ont pas un propriétaire et un auteur uniques.'));
L.push(`SELECT owner_user_id,author INTO owner,writer FROM public.stories WHERE id=${sources[0]};`);
for (const id of sources) L.push(check(`EXISTS(SELECT 1 FROM public.stories WHERE id=${id} AND md5(title_fr)=${q(sourceTitles[id])})`, `Frise source ${id} absente ou renommée.`));
for (const [id, e] of Object.entries(reused.events)) L.push(check(`EXISTS(SELECT 1 FROM public.events WHERE id=${q(id)} AND date=${q(e.date)} AND wikidata_id IS NOT DISTINCT FROM ${q(e.q)})`, `Événement réutilisé ${id} absent ou modifié.`));
for (const [id, p] of Object.entries(reused.periods)) L.push(check(`EXISTS(SELECT 1 FROM public.periods WHERE id=${q(id)} AND start_date=${q(p.start)} AND end_date=${q(p.end)} AND wikidata_id IS NOT DISTINCT FROM ${q(p.q)})`, `Période réutilisée ${id} absente ou modifiée.`));
for (const s of out.stories) {
  L.push(check(`NOT EXISTS(SELECT 1 FROM public.stories WHERE lower(title_fr)=lower(${q(s.title_fr)}))`, `Une frise « ${s.title_fr} » existe déjà.`));
  for (const e of s.entries) if (e.event_id) L.push(check(`EXISTS(SELECT 1 FROM public.story_events WHERE story_id=${e.source_story_id} AND event_id=${q(e.event_id)})`, `Ancre ${e.event_id} absente de la frise ${e.source_story_id}.`));
}
for (const [table, list] of [['periods', newPeriods], ['events', newEvents]]) for (const { row } of list)
  L.push(check(`NOT EXISTS(SELECT 1 FROM public.${table} WHERE id=${q(row.id)}${row.wikidata_id ? ` OR wikidata_id=${q(row.wikidata_id)}` : ''} OR lower(label_fr)=lower(${q(row.label_fr)}))`, `Nouvelle fiche déjà présente (${row.label_fr}) : réutiliser l’existant.`));
const pcols = ['id', 'label_fr', 'label_en', 'description_fr', 'description_en', 'wikidata_id', 'wikipedia_title_fr', 'wikipedia_title_en', 'start_date', 'end_date', 'start_years_bp', 'end_years_bp', 'non_thematic'];
const ecols = ['id', 'label_fr', 'label_en', 'description_fr', 'description_en', 'wikidata_id', 'wikipedia_title_fr', 'wikipedia_title_en', 'date', 'date_years_bp'];
const values = (rows, cols) => rows.map(r => `(${cols.map(c => q(r[c])).join(',')})`).join(',\n');
L.push(`INSERT INTO public.periods (${pcols.join(',')}) VALUES\n${values(newPeriods.map(x => x.row), pcols)};`);
L.push(`INSERT INTO public.events (${ecols.join(',')}) VALUES\n${values(newEvents.map(x => x.row), ecols)};`);
const tagRows = list => list.flatMap(x => x.tags.map((t, i) => `(${q(x.row.id)},${q(t)},${i + 1})`)).join(',\n');
L.push(`INSERT INTO public.period_tags (period_id,tag_id,position) VALUES\n${tagRows(newPeriods)};`);
L.push(`INSERT INTO public.event_tags (event_id,tag_id,position) VALUES\n${tagRows(newEvents)};`);
for (const s of out.stories) {
  L.push(`-- ${s.title_fr}`);
  L.push(`INSERT INTO public.stories (title_fr,title_en,description_fr,description_en,author,is_public,parent_story_id,owner_user_id) VALUES (${q(s.title_fr)},${q(s.title_en)},${q(s.description_fr)},${q(s.description_en)},writer,true,${s.parent_story_id},owner) RETURNING id INTO sid;`);
  L.push(`INSERT INTO public.story_tags (story_id,tag_id,position) VALUES ${s.tags.map((t, i) => `(sid,${q(t)},${i + 1})`).join(',')};`);
  L.push(`INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES ${[...s.periods].sort((a, b) => depth(s, a) - depth(s, b)).map(p => `(sid,${q(p.period_id)},${q(p.parent_period_id)})`).join(',')};`);
  L.push(`INSERT INTO public.story_events (story_id,event_id,importance) VALUES ${s.events.map(e => `(sid,${q(e.event_id)},${q(e.importance)})`).join(',')};`);
  L.push(`INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES ${s.entries.map(e => `(${e.source_story_id},sid,NULL,${q(e.event_id)},false)`).join(',')};`);
  L.push(check(`(SELECT count(*) FROM public.story_periods WHERE story_id=sid)=${s.periods.length} AND (SELECT count(*) FROM public.story_events WHERE story_id=sid)=${s.events.length} AND (SELECT count(*) FROM public.story_entry_points WHERE target_story_id=sid)=${s.entries.length}`, `Contenu inattendu pour « ${s.title_fr} ».`));
}
L.push(check(`(SELECT count(*) FROM public.periods WHERE id IN (${newPeriods.map(x => q(x.row.id)).join(',')}) AND start_years_bp>end_years_bp)=${newPeriods.length}`, 'Bornes de périodes incohérentes.'));
L.push('END $people$;\nCOMMIT;\n');

const R = [];
R.push(HEAD('Retour arrière ciblé ; ne pas exécuter automatiquement.'));
R.push('DO $people$ DECLARE sids integer[]; BEGIN');
R.push(`SELECT array_agg(id) INTO sids FROM public.stories WHERE title_fr IN (${out.stories.map(s => q(s.title_fr)).join(',')});`);
R.push(check(`cardinality(sids)=${out.stories.length}`, 'Les frises du lot ne sont pas toutes présentes.'));
R.push(check('NOT EXISTS(SELECT 1 FROM public.stories WHERE parent_story_id=ANY(sids))', 'Une frise a été rattachée à une frise du lot.'));
R.push(check('NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE source_story_id=ANY(sids))', 'Une frise du lot sert de source à un accès créé depuis.'));
R.push(check(`NOT EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN (${newPeriods.map(x => q(x.row.id)).join(',')}) AND NOT story_id=ANY(sids))`, 'Une période du lot est utilisée par une autre frise.'));
R.push(check(`NOT EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN (${newEvents.map(x => q(x.row.id)).join(',')}) AND NOT story_id=ANY(sids))`, 'Un événement du lot est utilisé par une autre frise.'));
for (const [table, list] of [['periods', newPeriods], ['events', newEvents]]) R.push(check(`(SELECT count(*) FROM public.${table} t WHERE ${list.map(({ row }) => `(t.id=${q(row.id)} AND t.label_fr=${q(row.label_fr)})`).join(' OR ')})=${list.length}`, `Des fiches du lot (${table}) ont été modifiées ou supprimées.`));
R.push('DELETE FROM public.stories WHERE id=ANY(sids);');
R.push(`DELETE FROM public.periods WHERE id IN (${newPeriods.map(x => q(x.row.id)).join(',')});`);
R.push(`DELETE FROM public.events WHERE id IN (${newEvents.map(x => q(x.row.id)).join(',')});`);
R.push('END $people$;\nCOMMIT;\n');

writeFileSync(`${repo}/database/data/${lot.slug}.json`, JSON.stringify(out, null, 2) + '\n');
writeFileSync(`${repo}/database/data/${lot.slug}.sql`, L.join('\n'));
writeFileSync(`${repo}/database/data/${lot.slug}_rollback.sql`, R.join('\n'));
console.log(`${out.stories.length} frises, ${newPeriods.length} périodes, ${newEvents.length} événements nouveaux`);
for (const s of out.stories) console.log(`  ${s.title_fr} : ${s.periods.length} périodes, ${s.events.length} événements, ${s.entries.length} accès`);
