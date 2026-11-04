import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
import { comparableYearsBeforePresent } from '../../server/src/shared/temporal.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(await fs.readFile(path.join(dir, 'source.json'), 'utf8'));
const now = Date.parse(db.extracted_at);
const eps = 1 / (365.25 * 86400); // Une seconde, pour les arrondis de calcul uniquement.
const pm = new Map(db.periods.map(p => [p.id, p]));
const em = new Map(db.events.map(e => [e.id, e]));
const sm = new Map(db.stories.map(s => [s.id, s]));
const title = id => sm.get(id)?.title_fr || sm.get(id)?.title_en || String(id);
const label = p => p?.label_fr || p?.label_en || p?.id || '';
const group = (rows, key) => Map.groupBy(rows, row => row[key]);
const memberships = group(db.story_periods, 'story_id');
const eventMemberships = group(db.story_events, 'story_id');
const periodUsage = group(db.story_periods, 'period_id');
const eventUsage = group(db.story_events, 'event_id');
const temporal = (raw, stored) => comparableYearsBeforePresent(raw, stored, now);
const periodBounds = p => ({start: temporal(p.start_date, p.start_years_bp), end: temporal(p.end_date, p.end_years_bp)});
const eventBounds = e => { const n = temporal(e.date, e.date_years_bp); return {start:n, end:n}; };
const complete = b => b.start !== null && b.end !== null && b.start >= b.end;
const envelopes = new Map();
for (const s of db.stories) {
  const items = [...(memberships.get(s.id) || []).map(m => ({kind:'period', id:m.period_id, ...periodBounds(pm.get(m.period_id))})),
    ...(eventMemberships.get(s.id) || []).map(m => ({kind:'event', id:m.event_id, ...eventBounds(em.get(m.event_id))}))];
  const known = items.flatMap(i => [i.start, i.end]).filter(n => n !== null);
  envelopes.set(s.id, {items, start:known.length ? Math.max(...known):null, end:known.length ? Math.min(...known):null,
    unknown:items.filter(i => !complete(i)).length});
}

// Dédoublonnage de la même relation physique, conservation de ses provenances.
const links = new Map();
function addLink(source, target, type, anchor, origin) {
  if (source == null) return;
  const key = [source,target,type,anchor].join('|');
  if (!links.has(key)) links.set(key, {source,target,type,anchor,origins:[]});
  links.get(key).origins.push(origin);
}
for (const s of db.stories) {
  if (s.parent_story_id == null) continue;
  const anchors = db.story_anchors.filter(a => a.story_id === s.id);
  if (!anchors.length) addLink(s.parent_story_id,s.id,'frise',null,'Parent historique sans ancre');
  for (const a of anchors) addLink(s.parent_story_id,s.id,a.anchor_type,a.anchor_id,'Parent + ancre historiques');
}
for (const l of db.story_entry_points) addLink(l.source_story_id,l.target_story_id,l.period_id ? 'period':'event',l.period_id || l.event_id,'Point d’entrée');
for (const l of db.story_period_presentations) addLink(l.context_story_id,l.target_story_id,'period',l.period_id,'Présentation chronologique');
const edges = [...links.values()];
const navEdges = edges.filter(l => l.origins.some(o => o !== 'Présentation chronologique'));
const adjacency = new Map(db.stories.map(s => [s.id,new Set(navEdges.filter(l=>l.source===s.id).map(l=>l.target))]));
function reachable(source,target) {
  const queue=[source], seen=new Set();
  while(queue.length) { const id=queue.shift(); if(id===target) return true; if(seen.has(id)) continue; seen.add(id); queue.push(...(adjacency.get(id)||[])); }
  return false;
}
const distances = new Map([[1,0]]), queue=[1];
while(queue.length) { const id=queue.shift(); for(const next of adjacency.get(id)||[]) if(!distances.has(next)) {distances.set(next,distances.get(id)+1); queue.push(next);} }
function legacyDepth(id) {
  let depth=0, cur=sm.get(id); const seen=new Set();
  while(cur?.parent_story_id != null) {if(seen.has(cur.id)) return null; seen.add(cur.id); depth++;cur=sm.get(cur.parent_story_id);}
  return depth;
}
const incoming = id => edges.filter(e=>e.target===id);
const outgoing = id => edges.filter(e=>e.source===id);

