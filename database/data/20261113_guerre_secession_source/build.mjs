// Génère le lot « Guerre de Sécession » : JSON source, SQL transactionnel et retour arrière.
// Adapté de 20261112_personnalites_source/build.mjs : une frise, rattachement historique,
// accès entrants et sortants ancrés sur une période ou un événement.
// Usage : node --experimental-strip-types build.mjs <repo>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const repo = process.argv[2];
const { lot, sources, reused, story: s } = await import(new URL('./content.mjs', import.meta.url));
const { storedYearsBeforePresent, periodDateErrors } = await import(`${repo}/server/src/shared/temporal.ts`);
const now = Date.parse(lot.reference);
const idsFile = new URL('./ids.json', import.meta.url);
const ids = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, 'utf8')) : {};
const idOf = key => (ids[key] ??= randomUUID());
const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const fail = message => { console.error(message); process.exit(1); };
const bp = date => { const v = storedYearsBeforePresent(date, now); if (v === null || !Number.isFinite(v)) fail(`Date illisible : ${date}`); return v; };

const newPeriods = [], newEvents = [], memberPeriods = [], memberEvents = [];
for (const p of s.periods) if (!p.id) idOf(p.key);
const parentOf = ref => ref ? (reused.periods[ref] ? ref : (ids[ref] ?? fail(`Parent inconnu ${ref}`))) : null;
const range = new Map(Object.entries(reused.periods).map(([id, p]) => [id, [bp(p.start), bp(p.end)]]));
for (const p of s.periods) {
  if (p.id) { if (!reused.periods[p.id]) fail(`Période réutilisée inconnue ${p.id}`); memberPeriods.push({ period_id: p.id, parent_period_id: parentOf(p.parent), reused: true }); continue; }
  const errors = periodDateErrors(p.start, p.end, now);
  if (errors.start || errors.end) fail(`${p.key} : ${JSON.stringify(errors)}`);
  if (!p.tags.length || p.tags.length > 3) fail(`${p.key} : 1 à 3 tags`);
  const row = { id: ids[p.key], label_fr: p.label[0], label_en: p.label[1], description_fr: p.description[0], description_en: p.description[1], wikidata_id: p.q ?? null, wikipedia_title_fr: p.wiki?.[0] ?? null, wikipedia_title_en: p.wiki?.[1] ?? null, start_date: p.start, end_date: p.end, start_years_bp: bp(p.start), end_years_bp: bp(p.end), non_thematic: false };
  range.set(row.id, [row.start_years_bp, row.end_years_bp]);
  newPeriods.push({ row, tags: p.tags }); memberPeriods.push({ period_id: row.id, parent_period_id: parentOf(p.parent), reused: false });
}
for (const m of memberPeriods) if (m.parent_period_id) {
  const [a, b] = range.get(m.period_id), [pa, pb] = range.get(m.parent_period_id);
  if (a > pa || b < pb) fail(`Période ${m.period_id} hors de son parent`);
}
for (const e of s.events) {
  if (e.id) { if (!reused.events[e.id]) fail(`Événement réutilisé inconnu ${e.id}`); memberEvents.push({ event_id: e.id, importance: e.importance, reused: true }); continue; }
  if (!e.tags.length || e.tags.length > 3) fail(`${e.key} : 1 à 3 tags`);
  const row = { id: idOf(e.key), label_fr: e.label[0], label_en: e.label[1], description_fr: e.description[0], description_en: e.description[1], wikidata_id: e.q ?? null, wikipedia_title_fr: e.wiki?.[0] ?? null, wikipedia_title_en: e.wiki?.[1] ?? null, date: e.date, date_years_bp: bp(e.date) };
  newEvents.push({ row, tags: e.tags }); memberEvents.push({ event_id: row.id, importance: e.importance, reused: false });
}
for (const [kind, list] of [['periods', newPeriods], ['events', newEvents]]) {
  const qids = list.map(x => x.row.wikidata_id).filter(Boolean), labels = list.map(x => x.row.label_fr.toLowerCase());
  if (new Set(qids).size !== qids.length || new Set(labels).size !== labels.length) fail(`Doublon dans les nouvelles fiches (${kind})`);
}
const memberLabels = [...newPeriods.map(x => x.row.label_fr.toLowerCase())];
for (const { row } of newEvents) if (memberLabels.includes(row.label_fr.toLowerCase())) fail(`Jumeau période/événement : ${row.label_fr}`);
const has = (type, id) => type === 'period' ? memberPeriods.some(p => p.period_id === id) : memberEvents.some(e => e.event_id === id);
for (const [src, , type, id] of s.entries) if (src === 'new' && !has(type, id)) fail(`Ancre sortante absente de la frise : ${id}`);
writeFileSync(idsFile, JSON.stringify(ids, null, 2) + '\n');

