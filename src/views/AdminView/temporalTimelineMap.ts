import { comparableYearsBeforePresent } from '@temporal';
import type { RelationsContent, RelationsNetwork, RelationStory } from '@/types/adminRelations';
import { buildTimelineForest, type TimelineBranch } from './adminTimelineTree';

export const TEMPORAL_MAP_WIDTH=4096;
export const TEMPORAL_MAP_ROW_HEIGHT=72;
export const TEMPORAL_MAP_ROW_GAP=8;
export interface TimelineBounds {start:number;end:number}
export interface TemporalMapRow {
  story:RelationStory;left:number;width:number;top:number;bounds:TimelineBounds|null;childCount:number;
}
export interface TemporalViewport {x:number;scale:number;width:number}

/** Crop before DOM layout, so a billion-year bar never exceeds browser pixel limits. */
export function projectTemporalRow(row:TemporalMapRow,view:TemporalViewport) {
  const start=row.left*view.scale+view.x;
  const end=(row.left+row.width)*view.scale+view.x;
  const left=Math.max(0,start),right=Math.min(view.width,end);
  const visible=right>=left;
  let bounds=row.bounds;
  if (bounds&&end>start&&visible) {
    const duration=bounds.start-bounds.end;
    bounds={start:bounds.start-(left-start)/(end-start)*duration,end:bounds.end+(end-right)/(end-start)*duration};
  }
  return {left:visible?left:0,width:visible?Math.max(0,right-left):0,bounds,visible};
}

/** One shared, linear date axis. Hierarchy affects rows only, never horizontal coordinates. */
export function buildTemporalTimelineMap(network:RelationsNetwork,contents:Map<string,RelationsContent>,collapsed:Set<string>,now=Date.now(),heights:ReadonlyMap<string,number>=new Map()) {
  const bounds=new Map<string,TimelineBounds>();
  for (const [id,content] of contents) {
    const values=[...content.periods.flatMap(p=>[p.startDate,p.endDate]),...content.events.map(e=>e.date)]
      .flatMap(raw=>{const value=comparableYearsBeforePresent(raw,undefined,now);return value===null?[]:[value];});
    if (values.length) bounds.set(id,{start:Math.max(...values),end:Math.min(...values)});
  }
  const all=[...bounds.values()];
  const start=all.length?Math.max(...all.map(b=>b.start)):0;
  const end=all.length?Math.min(...all.map(b=>b.end)):0;
  const duration=start-end;
  const forest=buildTimelineForest(network,contents);
  const rows:TemporalMapRow[]=[];
  const undated:TemporalMapRow[]=[];
  function visit(branch:TimelineBranch) {
    const interval=bounds.get(branch.story.id)??null;
    const row={story:branch.story,bounds:interval,childCount:branch.children.length,
      left:interval&&duration?(start-interval.start)/duration*TEMPORAL_MAP_WIDTH:0,
      width:interval?(duration?(interval.start-interval.end)/duration*TEMPORAL_MAP_WIDTH:0):400,
      top:0};
    (interval?rows:undated).push(row);
    if (!collapsed.has(branch.story.id)) branch.children.forEach(visit);
  }
  forest.roots.forEach(visit);
  let cursor=0;
  function placeRows(items:TemporalMapRow[]) {
    items.forEach(row=>{
      row.top=cursor;
      cursor+=(heights.get(row.story.id)??(TEMPORAL_MAP_ROW_HEIGHT-TEMPORAL_MAP_ROW_GAP))+TEMPORAL_MAP_ROW_GAP;
    });
  }
  placeRows(rows);
  const undatedTop=cursor+32;
  if (undated.length) {cursor=undatedTop+32;placeRows(undated);}
  return {rows:[...rows,...undated],width:TEMPORAL_MAP_WIDTH+400,
    height:cursor||TEMPORAL_MAP_ROW_HEIGHT,
    undatedTop:undated.length?undatedTop:null,parents:forest.parents,referenceTime:now};
}