const periodRows = db.story_periods.map(m => {
  const p=pm.get(m.period_id), b=periodBounds(p), env=envelopes.get(m.story_id);
  const rest=env.items.filter(i=>i.kind!=='period'||i.id!==p.id);
  const knownRest=rest.filter(complete);
  const covers=complete(b) && knownRest.length>0 && knownRest.every(i=>b.start+eps>=i.start && b.end-eps<=i.end);
  const unknown=rest.filter(i=>!complete(i)).length;
  const status=!complete(b) ? 'Dates incomplètes ou inversées' : !rest.length ? 'Contenu unique' : covers && unknown===0 ? 'Couverture complète' : covers ? 'Couverture à confirmer' : 'Couverture partielle';
  const share=complete(b) && env.start>env.end ? (b.start-b.end)/(env.start-env.end):null;
  const children=(memberships.get(m.story_id)||[]).filter(x=>x.parent_period_id===p.id).length;
  const usages=periodUsage.get(p.id)||[];
  const linked=outgoing(m.story_id).filter(e=>e.type==='period'&&e.anchor===p.id);
  const presentations=db.story_period_presentations.filter(x=>x.period_id===p.id&&(x.context_story_id===m.story_id||x.target_story_id===m.story_id)).length;
  return {storyId:m.story_id,periodId:p.id,status,covers:status==='Couverture complète',
    row:[m.story_id,title(m.story_id),status,label(p),p.id,m.parent_period_id ? label(pm.get(m.parent_period_id)):'Racine',m.parent_period_id,
      p.start_date,p.end_date,b.start,b.end,share,children,knownRest.length,unknown,usages.length,
      [...new Set(linked.map(e=>e.target))].length,presentations,
      usages.filter(x=>x.story_id!==m.story_id).map(x=>title(x.story_id)).join('\n'),
      'À examiner','']};
});
periodRows.sort((a,b)=>Number(b.covers)-Number(a.covers)||a.storyId-b.storyId||a.periodId.localeCompare(b.periodId));

const sharedPairs=[];
for(let i=0;i<db.stories.length;i++) for(let j=i+1;j<db.stories.length;j++) {
  const a=db.stories[i], b=db.stories[j];
  const bp=new Set((memberships.get(b.id)||[]).map(x=>x.period_id)), be=new Set((eventMemberships.get(b.id)||[]).map(x=>x.event_id));
  const ps=(memberships.get(a.id)||[]).filter(x=>bp.has(x.period_id)).map(x=>x.period_id);
  const es=(eventMemberships.get(a.id)||[]).filter(x=>be.has(x.event_id)).map(x=>x.event_id);
  if(ps.length||es.length) sharedPairs.push({a:a.id,b:b.id,ps,es,row:[a.id,title(a.id),b.id,title(b.id),ps.length,es.length,
    edges.some(e=>e.source===a.id&&e.target===b.id||e.source===b.id&&e.target===a.id)?'Oui':'Non',
    ps.map(id=>`${label(pm.get(id))} [${id}]`).join('\n'),es.map(id=>`${label(em.get(id))} [${id}]`).join('\n')]});
}
const friseRows=db.stories.map(s=>{
  const ps=memberships.get(s.id)||[], es=eventMemberships.get(s.id)||[], env=envelopes.get(s.id);
  const candidates=periodRows.filter(p=>p.storyId===s.id&&p.covers);
  const ins=incoming(s.id), outs=outgoing(s.id);
  const sources=[...new Set(ins.map(l=>l.source))];
  const rootLinks=outs.filter(l=>l.type==='frise');
  const cycle=navEdges.some(l=>l.source===s.id&&reachable(l.target,s.id));
  return [s.id,title(s.id),candidates.length,candidates.map(c=>label(pm.get(c.periodId))).join('\n'),ps.length,es.length,
    ps.filter(p=>p.parent_period_id==null).length,s.is_public?'Publique':'Privée',s.parent_story_id,
    s.parent_story_id?title(s.parent_story_id):'',legacyDepth(s.id),distances.get(s.id)??null,
    sources.length,sources.map(title).join('\n'),[...new Set(outs.map(l=>l.target))].length,rootLinks.length,
    sharedPairs.filter(p=>p.a===s.id||p.b===s.id).length,
    db.story_period_presentations.filter(p=>p.target_story_id===s.id).length,env.start,env.end,env.unknown,
    cycle?'Oui':'Non','', '', '', 'À examiner',''];
});
const relationRows=edges.sort((a,b)=>a.source-b.source||a.target-b.target).map(l=>{
  const membership=l.type==='period'?(memberships.get(l.source)||[]).find(p=>p.period_id===l.anchor):null;
  const valid=l.type==='frise'||l.type==='period'&&!!membership||l.type==='event'&&(eventMemberships.get(l.source)||[]).some(e=>e.event_id===l.anchor);
  const targetHas=l.type==='period'&&(memberships.get(l.target)||[]).some(p=>p.period_id===l.anchor);
  let range='Sans intervalle de période';
  if(l.type==='period') {const b=periodBounds(pm.get(l.anchor)), t=envelopes.get(l.target); range=!complete(b)||t.start===null?'Dates insuffisantes':t.unknown?'Cible partiellement datée':t.start<=b.start+eps&&t.end>=b.end-eps?'Cible incluse dans l’ancre':'Cible déborde de l’ancre';}
  return [l.source,title(l.source),l.target,title(l.target),l.origins.join('\n'),l.type,l.anchor,
    l.type==='frise'?'Vue d’ensemble':label(l.type==='period'?pm.get(l.anchor):em.get(l.anchor)),
    valid?'Oui':'Non',l.type==='period'?(membership?.parent_period_id?'Sous-période':'Racine'):l.type==='frise'?'Racine de frise':'Événement',
    l.type==='period'?(targetHas?'Oui':'Non'):'Sans objet',range,
    l.origins.some(o=>o!=='Présentation chronologique')&&reachable(l.target,l.source)?'Oui':'Non'];
});
const analysis={counts:{stories:db.stories.length,periods:db.periods.length,events:db.events.length,memberships:db.story_periods.length,
  candidateStories:friseRows.filter(r=>r[2]>0).length,candidatePeriods:periodRows.filter(p=>p.covers).length,
  multiSources:friseRows.filter(r=>r[12]>1).length,unreachable:friseRows.filter(r=>r[11]===null).length,
  sharedPairs:sharedPairs.length,relations:edges.length,rootOnly:relationRows.filter(r=>r[9]==='Racine de frise').length},
  candidates:friseRows.filter(r=>r[2]>0).map(r=>({id:r[0],title:r[1],periods:r[3]})),
  unreachable:friseRows.filter(r=>r[11]===null).map(r=>({id:r[0],title:r[1]})),
  focus:friseRows.filter(r=>[1,2,5,11,23,38,39].includes(r[0]))};