const out = { reference_time: lot.reference, story: { title_fr: s.title[0], title_en: s.title[1], description_fr: s.description[0], description_en: s.description[1], tags: s.tags, parent_story_id: s.parent, anchor: s.anchor, entries: s.entries, periods: memberPeriods, events: memberEvents }, reusedPeriods: reused.periods, reusedEvents: reused.events, newPeriods, newEvents };

const HEAD = kind => `-- ${lot.title}, ${lot.date}. ${kind}
-- Sources et décisions : ${lot.slug}.json, ${lot.slug}_source/content.mjs.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_anchors,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;
`;
const check = (cond, message) => `IF NOT (${cond}) THEN RAISE EXCEPTION ${q(message)}; END IF;`;
const depth = m => m.parent_period_id ? 1 + depth(memberPeriods.find(x => x.period_id === m.parent_period_id)) : 0;
const ref = v => v === 'new' ? 'sid' : String(v);
const ids0 = Object.keys(sources).map(Number);
const L = [HEAD('Création d’une frise.'), 'DO $lot$ DECLARE owner uuid; writer text; sid integer; BEGIN'];
L.push(check(`(SELECT count(DISTINCT owner_user_id) FROM public.stories WHERE id IN (${ids0}))=1 AND (SELECT count(DISTINCT author) FROM public.stories WHERE id IN (${ids0}))=1`, 'Les frises sources n’ont pas un propriétaire et un auteur uniques.'));
L.push(`SELECT owner_user_id,author INTO owner,writer FROM public.stories WHERE id=${s.parent};`);
for (const [id, md5] of Object.entries(sources)) L.push(check(`EXISTS(SELECT 1 FROM public.stories WHERE id=${id} AND md5(title_fr)=${q(md5)})`, `Frise source ${id} absente ou renommée.`));
for (const [id, e] of Object.entries(reused.events)) L.push(check(`EXISTS(SELECT 1 FROM public.events WHERE id=${q(id)} AND date=${q(e.date)} AND wikidata_id IS NOT DISTINCT FROM ${q(e.q)})`, `Événement réutilisé ${id} absent ou modifié.`));
for (const [id, p] of Object.entries(reused.periods)) L.push(check(`EXISTS(SELECT 1 FROM public.periods WHERE id=${q(id)} AND start_date=${q(p.start)} AND end_date=${q(p.end)} AND wikidata_id IS NOT DISTINCT FROM ${q(p.q)})`, `Période réutilisée ${id} absente ou modifiée.`));
L.push(check(`NOT EXISTS(SELECT 1 FROM public.stories WHERE lower(title_fr)=lower(${q(s.title[0])}))`, `Une frise « ${s.title[0]} » existe déjà.`));
for (const [src, , type, id] of s.entries) if (src !== 'new') L.push(check(`EXISTS(SELECT 1 FROM public.story_${type}s WHERE story_id=${src} AND ${type}_id=${q(id)})`, `Ancre ${id} absente de la frise ${src}.`));
for (const [table, list] of [['periods', newPeriods], ['events', newEvents]]) for (const { row } of list)
  L.push(check(`NOT EXISTS(SELECT 1 FROM public.${table} WHERE id=${q(row.id)}${row.wikidata_id ? ` OR wikidata_id=${q(row.wikidata_id)}` : ''} OR lower(label_fr)=lower(${q(row.label_fr)}))`, `Nouvelle fiche déjà présente (${row.label_fr}) : réutiliser l’existant.`));
