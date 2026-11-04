/** Development-only experiment. Reads a fixed audit snapshot and never writes to the API. */
import { computed, ref } from 'vue';
import { comparableYearsBeforePresent } from '@temporal';
import type { ListEvent, ListPeriod, Period, Story, StoryAnchor, StorySuggestion } from '@/types/database';
import { timelinePeriodPath, levelNeighbors, timelineLevel } from '@/lib/timelineNavigation';
import snapshot from './snapshot.json';

const text = (fr: string | null, en: string | null = '') => ({ fr: fr ?? '', en: en ?? '' });
const catalogue = new Map<string, ListPeriod>(snapshot.periods.map(p => [p.id, {
  id:p.id, label:text(p.label_fr,p.label_en), startDate:p.start_date ?? '', endDate:p.end_date ?? '', categories:[],
  startYearsBP:p.start_years_bp === null ? undefined : Number(p.start_years_bp), endYearsBP:p.end_years_bp === null ? undefined : Number(p.end_years_bp),
}]));
const eventCatalogue = new Map<string, ListEvent>(snapshot.events.map(e => [e.id, {
  id:e.id, label:text(e.label_fr), date:e.date ?? '', categories:[], dateYearsBP:e.date_years_bp === null ? undefined : Number(e.date_years_bp),
}]));
const presentations = snapshot.story_period_presentations;
// Remove only the four period memberships used as chronological presentation frames.
// Their source periods remain in the reference frise; the API/database remain untouched.
const omitted = new Set(presentations.map(p => `${p.target_story_id}:${p.period_id}`));
const stories = new Map<string, Story>();
for (const s of snapshot.stories) {
  const links=snapshot.story_periods.filter(p=>p.story_id===s.id && !omitted.has(`${s.id}:${p.period_id}`));
  const ids=new Set(links.map(p=>p.period_id));
  const periods:Period[]=links.map(link=>({
    ...catalogue.get(link.period_id)!, storyParentId:link.parent_period_id && ids.has(link.parent_period_id) ? link.parent_period_id : null,
    hasParent:!!link.parent_period_id && ids.has(link.parent_period_id),
    hasChildren:links.some(p=>p.parent_period_id===link.period_id),
    children:links.filter(p=>p.parent_period_id===link.period_id).map(p=>p.period_id), temporalLocation:'',
  }));
  stories.set(String(s.id), {id:String(s.id),title:text(s.title_fr,s.title_en),author:'',isPublic:true,categories:[],periods,
    events:snapshot.story_events.filter(e=>e.story_id===s.id).map(e=>({...eventCatalogue.get(e.event_id)!,importance:e.importance as ListEvent['importance']})),
    childStories:[],relatedStories:[],parentStoryId:s.parent_story_id===null?null:String(s.parent_story_id)});
}
type Access = {source:string;target:string;anchor:StoryAnchor|null};
const accesses:Access[]=[];
function addAccess(source:string,target:string,anchor:StoryAnchor|null) {
  if(!stories.has(source)||!stories.has(target))return;
  const sourceStory=stories.get(source)!;
  const anchorId=anchor?.id;
  if(anchor && !(anchor.type==='period'?sourceStory.periods:sourceStory.events).some(p=>p.id===anchorId))anchor=null;
  if(!accesses.some(a=>a.source===source&&a.target===target&&a.anchor?.type===anchor?.type&&a.anchor?.id===anchor?.id))accesses.push({source,target,anchor});
}
for(const s of snapshot.stories) {
  if(s.parent_story_id===null)continue;
  const anchors=snapshot.story_anchors.filter(a=>a.story_id===s.id);
  if(!anchors.length)addAccess(String(s.parent_story_id),String(s.id),null);
  for(const a of anchors)addAccess(String(s.parent_story_id),String(s.id),{type:a.anchor_type as StoryAnchor['type'],id:a.anchor_id});
}
for(const e of snapshot.story_entry_points)addAccess(String(e.source_story_id),String(e.target_story_id),e.period_id?{type:'period',id:e.period_id}:{type:'event',id:e.event_id!});
for(const p of presentations)addAccess(String(p.context_story_id),String(p.target_story_id),{type:'period',id:p.period_id});
// Proposed root entry for the critical case; exists only in this fixture.
addAccess('5','39',null);
for(const s of stories.values()) {
  const anchored=accesses.filter(a=>a.source===s.id&&a.anchor);
  s.childStories=[...new Set(anchored.map(a=>a.target))].map(id=>({id,title:stories.get(id)!.title,anchors:anchored.filter(a=>a.target===id).map(a=>a.anchor!)}));
  s.relatedStories=[...stories.values()].filter(other=>other.id!==s.id).map(other=>({id:other.id,title:other.title,
    periodIds:other.periods.filter(p=>s.periods.some(own=>own.id===p.id)).map(p=>p.id),
    eventIds:other.events.filter(e=>s.events.some(own=>own.id===e.id)).map(e=>e.id),
  })).filter(other=>other.periodIds.length||other.eventIds.length);
}

