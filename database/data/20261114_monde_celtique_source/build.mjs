// Génère le lot « Le monde celtique » (frise 87) : correction, compléments et liens.
// Usage : node --experimental-strip-types build.mjs <repo>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const repo = process.argv[2];
const { storedYearsBeforePresent, periodDateErrors } = await import(`${repo}/server/src/shared/temporal.ts`);
const REFERENCE = '2026-11-14T12:00:00Z', now = Date.parse(REFERENCE), slug = '20261114_monde_celtique';
const idsFile = new URL('./ids.json', import.meta.url);
const ids = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, 'utf8')) : {};
const idOf = key => (ids[key] ??= randomUUID());
const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const fail = m => { console.error(m); process.exit(1); };
const bp = d => { const v = storedYearsBeforePresent(d, now); if (!Number.isFinite(v)) fail(`Date illisible ${d}`); return v; };
const check = (cond, message) => `IF NOT (${cond}) THEN RAISE EXCEPTION ${q(message)}; END IF;`;

const S = 87;
const P = {
  champs: 'ce77a30d-1a24-4bd7-8a44-c814b843abc8', hallstatt: '1322e5b2-1cce-4ceb-af43-96b34912ed6e', latene: '80b51412-4ff5-4f15-8c53-99047fe52681',
  gauleCeltique: '697065a6-a932-4198-b99b-bed72fe8eb99', grandeExp: '9c0cb584-999b-4099-a3f1-e1b48bae4ba0', guerreGaules: '06454d26-49e3-4e67-9c5d-43f71efdb07b',
  gauleRomaine: '7e53786a-e942-49ce-b519-bbf8a616f6a0', bretagneRomaine: 'fef88ee8-062c-4067-87ba-d3b9daf42346',
  irlande: '871b6cbf-af81-4da4-a992-13a5cb10d694', emigration: 'c653e13b-be85-45b6-af45-353f8089df6c',
};
const E = { narbo: '390747a8-8d55-477e-a9fc-294060fe1ff4', telamon: '673a1e79-e7a7-429c-b9bc-008a905414f2', sac: 'fd7dee80-a205-4eb2-867d-ba4faef3986d', mention: '3652c3a2-54c2-47bb-8773-1748645f5cb5', alesia: 'bf2684a2-7df4-4f13-a062-36b3e38a5045', hadrien: '210a9912-6d85-4826-9b56-941ce6409aa2' };

// Frise : avant / après.
const story = {
  before: { title_fr: 'Le monde Celtique', title_en: 'Le monde Celtique', description_fr: null, description_en: null, parent_story_id: null },
  after: {
    title_fr: 'Le monde celtique', title_en: 'The Celtic world',
    description_fr: 'Des champs d’urnes aux royaumes du haut Moyen Âge : l’essor des Celtes en Europe, leurs expéditions jusqu’à Rome et Delphes, la conquête romaine, puis le monde gaélique et breton chrétien.',
    description_en: 'From the Urnfield culture to the early medieval kingdoms: the rise of the Celts across Europe, their expeditions to Rome and Delphi, the Roman conquest, then the Christian Gaelic and Brittonic world.',
    parent_story_id: null, // Le rattachement exige le même propriétaire (stories_parent_same_owner) : la frise d’Olivier reste sans parente.
  },
};
// Dates normalisées au format N BCE (même instant) et Grande Expédition corrigée (279-278).
const periodDates = [
  { id: P.champs, before: ['-1349', '-0799'], beforeBp: [3375.79884238928, 2825.80842486704], after: ['1350 BCE', '800 BCE'] },
  { id: P.grandeExp, before: ['-0279', '-0278'], beforeBp: [2305.81937823364, 2304.82006269634], after: ['279 BCE', '278 BCE'] },
];
const eventDates = [
  { id: E.narbo, before: '-0117', beforeBp: 2143.82349127396, after: '118 BCE' }, { id: E.telamon, before: '-0224', beforeBp: 2250.82143715828, after: '225 BCE' },
  { id: E.sac, before: '-0389', beforeBp: 2415.81801412842, after: '390 BCE' }, { id: E.mention, before: '-0516', beforeBp: 2542.81596338064, after: '517 BCE' },
];
for (const p of periodDates) { const err = periodDateErrors(p.after[0], p.after[1], now); if (err.start || err.end) fail(JSON.stringify(err)); }
for (const e of eventDates) if (e.id !== E.mention && Math.abs(bp(e.before) - bp(e.after)) > 1e-9) fail(`Conversion inexacte ${e.before}`);
if (Math.abs(bp('-1349') - bp('1350 BCE')) > 1e-9 || Math.abs(bp('-0799') - bp('800 BCE')) > 1e-9) fail('Conversion inexacte champs');