await fs.writeFile(path.join(dir,'analysis.json'),JSON.stringify(analysis,null,2));
console.log(JSON.stringify(analysis));
assert.equal(new Set(friseRows.map(r=>r[0])).size,db.stories.length);
assert.equal(friseRows.reduce((s,r)=>s+r[4],0),db.story_periods.length);
assert.equal(friseRows.reduce((s,r)=>s+r[5],0),db.story_events.length);
assert.equal(periodRows.length,db.story_periods.length);
assert.ok(relationRows.every(r=>r[8]==='Oui'),'Ancre explicite absente de sa source');
if(process.argv.includes('--analyze-only')) process.exit(0);

const wb=Workbook.create();
const names=['Synthèse','Frises','Périodes','Accès','Partages'];
const sheets=Object.fromEntries(names.map(n=>[n,wb.worksheets.add(n)]));
const navy='#253750', amber='#FFF1CE', light='#EFF3F8';
function col(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function tableSheet(name,heading,note,headers,rows,widths) {
  const sh=sheets[name], last=col(headers.length-1), end=rows.length+5;
  sh.showGridLines=false;
  const used=sh.getRange(`A1:${last}${end}`);
  used.format.font.name='Arial';used.format.font.size=10;used.format.font.color='#202B3C';
  used.format.verticalAlignment='center';used.format.rowHeight=30;
  sh.getRange('A2').values=[[heading]];sh.getRange('A2').format.font.size=16;sh.getRange('A2').format.font.bold=true;
  sh.getRange('A3').values=[[note]];sh.getRange('A3').format.font.italic=true;
  sh.getRange(`A5:${last}5`).values=[headers];
  if(rows.length) sh.getRange(`A6:${last}${end}`).values=rows;
  const t=sh.tables.add(`A5:${last}${end}`,true,`Table${names.indexOf(name)}`);t.showFilterButton=true;t.style='TableStyleMedium2';
  sh.getRange(`A6:${last}${end}`).format.fill='#FFFFFF';
  rows.forEach((_,i)=>{if(i%2===0)sh.getRange(`A${i+6}:${last}${i+6}`).format.fill='#F3F5F8';});
  sh.getRange(`A6:A${end}`).format.horizontalAlignment='center';
  sh.getRange(`A5:${last}5`).format.fill=navy;sh.getRange(`A5:${last}5`).format.font.color='#FFFFFF';
  sh.getRange(`A5:${last}5`).format.font.bold=true;sh.getRange(`A5:${last}5`).format.wrapText=true;
  sh.getRange(`A5:${last}5`).format.horizontalAlignment='center';sh.getRange(`A5:${last}5`).format.rowHeight=48;
  sh.getRange(`A6:${last}${end}`).format.wrapText=true;
  widths.forEach((w,i)=>sh.getRange(`${col(i)}1:${col(i)}${end}`).format.columnWidth=w);
  sh.freezePanes.freezeRows(5);sh.freezePanes.freezeColumns(2);
  return sh;
}
const f=tableSheet('Frises','Inventaire des 39 frises','Source : Supabase Universal-Timeline, extraction du 04/11/2026 à 12:32 CET. Périmètre complet, frises privées incluses.',
  ['ID frise','Frise','Périodes couvrant tout','Périodes chapeau potentielles','Périodes','Événements','Racines locales','Visibilité','ID parent historique','Parent historique','Profondeur historique','Distance depuis Univers','Sources explicites','Frises sources','Destinations explicites','Liens sans ancre','Frises avec contenu partagé','Présentations reçues','Début comparé (années BP)','Fin comparée (années BP)','Contenus mal datés','Cycle d’accès explicite','Sujet proposé','Branche proposée','Parent éditorial proposé','Décision','Notes de revue'],
  friseRows,[10,47,16,39,12,14,14,14,16,39,17,17,14,45,17,16,18,17,23,23,16,16,32,28,40,22,48]);
f.tabColor=navy;
f.getRange(`W6:AA${friseRows.length+5}`).format.fill=amber;
f.getRange(`Z6:Z${friseRows.length+5}`).dataValidation={rule:{type:'list',values:['À examiner','Conserver','Retirer le chapeau','Reclasser','Créer un accès']}};
f.getRange(`C6:C${friseRows.length+5}`).conditionalFormats.add('cellIs',{operator:'greaterThan',formula:0,format:{fill:'#FCE5D6',font:{bold:true,color:'#8D3312'}}});
f.getRange(`A6:V${friseRows.length+5}`).format.rowHeight=38;
f.getRange(`S6:T${friseRows.length+5}`).setNumberFormat('#,##0.000');
const p=tableSheet('Périodes','Détection des périodes chapeau','Chaque ligne est une appartenance période–frise. Couverture complète = contient tous les autres contenus datés. L’utilité narrative reste à décider.',
  ['ID frise','Frise','Détection','Période','ID période','Parent local','ID parent local','Début source','Fin source','Début comparé (années BP)','Fin comparée (années BP)','Part de la durée totale','Enfants directs','Autres contenus datés','Autres contenus mal datés','Frises utilisant la période','Destinations sur cette période','Présentations liées','Autres frises utilisant la période','Décision éditoriale','Notes de revue'],
  periodRows.map(p=>p.row),[10,47,27,42,39,38,39,23,23,23,23,18,14,17,18,17,20,17,52,24,48]);
p.getRange(`L6:L${periodRows.length+5}`).setNumberFormat('0.0%');
p.getRange(`J6:K${periodRows.length+5}`).setNumberFormat('#,##0.000');
p.getRange(`T6:U${periodRows.length+5}`).format.fill=amber;
p.getRange(`T6:T${periodRows.length+5}`).dataValidation={rule:{type:'list',values:['À examiner','Utile au récit','Contexte seulement','Retirer après migration']}};
p.getRange(`C6:C${periodRows.length+5}`).conditionalFormats.add('containsText',{text:'Couverture complète',format:{fill:'#FCE5D6',font:{color:'#8D3312',bold:true}}});
const a=tableSheet('Accès','Relations explicites entre frises','Même lien dédoublonné avec ses provenances. Les débordements de dates et les cycles ne constituent pas automatiquement des erreurs.',
  ['ID source','Frise source','ID cible','Frise cible','Provenance du lien','Type d’ancre','ID ancre','Ancre','Ancre valide dans la source','Emplacement dans la source','Période présente dans la cible','Dates cible / ancre','Cycle d’accès explicite'],
  relationRows,[10,47,10,47,36,17,39,43,19,23,20,33,19]);
a.getRange(`A6:M${relationRows.length+5}`).format.rowHeight=48;
const sh=tableSheet('Partages','Contenus partagés entre frises','Une paire non orientée par ligne. Un contenu commun peut produire une suggestion dans les deux sens. Il ne prouve ni parenté ni succession.',
  ['ID frise A','Frise A','ID frise B','Frise B','Périodes communes','Événements communs','Relation explicite entre A et B','Périodes communes et identifiants','Événements communs et identifiants'],
  sharedPairs.map(p=>p.row),[10,47,10,47,16,17,25,75,85]);
sh.getRange(`A6:I${sharedPairs.length+5}`).format.rowHeight=72;
// Lists remain complete in Excel. Adapt row height to the longest list, without truncation.
for(const [name,rows,start] of [['Frises',friseRows,6],['Périodes',periodRows.map(p=>p.row),6],['Accès',relationRows,6],['Partages',sharedPairs.map(p=>p.row),6]]) {
  rows.forEach((r,i)=>{const lines=Math.max(...r.map(v=>typeof v==='string'?v.split('\n').length:1));if(lines>3)sheets[name].getRange(`A${start+i}:${col(r.length-1)}${start+i}`).format.rowHeight=Math.min(409,lines*15+8);});
}
const s=sheets['Synthèse'];s.showGridLines=false;s.tabColor=navy;
s.getRange('A1:F35').format.font.name='Arial';s.getRange('A1:F35').format.font.size=10;s.getRange('A1:F35').format.verticalAlignment='center';s.getRange('A1:F35').format.rowHeight=25;
s.getRange('A1:A35').format.columnWidth=52;s.getRange('B1:B35').format.columnWidth=17;s.getRange('C1:C35').format.columnWidth=4;s.getRange('D1:F35').format.columnWidth=32;
s.getRange('A2').values=[['Audit des frises et de la navigation']];s.getRange('A2').format.font.size=16;s.getRange('A2').format.font.bold=true;
s.getRange('A4:B4').values=[['Indicateur','Nombre']];s.getRange('A4:B4').format.fill=navy;s.getRange('A4:B4').format.font.color='#FFFFFF';
const lastF=friseRows.length+5,lastP=periodRows.length+5;
s.getRange('A5:A13').values=[['Frises recensées'],['Frises avec une couverture complète'],['Périodes à couverture complète'],['Frises avec plusieurs sources explicites'],['Frises sans chemin explicite depuis Univers'],['Appartenances période–frise'],['Appartenances événement–frise'],['Paires de frises partageant du contenu'],['Présentations chronologiques']];
s.getRange('B5:B13').formulas=[[`=COUNTA('Frises'!A6:A${lastF})`],[`=COUNTIFS('Frises'!C6:C${lastF},">0")`],[`=COUNTIFS('Périodes'!C6:C${lastP},"Couverture complète")`],[`=COUNTIFS('Frises'!M6:M${lastF},">1")`],[`=COUNTBLANK('Frises'!L6:L${lastF})`],[`=SUM('Frises'!E6:E${lastF})`],[`=SUM('Frises'!F6:F${lastF})`],[`=COUNTA('Partages'!A6:A${sharedPairs.length+5})`],[`=SUM('Frises'!R6:R${lastF})`]];
s.getRange('B5:B13').setNumberFormat('#,##0');
s.getRange('D4:F4').values=[['Revue','Où regarder','Action']];s.getRange('D4:F4').format.fill=navy;s.getRange('D4:F4').format.font.color='#FFFFFF';
s.getRange('D5:F8').values=[['Périodes chapeau','Périodes, filtre Détection','Décider de leur utilité au récit'],['Accès depuis la racine','Accès, colonne Emplacement','Prévoir un accès hors des barres'],['Plusieurs chemins possibles','Frises, colonnes Sources et Cycle','Choisir des relations typées'],['Suggestions par partage','Partages','Ne pas les traiter comme des parents']];
s.getRange('D5:F8').format.wrapText=true;s.getRange('D5:F8').format.rowHeight=38;
const notes=[
 ['Lecture du fichier',''],
 ['Détection','Une couverture complète est un candidat chapeau, pas un jugement sur l’utilité narrative. Aucune suppression automatique.'],
 ['Mesure','Bornes de tous les contenus de la frise, périodes et événements. Le candidat est exclu des contenus servant à vérifier son enveloppement.'],
 ['Dates','Comparaison à l’instant de l’extraction avec le moteur temporel du projet. BP signifie ici années avant cet instant, pas avant 1950.'],
 ['Données inconnues','Un autre contenu mal daté empêche de confirmer la couverture complète. Une période seule sans événement est classée Contenu unique.'],
 ['Profondeur historique','Nombre d’ancêtres via stories.parent_story_id. Elle décrit l’ancien classement, pas une échelle scientifique.'],
 ['Distance depuis Univers','Plus court chemin orienté depuis la frise 1, avec parents historiques et points d’entrée. Exclut partages et présentations. Cellule vide = aucun chemin.'],
 ['Champs à compléter','Cellules jaunes : sujet, branche, parent éditorial proposé, décision et notes. Les niveaux proposés ne sont pas inventés à partir des dates.'],
 ['Cas Terre','La période Terre a été retirée de la frise géologique. La base comporte maintenant des accès explicites depuis Univers vers Vie et Climat.'],
 ['Stratégie proposée','Distinguer sujet, récit, parcours et origine de navigation. Garder les appartenances explicites des périodes et des événements.'],
 ['Suite recommandée','Découpler le retour et les présentations des périodes présentes dans la cible, puis revoir les chapeaux. Lire le rapport joint pour le plan détaillé.'],
 ['Provenance','Instantané Supabase Universal-Timeline ftubzndxivponqoihrsu du '+db.extracted_at+'. Tables et requête conservées dans source.json et extraction.sql.'],
];
s.getRange('A16:B16').values=[['Méthode et décisions','Explication']];s.getRange('A16:B16').format.fill=navy;s.getRange('A16:B16').format.font.color='#FFFFFF';
// Put long explanations across a single wide, unmerged column D, leaving room for normal labels.
notes.slice(1).forEach(([k,v],i)=>{const r=17+i;s.getRange(`A${r}`).values=[[k]];s.getRange(`B${r}:F${r}`).values=[[v,null,null,null,null]];s.getRange(`B${r}`).format.wrapText=false;});
// Detailed method belongs in a readable vertical block, not overflowing occupied cells.
s.getRange('B17:F27').clear({applyTo:'contents'});
notes.slice(1).forEach(([k,v],i)=>{const r=17+i;s.getRange(`D${r}:F${r}`).clear({applyTo:'contents'});s.getRange(`D${r}`).values=[[v]];});
s.getRange('D17:D27').format.columnWidth=85;s.getRange('D17:D27').format.wrapText=true;s.getRange('A17:F27').format.rowHeight=58;
s.getRange('D16').values=[['Explication']];s.getRange('B16').clear({applyTo:'contents'});
wb.recalculate();
const actual=s.getRange('B5:B13').values.flat();
assert.deepEqual(actual,[analysis.counts.stories,analysis.counts.candidateStories,analysis.counts.candidatePeriods,analysis.counts.multiSources,analysis.counts.unreachable,db.story_periods.length,db.story_events.length,sharedPairs.length,db.story_period_presentations.length]);
// A review input must change the dependent headline and restore correctly.
const before=f.getRange('C6').values[0][0];f.getRange('C6').values=[[before>0?0:1]];
assert.equal(s.getRange('B6').values[0][0],analysis.counts.candidateStories+(before>0?-1:1));f.getRange('C6').values=[[before]];
const beforeStatus=p.getRange('C6').values[0][0];p.getRange('C6').values=[['Couverture partielle']];
assert.equal(s.getRange('B7').values[0][0],analysis.counts.candidatePeriods-1);p.getRange('C6').values=[[beforeStatus]];wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Synthèse!A4:B13',include:'values,formulas',tableMaxRows:10,tableMaxCols:2,maxChars:2400})).ndjson);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'Vérification finale des formules'});
console.log(errors.ndjson);
for(const [name,range] of [['Synthèse','A1:F13'],['Synthèse','A16:F27'],['Frises','A1:H12'],['Périodes','A1:H12'],['Accès','A1:F12'],['Partages','A1:G12']]) {
  const png=await wb.render({sheetName:name,range,scale:1.3,format:'png'});
  await fs.writeFile(path.join(dir,`preview-${names.indexOf(name)}${range==='A16:F27'?'-method':''}.png`),new Uint8Array(await png.arrayBuffer()));
}
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(path.join(dir,'audit-frises.xlsx'));
console.log('Classeur exporté et contrôlé.');