export const prototypeCases = [
  {id:'terre',label:'Terre → Géologie',storyId:'1',periodId:'PER_MILKYWAY',hint:'Dans le badge de Terre, ouvre la frise géologique. La première ligne permet de revenir, sans ajouter Terre au récit géologique.'},
  {id:'temps',label:'Continuité dans le temps',storyId:'24',periodId:null,hint:'Explore Moyen Âge puis ouvre sa frise associée. Les flèches retrouvent Antiquité et Époque moderne, même sans chapeau dans la cible.'},
  {id:'durees',label:'Durées différentes',storyId:'1',periodId:'PER_MILKYWAY',hint:'Depuis le badge de Terre, ouvre Histoire du climat. Le repère de retour reste Terre, mais les périodes et événements gardent les dates du récit climatique.'},
  {id:'racine',label:'Accès à la racine',storyId:'5',periodId:null,hint:'Le badge à côté de Genre Homo donne accès à Techniques sans chapeau. Techniques commence avant Homo : 3,3 Ma contre 2,8 Ma.'},
  {id:'origines',label:'Deux origines',storyId:'1',periodId:'PER_MILKYWAY',hint:'Les deux boutons ouvrent Climat depuis des origines différentes. La barre de retour doit suivre l’origine choisie.'},
  {id:'direct',label:'Entrée directe',storyId:'15',periodId:null,hint:'Le récit du Moyen Âge conserve sa place chronologique sans visite précédente. La première ligne rejoint la période de référence, sans inventer un historique.'},
] as const;
export type PrototypeCaseId = typeof prototypeCases[number]['id'];
type Position = {storyId:string;periodId:string|null;context:{storyId:string;periodId:string}|null};
type ReturnFrame = {position:Position;anchor:StoryAnchor|null;anchorStoryId:string};
const copy = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const suggestion=(id:string):StorySuggestion=>({id,title:stories.get(id)!.title,parentStoryId:null});