const newPeriods = [
  { key: 'hma', label: ['Haut Moyen Âge celtique', 'Early medieval Celtic world'], description: ['Après le départ de Rome, Irlande, Écosse, pays de Galles et Bretagne forment un monde celtique chrétien, centré sur ses monastères.', 'After Rome’s departure, Ireland, Scotland, Wales and Brittany form a Christian Celtic world centred on its monasteries.'], q: null, wiki: [null, null], start: '0400', end: '0800', tags: [], nonThematic: true, parent: null },
  { key: 'celtiberes', label: ['Guerres celtibères', 'Celtiberian Wars'], description: ['Les Celtibères du centre de l’Hispanie résistent à la conquête romaine.', 'The Celtiberians of central Hispania resist the Roman conquest.'], q: 'Q2446231', wiki: [null, 'Celtiberian Wars'], start: '181 BCE', end: '151 BCE', tags: ['conflits'], nonThematic: false, parent: P.latene },
];
const newEvents = [
  { key: 'vix', label: ['Tombe de Vix', 'Vix Grave'], description: ['Vers 500 av. J.-C., une princesse celte est inhumée en Bourgogne avec un char et un cratère grec en bronze de 1,64 m.', 'Around 500 BC, a Celtic princess is buried in Burgundy with a cart and a 1.64 m Greek bronze krater.'], q: 'Q1483632', wiki: ['Tombe de Vix', 'Vix Grave'], date: '500 BCE', tags: ['arts-culture-loisirs', 'peuplement-societe'] },
  { key: 'numance', label: ['Siège de Numance', 'Siege of Numantia'], description: ['Après des mois de blocus par Scipion Émilien, la cité celtibère de Numance tombe : la résistance de l’Hispanie centrale prend fin.', 'After months of blockade by Scipio Aemilianus, the Celtiberian city of Numantia falls, ending resistance in central Hispania.'], q: 'Q815183', wiki: ['Siège de Numance', 'Siege of Numantia'], date: '133 BCE', tags: ['conflits'] },
  { key: 'mona', label: ['Massacre des druides de Mona', 'Destruction of the druids of Mona'], description: ['Les légions de Suetonius Paulinus prennent l’île de Mona (Anglesey), sanctuaire des druides, et détruisent ses bois sacrés.', 'The legions of Suetonius Paulinus take the island of Mona (Anglesey), the druids’ sanctuary, and destroy its sacred groves.'], q: null, wiki: [null, null], date: '0060', tags: ['religions-spiritualites', 'conflits'] },
  { key: 'iona', label: ['Fondation d’Iona par Columba', 'Columba founds Iona'], description: ['Le moine irlandais Columba fonde sur l’île d’Iona un monastère qui évangélise les Pictes et rayonne sur l’Écosse et la Northumbrie.', 'The Irish monk Columba founds a monastery on Iona that converts the Picts and spreads its influence over Scotland and Northumbria.'], q: 'Q198409', wiki: ['Abbaye d\'Iona', 'Iona Abbey'], date: '0563', tags: ['religions-spiritualites'] },
  { key: 'kells', label: ['Livre de Kells', 'Book of Kells'], description: ['Vers 800, des moines d’Iona enluminent ce livre des Évangiles, chef-d’œuvre de l’art insulaire.', 'Around 800, monks of Iona illuminate this Gospel book, a masterpiece of Insular art.'], q: 'Q204221', wiki: ['Livre de Kells', 'Book of Kells'], date: '0800', tags: ['arts-culture-loisirs', 'religions-spiritualites'] },
];
for (const p of newPeriods) { const err = periodDateErrors(p.start, p.end, now); if (err.start || err.end) fail(`${p.key} ${JSON.stringify(err)}`); p.id = idOf(p.key); }
for (const e of newEvents) e.id = idOf(e.key);
const hma = ids.hma;
// Hiérarchie de la frise 87 : [période, parent avant, parent après].
const parents = [[P.grandeExp, null, P.latene], [P.guerreGaules, null, P.latene], [P.irlande, null, hma], [P.emigration, null, hma]];
const entries = [
  [21, S, 'period', P.latene], [10, S, null, null], [51, S, 'period', P.gauleCeltique], [53, S, 'period', P.bretagneRomaine], [45, S, 'period', P.guerreGaules],
  [S, 51, 'period', P.gauleRomaine], [S, 53, 'period', P.bretagneRomaine], [S, 45, 'period', P.guerreGaules], [S, 65, 'event', E.alesia], [S, 21, 'period', P.hallstatt],
];
const sources = { 10: 'fb7c3cea6b0617cee02d3b560efca02d', 21: 'd501dd144be9636e291c2c94d21ad1db', 45: 'a373c58af973543db64218f16043ceb3', 51: 'a74d273030b0bf0861b00fe2c59fca6b', 53: 'cd56c14df3aaf30e596c4c64750c0754', 65: 'c020ae735cd04dbce6ad3529ca614c31', 87: '086d5eef6e35e2589d76496d94fda2d5' };
writeFileSync(idsFile, JSON.stringify(ids, null, 2) + '\n');

