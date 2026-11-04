import { expect, it } from 'vitest';
import type { RelationsContent } from '@/types/adminRelations';
import { buildTemporalTimelineMap, projectTemporalRow, TEMPORAL_MAP_WIDTH } from '../temporalTimelineMap';
import { leafNetwork } from './networkFixture';

const content=(id:string,startDate:string,endDate:string):RelationsContent=>({storyId:id,events:[],periods:[{id:`p${id}`,title:id,startDate,endDate,parentId:null,wikidataId:null,uses:1}]});
const now=Date.UTC(2026,10,4);
it('places humanity after the beginning of the universe with proportional duration and the same present-day endpoint',()=>{
  const contents=new Map([['1',content('1','G13.8','NOW')],['2',content('2','G4.54','NOW')],['3',content('3','M3','NOW')]]);
  const map=buildTemporalTimelineMap(leafNetwork(),contents,new Set(),now);
  const [universe,earth,humanity]=['1','2','3'].map(id=>map.rows.find(row=>row.story.id===id)!);
  expect(universe.left).toBe(0);expect(universe.width).toBe(TEMPORAL_MAP_WIDTH);
  expect(earth.left).toBeGreaterThan(universe.left);expect(humanity.left).toBeGreaterThan(earth.left);
  expect(humanity.width/universe.width).toBeCloseTo(3e6/13.8e9,10);
  expect(humanity.width).toBeLessThan(1); // No artificial minimum width that would falsify dates.
  for (const row of [earth,humanity]) expect(row.left+row.width).toBeCloseTo(TEMPORAL_MAP_WIDTH,8);
});
it('aligns a frise ending where another starts, independently of their hierarchy',()=>{
  const contents=new Map([['1',content('1','M100','NOW')],['2',content('2','M80','M50')],['3',content('3','M50','M20')]]);
  const network=leafNetwork();
  const map=buildTemporalTimelineMap(network,contents,new Set(),now);
  const first=map.rows.find(row=>row.story.id==='2')!,second=map.rows.find(row=>row.story.id==='3')!;
  expect(first.left+first.width).toBeCloseTo(second.left,10);
  network.links=[];
  const rearranged=buildTemporalTimelineMap(network,contents,new Set(),now);
  for (const row of map.rows) {
    const other=rearranged.rows.find(item=>item.story.id===row.story.id)!;
    expect([other.left,other.width]).toEqual([row.left,row.width]);
  }
});
it('keeps the time axis stable when branches are folded and includes event bounds',()=>{
  const oldest=content('1','M100','M50');
  oldest.events=[{id:'e',title:'Ancien',date:'M200',importance:'normal',wikidataId:null,uses:1}];
  const contents=new Map([['1',oldest],['2',content('2','M50','NOW')]]);
  const network=leafNetwork();
  const full=buildTemporalTimelineMap(network,contents,new Set(),now);
  const folded=buildTemporalTimelineMap(network,contents,new Set(['1']),now);
  expect(folded.rows).toHaveLength(1);
  expect(folded.rows[0].bounds?.start).toBe(200e6);
  expect(folded.rows[0].width).toBe(full.rows[0].width);
  expect(folded.rows[0].width).toBeCloseTo(TEMPORAL_MAP_WIDTH*.75,10);
});
it('separates unknown dates from dated rows rather than inventing temporal positions',()=>{
  const map=buildTemporalTimelineMap(leafNetwork(),new Map([['1',content('1','unknown','unknown')],['2',content('2','M10','NOW')]]),new Set(),now);
  expect(map.rows.find(row=>row.story.id==='1')?.bounds).toBeNull();
  expect(map.rows.find(row=>row.story.id==='3')?.bounds).toBeNull();
  expect(map.undatedTop).not.toBeNull();
  expect(map.rows.find(row=>row.story.id==='1')!.top).toBeGreaterThan(map.rows.find(row=>row.story.id==='2')!.top);
});
it('preserves short frises and shared endpoints at large zoom without producing oversized DOM bars',()=>{
  const map=buildTemporalTimelineMap(leafNetwork(),new Map([['1',content('1','G13.8','NOW')],['2',content('2','M3','NOW')],['3',content('3','2000','NOW')]]),new Set(),now);
  const view={scale:1e8,x:600-TEMPORAL_MAP_WIDTH*1e8,width:800};
  for (const row of map.rows) {
    const rendered=projectTemporalRow(row,view);
    expect(rendered.visible).toBe(true);
    expect(rendered.left+rendered.width).toBeCloseTo(600,2);
    expect(rendered.width).toBeLessThanOrEqual(view.width);
    expect(rendered.bounds?.end).toBeCloseTo(0,8);
  }
});
it('packs rows using measured preview heights and keeps only a small gap when events disappear',()=>{
  const contents=new Map([['1',content('1','G13.8','NOW')],['2',content('2','G4.54','NOW')],['3',content('3','M3','NOW')]]);
  const network=leafNetwork();
  const withEvents=buildTemporalTimelineMap(network,contents,new Set(),now,new Map([['1',64],['2',76],['3',52]]));
  const withoutEvents=buildTemporalTimelineMap(network,contents,new Set(),now,new Map([['1',46],['2',58],['3',34]]));
  expect(withEvents.rows.map(row=>row.top)).toEqual([0,72,156]);
  expect(withoutEvents.rows.map(row=>row.top)).toEqual([0,54,120]);
  expect(withoutEvents.height).toBe(withEvents.height-54);
  expect(withoutEvents.rows.map(row=>[row.left,row.width])).toEqual(withEvents.rows.map(row=>[row.left,row.width]));
});
it('juxtaposes Antiquity and contemporary history on the same level using their actual date intervals',()=>{
  const network=leafNetwork();
  const contents=new Map([['1',content('1','M3','NOW')],['2',content('2','-3300','0476')],['3',content('3','1789','NOW')]]);
  const map=buildTemporalTimelineMap(network,contents,new Set(),now,new Map([['1',64],['2',76],['3',46]]));
  const parent=map.rows.find(row=>row.story.id==='1')!;
  const antiquity=map.rows.find(row=>row.story.id==='2')!;
  const contemporary=map.rows.find(row=>row.story.id==='3')!;
  expect(antiquity.top).toBe(contemporary.top);
  expect(antiquity.top).toBe(parent.top+64+8);
  expect(antiquity.left+antiquity.width).toBeLessThan(contemporary.left);
  expect(map.height).toBe(antiquity.top+76+8); // The tallest preview defines the shared lane's height.
  const hiddenEvents=buildTemporalTimelineMap(network,contents,new Set(),now,new Map([['1',46],['2',58],['3',28]]));
  expect(hiddenEvents.height).toBe(map.height-36);
  expect(hiddenEvents.rows.find(row=>row.story.id==='2')!.top).toBe(hiddenEvents.rows.find(row=>row.story.id==='3')!.top);
});
it('separates overlapping frises but reuses the same lane for a following interval with a shared boundary',()=>{
  const network=leafNetwork();network.links=network.links.filter(link=>link.type==='legacy');
  network.stories.push({id:'4',title:'Suite',isPublic:true,periods:1,events:0});
  network.links.push({id:'fourth',type:'legacy',source:'1',target:'4',anchor:null});
  const contents=new Map([['1',content('1','M100','NOW')],['2',content('2','M90','M50')],['3',content('3','M70','M20')],['4',content('4','M50','NOW')]]);
  const map=buildTemporalTimelineMap(network,contents,new Set(),now);
  const first=map.rows.find(row=>row.story.id==='2')!,overlapping=map.rows.find(row=>row.story.id==='3')!,following=map.rows.find(row=>row.story.id==='4')!;
  expect(first.top).not.toBe(overlapping.top);
  expect(first.top).toBe(following.top);
  expect(first.left+first.width).toBeCloseTo(following.left,10);
  expect(map.rows).toHaveLength(4);
});