const pcols = ['id', 'label_fr', 'label_en', 'description_fr', 'description_en', 'wikidata_id', 'wikipedia_title_fr', 'wikipedia_title_en', 'start_date', 'end_date', 'start_years_bp', 'end_years_bp', 'non_thematic'];
const ecols = ['id', 'label_fr', 'label_en', 'description_fr', 'description_en', 'wikidata_id', 'wikipedia_title_fr', 'wikipedia_title_en', 'date', 'date_years_bp'];
const values = (rows, cols) => rows.map(r => `(${cols.map(c => q(r[c])).join(',')})`).join(',\n');
const tagRows = list => list.flatMap(x => x.tags.map((t, i) => `(${q(x.row.id)},${q(t)},${i + 1})`)).join(',\n');
L.push(`INSERT INTO public.periods (${pcols}) VALUES\n${values(newPeriods.map(x => x.row), pcols)};`);
L.push(`INSERT INTO public.events (${ecols}) VALUES\n${values(newEvents.map(x => x.row), ecols)};`);
L.push(`INSERT INTO public.period_tags (period_id,tag_id,position) VALUES\n${tagRows(newPeriods)};`);
L.push(`INSERT INTO public.event_tags (event_id,tag_id,position) VALUES\n${tagRows(newEvents)};`);
L.push(`INSERT INTO public.stories (title_fr,title_en,description_fr,description_en,author,is_public,parent_story_id,owner_user_id) VALUES (${q(s.title[0])},${q(s.title[1])},${q(s.description[0])},${q(s.description[1])},writer,true,${s.parent},owner) RETURNING id INTO sid;`);
L.push(`INSERT INTO public.story_tags (story_id,tag_id,position) VALUES ${s.tags.map((t, i) => `(sid,${q(t)},${i + 1})`).join(',')};`);
L.push(`INSERT INTO public.story_anchors (story_id,anchor_type,anchor_id) VALUES (sid,${q(s.anchor.type)},${q(s.anchor.id)});`);
L.push(`INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES ${[...memberPeriods].sort((a, b) => depth(a) - depth(b)).map(p => `(sid,${q(p.period_id)},${q(p.parent_period_id)})`).join(',')};`);
L.push(`INSERT INTO public.story_events (story_id,event_id,importance) VALUES\n${memberEvents.map(e => `(sid,${q(e.event_id)},${q(e.importance)})`).join(',\n')};`);
L.push(`INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES\n${s.entries.map(([src, tgt, type, id]) => `(${ref(src)},${ref(tgt)},${type === 'period' ? q(id) : 'NULL'},${type === 'event' ? q(id) : 'NULL'},false)`).join(',\n')};`);
L.push(check(`(SELECT count(*) FROM public.story_periods WHERE story_id=sid)=${memberPeriods.length} AND (SELECT count(*) FROM public.story_events WHERE story_id=sid)=${memberEvents.length} AND (SELECT count(*) FROM public.story_entry_points WHERE sid IN (source_story_id,target_story_id))=${s.entries.length}`, `Contenu inattendu pour « ${s.title[0]} ».`));
L.push(check(`(SELECT count(*) FROM public.periods WHERE id IN (${newPeriods.map(x => q(x.row.id))}) AND start_years_bp>end_years_bp)=${newPeriods.length}`, 'Bornes de périodes incohérentes.'));
L.push('END $lot$;\nCOMMIT;\n');

const R = [HEAD('Retour arrière ciblé ; ne pas exécuter automatiquement.'), 'DO $lot$ DECLARE sid integer; BEGIN'];
R.push(`SELECT id INTO sid FROM public.stories WHERE title_fr=${q(s.title[0])};`);
R.push(check('sid IS NOT NULL', 'La frise du lot est absente.'));
R.push(check('NOT EXISTS(SELECT 1 FROM public.stories WHERE parent_story_id=sid)', 'Une frise a été rattachée à la frise du lot.'));
R.push(check(`(SELECT count(*) FROM public.story_entry_points WHERE sid IN (source_story_id,target_story_id))=${s.entries.length}`, 'Les accès de la frise ont changé depuis le lot.'));
R.push(check(`NOT EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN (${newPeriods.map(x => q(x.row.id))}) AND story_id<>sid)`, 'Une période du lot est utilisée par une autre frise.'));
R.push(check(`NOT EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN (${newEvents.map(x => q(x.row.id))}) AND story_id<>sid)`, 'Un événement du lot est utilisé par une autre frise.'));
for (const [table, list] of [['periods', newPeriods], ['events', newEvents]]) R.push(check(`(SELECT count(*) FROM public.${table} t WHERE ${list.map(({ row }) => `(t.id=${q(row.id)} AND t.label_fr=${q(row.label_fr)})`).join(' OR ')})=${list.length}`, `Des fiches du lot (${table}) ont été modifiées ou supprimées.`));
R.push('DELETE FROM public.story_entry_points WHERE sid IN (source_story_id,target_story_id);');
R.push('DELETE FROM public.stories WHERE id=sid;');
R.push(`DELETE FROM public.periods WHERE id IN (${newPeriods.map(x => q(x.row.id))});`);
R.push(`DELETE FROM public.events WHERE id IN (${newEvents.map(x => q(x.row.id))});`);
R.push('END $lot$;\nCOMMIT;\n');

writeFileSync(`${repo}/database/data/${lot.slug}.json`, JSON.stringify(out, null, 2) + '\n');
writeFileSync(`${repo}/database/data/${lot.slug}.sql`, L.join('\n'));
writeFileSync(`${repo}/database/data/${lot.slug}_rollback.sql`, R.join('\n'));
console.log(`${memberPeriods.length} périodes (${newPeriods.length} nouvelles), ${memberEvents.length} événements (${newEvents.length} nouveaux), ${s.entries.length} accès`);