const HEAD = kind => `-- Le monde celtique (frise 87), 14 novembre 2026. ${kind}
-- Sources et décisions : audits/2026-11-14-monde-celtique.md, ${slug}_source/build.mjs.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_anchors,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;
`;
const L = [HEAD('Correction, compléments et liens.'), 'DO $lot$ BEGIN'];
for (const [id, m] of Object.entries(sources)) L.push(check(`EXISTS(SELECT 1 FROM public.stories WHERE id=${id} AND md5(title_fr)=${q(m)})`, `Frise ${id} absente ou renommée.`));
L.push(check(`EXISTS(SELECT 1 FROM public.stories WHERE id=${S} AND parent_story_id IS NULL AND description_fr IS NULL AND description_en IS NULL AND title_en=${q(story.before.title_en)})`, 'La frise 87 a changé depuis l’analyse.'));
L.push(check(`(SELECT count(*) FROM public.story_periods WHERE story_id=${S})=10 AND (SELECT count(*) FROM public.story_events WHERE story_id=${S})=7 AND NOT EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=${S} AND parent_period_id IS NOT NULL)`, 'Le contenu de la frise 87 a changé depuis l’analyse.'));
L.push(check(`NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE ${S} IN (source_story_id,target_story_id)) AND NOT EXISTS(SELECT 1 FROM public.story_anchors WHERE story_id=${S})`, 'La frise 87 a déjà des liens.'));
for (const p of periodDates) L.push(check(`EXISTS(SELECT 1 FROM public.periods WHERE id=${q(p.id)} AND start_date=${q(p.before[0])} AND end_date=${q(p.before[1])})`, `Période ${p.id} modifiée depuis l’analyse.`));
for (const e of eventDates) L.push(check(`EXISTS(SELECT 1 FROM public.events WHERE id=${q(e.id)} AND date=${q(e.before)})`, `Événement ${e.id} modifié depuis l’analyse.`));
L.push(check(`EXISTS(SELECT 1 FROM public.periods WHERE id=${q(P.bretagneRomaine)} AND wikipedia_title_fr IS NULL AND wikipedia_title_en IS NULL)`, 'Bretagne romaine modifiée depuis l’analyse.'));
for (const [src, , type, id] of entries) if (src !== S && type) L.push(check(`EXISTS(SELECT 1 FROM public.story_${type}s WHERE story_id=${src} AND ${type}_id=${q(id)})`, `Ancre ${id} absente de la frise ${src}.`));
L.push(check(`EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=21 AND period_id=${q(P.latene)})`, 'La Tène absente de la frise 21.'));
L.push(check(`EXISTS(SELECT 1 FROM public.events WHERE id=${q(E.hadrien)} AND date='0122') AND NOT EXISTS(SELECT 1 FROM public.story_events WHERE story_id=${S} AND event_id=${q(E.hadrien)})`, 'Mur d’Hadrien absent ou déjà présent.'));
for (const p of newPeriods) L.push(check(`NOT EXISTS(SELECT 1 FROM public.periods WHERE id=${q(p.id)}${p.q ? ` OR wikidata_id=${q(p.q)}` : ''} OR lower(label_fr)=lower(${q(p.label[0])}))`, `Fiche déjà présente : ${p.label[0]}.`));
for (const e of newEvents) L.push(check(`NOT EXISTS(SELECT 1 FROM public.events WHERE id=${q(e.id)}${e.q ? ` OR wikidata_id=${q(e.q)}` : ''} OR lower(label_fr)=lower(${q(e.label[0])}))`, `Fiche déjà présente : ${e.label[0]}.`));
const a = story.after;
L.push(`UPDATE public.stories SET title_fr=${q(a.title_fr)},title_en=${q(a.title_en)},description_fr=${q(a.description_fr)},description_en=${q(a.description_en)} WHERE id=${S};`);
L.push(`INSERT INTO public.story_tags (story_id,tag_id,position) SELECT ${S},'conflits',2 WHERE NOT EXISTS(SELECT 1 FROM public.story_tags WHERE story_id=${S} AND (tag_id='conflits' OR position=2));`);
for (const p of periodDates) L.push(`UPDATE public.periods SET start_date=${q(p.after[0])},end_date=${q(p.after[1])},start_years_bp=${bp(p.after[0])},end_years_bp=${bp(p.after[1])} WHERE id=${q(p.id)};`);
for (const e of eventDates) L.push(`UPDATE public.events SET date=${q(e.after)},date_years_bp=${bp(e.after)} WHERE id=${q(e.id)};`);
L.push(`UPDATE public.periods SET wikipedia_title_fr='Bretagne (province romaine)',wikipedia_title_en='Roman Britain' WHERE id=${q(P.bretagneRomaine)};`);
L.push(`INSERT INTO public.periods (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,start_date,end_date,start_years_bp,end_years_bp,non_thematic) VALUES\n${newPeriods.map(p => `(${[p.id, p.label[0], p.label[1], p.description[0], p.description[1], p.q, p.wiki[0], p.wiki[1], p.start, p.end, bp(p.start), bp(p.end), p.nonThematic].map(q).join(',')})`).join(',\n')};`);
L.push(`INSERT INTO public.events (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,date,date_years_bp) VALUES\n${newEvents.map(e => `(${[e.id, e.label[0], e.label[1], e.description[0], e.description[1], e.q, e.wiki[0], e.wiki[1], e.date, bp(e.date)].map(q).join(',')})`).join(',\n')};`);
const ptags = newPeriods.flatMap(p => p.tags.map((t, i) => `(${q(p.id)},${q(t)},${i + 1})`));
if (ptags.length) L.push(`INSERT INTO public.period_tags (period_id,tag_id,position) VALUES ${ptags.join(',')};`);
L.push(`INSERT INTO public.event_tags (event_id,tag_id,position) VALUES\n${newEvents.flatMap(e => e.tags.map((t, i) => `(${q(e.id)},${q(t)},${i + 1})`)).join(',\n')};`);
L.push(`DELETE FROM public.story_periods WHERE story_id=${S} AND period_id=${q(P.gauleCeltique)};`);
L.push(`INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (${S},${q(hma)},NULL),(${S},${q(ids.celtiberes)},${q(P.latene)});`);
for (const [id, , after] of parents) L.push(`UPDATE public.story_periods SET parent_period_id=${q(after)} WHERE story_id=${S} AND period_id=${q(id)};`);
L.push(`INSERT INTO public.story_events (story_id,event_id,importance) VALUES ${[...newEvents.map(e => e.id), E.hadrien].map(id => `(${S},${q(id)},'normal')`).join(',')};`);
L.push(`INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES\n${entries.map(([s, t, type, id]) => `(${s},${t},${type === 'period' ? q(id) : 'NULL'},${type === 'event' ? q(id) : 'NULL'},false)`).join(',\n')};`);
L.push(check(`(SELECT count(*) FROM public.story_periods WHERE story_id=${S})=11 AND (SELECT count(*) FROM public.story_events WHERE story_id=${S})=13 AND (SELECT count(*) FROM public.story_entry_points WHERE ${S} IN (source_story_id,target_story_id))=${entries.length}`, 'Contenu inattendu après le lot.'));
L.push(check(`NOT EXISTS(SELECT 1 FROM public.story_periods c JOIN public.periods p ON p.id=c.period_id JOIN public.periods par ON par.id=c.parent_period_id WHERE c.story_id=${S} AND (p.start_years_bp>par.start_years_bp OR p.end_years_bp<par.end_years_bp))`, 'Une sous-période dépasse son parent.'));
L.push('END $lot$;\nCOMMIT;\n');