export function useNavigationPrototype() {
  const position=ref<Position>({storyId:'1',periodId:'PER_MILKYWAY',context:null});
  const returns=ref<ReturnFrame[]>([]);
  const caseId=ref<PrototypeCaseId>('terre');
  const currentStory=computed(()=>stories.get(position.value.storyId)!);
  const currentPeriod=computed(()=>currentStory.value.periods.find(p=>p.id===position.value.periodId)??null);
  const path=computed(()=>currentPeriod.value?timelinePeriodPath(currentStory.value.periods,currentPeriod.value.id)??[]:[]);
  const displayedPeriods=computed(()=>currentStory.value.periods.filter(p=>p.storyParentId===(currentPeriod.value?.id??null)));
  const parentPeriod=computed(()=>path.value[path.value.length-2]??null);
  const rootStories=computed(()=>accesses.filter(a=>a.source===currentStory.value.id&&!a.anchor).map(a=>suggestion(a.target)));
  const bounds=computed(()=>{
    const now=Date.now();
    const values=[...currentStory.value.periods.flatMap(p=>[comparableYearsBeforePresent(p.startDate,p.startYearsBP,now),comparableYearsBeforePresent(p.endDate,p.endYearsBP,now)]),
      ...currentStory.value.events.map(e=>comparableYearsBeforePresent(e.date,e.dateYearsBP,now))].filter((n):n is number=>n!==null);
    return values.length?{startYearsBP:Math.max(...values),endYearsBP:Math.min(...values)}:null;
  });
  const events=computed(()=>{
    if(!currentPeriod.value)return currentStory.value.events;
    const p=currentPeriod.value,now=Date.now(),start=comparableYearsBeforePresent(p.startDate,p.startYearsBP,now),end=comparableYearsBeforePresent(p.endDate,p.endYearsBP,now);
    return currentStory.value.events.filter(e=>{const n=comparableYearsBeforePresent(e.date,e.dateYearsBP,now);return n!==null&&start!==null&&end!==null&&n<=start&&n>=end;});
  });
  const chronologicalPlace=computed(()=>{
    const context=position.value.context;
    if(context&&(!currentPeriod.value||(context.storyId===position.value.storyId&&context.periodId===position.value.periodId)))return context;
    return currentPeriod.value?{storyId:currentStory.value.id,periodId:currentPeriod.value.id}:null;
  });
  const neighbors=computed(()=>{
    const place=chronologicalPlace.value;if(!place)return {previous:null,next:null};
    const source=stories.get(place.storyId)!,sourcePath=timelinePeriodPath(source.periods,place.periodId);
    return levelNeighbors(timelineLevel(source.periods,Math.max(0,(sourcePath?.length??1)-1)),place.periodId);
  });
  const reference=computed(()=>{
    if(currentPeriod.value)return null;
    if(position.value.context){const c=position.value.context;return {period:catalogue.get(c.periodId)!,storyId:c.storyId,anchor:{type:'period',id:c.periodId} as StoryAnchor};}
    const from=returns.value[returns.value.length-1];if(!from)return null;
    const source=stories.get(from.anchorStoryId)!;
    const period=from.anchor?.type==='period'?catalogue.get(from.anchor.id):null;
    return {period:period??{id:`root:${source.id}`,label:source.title,startDate:'',endDate:'',categories:[]},storyId:source.id,anchor:from.anchor};
  });
  const contextBar=computed<ListPeriod|null>(()=>reference.value?{...reference.value.period,startDate:'',endDate:''}:null);
  const contextStories=computed(()=>{
    const r=reference.value;if(!r)return [];
    return [...new Set(accesses.filter(a=>a.source===r.storyId&&(r.anchor?a.anchor?.type===r.anchor.type&&a.anchor?.id===r.anchor.id:!a.anchor)).map(a=>a.target))].map(suggestion);
  });
  const storyBreadcrumb=computed(()=>[...returns.value.map((r,i)=>({id:`visit:${i}`,title:stories.get(r.position.storyId)!.title.fr,kind:'story' as const})),{id:`current:${currentStory.value.id}`,title:currentStory.value.title.fr,kind:'story' as const}]);
  const periodBreadcrumb=computed(()=>path.value.map(p=>({id:p.id,title:p.label.fr,kind:'period' as const})));

  function reset(id:PrototypeCaseId) {
    const preset=prototypeCases.find(c=>c.id===id)!;caseId.value=id;returns.value=[];
    position.value={storyId:preset.storyId,periodId:preset.periodId,context:id==='direct'?{storyId:'24',periodId:'Q12554'}:null};
  }
  function openPeriod(period:ListPeriod) {if(currentStory.value.periods.some(p=>p.id===period.id))position.value={...position.value,periodId:period.id};}
  function enterStory(id:string,anchor?:StoryAnchor) {
    if(!stories.has(id)||id===currentStory.value.id)return;
    const sourceId=reference.value&&anchor?.id===reference.value.anchor?.id?reference.value.storyId:currentStory.value.id;
    const presentation=anchor?.type==='period'?presentations.find(p=>String(p.context_story_id)===sourceId&&String(p.target_story_id)===id&&p.period_id===anchor.id):null;
    returns.value=[...returns.value,{position:copy(position.value),anchor:anchor??null,anchorStoryId:sourceId}];
    position.value={storyId:id,periodId:null,context:presentation?{storyId:sourceId,periodId:presentation.period_id}:null};
  }
  function goBack() {
    if(currentPeriod.value){position.value={...position.value,periodId:parentPeriod.value?.id??null};return;}
    if(returns.value.length){const next=[...returns.value],previous=next.pop()!;returns.value=next;position.value=previous.position;return;}
    if(position.value.context){const c=position.value.context;position.value={storyId:c.storyId,periodId:c.periodId,context:null};}
  }
  function adjacent(direction:'previous'|'next') {
    const next=neighbors.value[direction],place=chronologicalPlace.value;if(!next||!place)return;
    if(place.storyId==='24') {
      const presentation=presentations.find(p=>String(p.context_story_id)===place.storyId&&p.period_id===next.period.id);
      position.value={storyId:presentation?String(presentation.target_story_id):place.storyId,periodId:presentation?null:next.period.id,context:{storyId:place.storyId,periodId:next.period.id}};
    } else position.value={...position.value,periodId:next.period.id};
  }
  function returnToStory(index:number) {const frame=returns.value[index];if(!frame)return;position.value=copy(frame.position);returns.value=returns.value.slice(0,index);}
  function enterClimate(source:'earth'|'geology') {
    returns.value=[];position.value=source==='earth'?{storyId:'1',periodId:'PER_MILKYWAY',context:null}:{storyId:'11',periodId:null,context:null};
    enterStory('23',source==='earth'?{type:'period',id:'PER_MILKYWAY'}:undefined);
  }
  return {caseId,position,returns,currentStory,currentPeriod,parentPeriod,displayedPeriods,events,bounds,rootStories,contextBar,contextStories,reference,
    previousPeriod:computed(()=>neighbors.value.previous?.period??null),nextPeriod:computed(()=>neighbors.value.next?.period??null),storyBreadcrumb,periodBreadcrumb,
    reset,openPeriod,enterStory,goBack,adjacent,returnToStory,enterClimate,
    loadStory:async(id:string)=>stories.get(id)!,
  };
}