const R = [HEAD('Retour arrière ciblé ; ne pas exécuter automatiquement.'), 'DO $lot$ BEGIN'];
R.push(check(`(SELECT count(*) FROM public.story_entry_points WHERE ${S} IN (source_story_id,target_story_id))=${entries.length}`, 'Les accès de la frise 87 ont changé depuis le lot.'));
R.push(check(`NOT EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN (${newPeriods.map(p => q(p.id))}) AND story_id<>${S}) AND NOT EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN (${newEvents.map(e => q(e.id))}) AND story_id<>${S})`, 'Une fiche du lot est utilisée ailleurs.'));
for (const p of periodDates) R.push(check(`EXISTS(SELECT 1 FROM public.periods WHERE id=${q(p.id)} AND start_date=${q(p.after[0])} AND end_date=${q(p.after[1])})`, `Période ${p.id} modifiée depuis le lot.`));
for (const e of eventDates) R.push(check(`EXISTS(SELECT 1 FROM public.events WHERE id=${q(e.id)} AND date=${q(e.after)})`, `Événement ${e.id} modifié depuis le lot.`));
R.push(`DELETE FROM public.story_entry_points WHERE ${S} IN (source_story_id,target_story_id);`);
R.push(`DELETE FROM public.story_events WHERE story_id=${S} AND event_id IN (${[...newEvents.map(e => e.id), E.hadrien].map(q)});`);
for (const [id, before] of parents) R.push(`UPDATE public.story_periods SET parent_period_id=${q(before)} WHERE story_id=${S} AND period_id=${q(id)};`);
R.push(`DELETE FROM public.story_periods WHERE story_id=${S} AND period_id IN (${newPeriods.map(p => q(p.id))});`);
R.push(`INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (${S},${q(P.gauleCeltique)},NULL);`);
R.push(`DELETE FROM public.periods WHERE id IN (${newPeriods.map(p => q(p.id))});`);
R.push(`DELETE FROM public.events WHERE id IN (${newEvents.map(e => q(e.id))});`);
R.push(`UPDATE public.periods SET wikipedia_title_fr=NULL,wikipedia_title_en=NULL WHERE id=${q(P.bretagneRomaine)};`);
for (const p of periodDates) R.push(`UPDATE public.periods SET start_date=${q(p.before[0])},end_date=${q(p.before[1])},start_years_bp=${p.beforeBp[0]},end_years_bp=${p.beforeBp[1]} WHERE id=${q(p.id)};`);
for (const e of eventDates) R.push(`UPDATE public.events SET date=${q(e.before)},date_years_bp=${e.beforeBp} WHERE id=${q(e.id)};`);
R.push(`DELETE FROM public.story_tags WHERE story_id=${S} AND tag_id='conflits';`);
const b = story.before;
R.push(`UPDATE public.stories SET title_fr=${q(b.title_fr)},title_en=${q(b.title_en)},description_fr=NULL,description_en=NULL WHERE id=${S};`);
R.push('END $lot$;\nCOMMIT;\n');

writeFileSync(`${repo}/database/data/${slug}.sql`, L.join('\n'));
writeFileSync(`${repo}/database/data/${slug}_rollback.sql`, R.join('\n'));
writeFileSync(`${repo}/database/data/${slug}.json`, JSON.stringify({ reference_time: REFERENCE, story, periodDates, eventDates, newPeriods, newEvents, parents, entries, removed: [P.gauleCeltique], added: [E.hadrien] }, null, 2) + '\n');
console.log(`${newPeriods.length} périodes et ${newEvents.length} événements nouveaux, ${entries.length} accès`);
