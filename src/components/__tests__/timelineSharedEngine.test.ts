import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import { timelineHierarchy } from '@/lib/timelineHierarchy';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { layoutSequentialLanes } from '@/lib/sequentialTimelineLanes';
import type { ListPeriod } from '@/types/database';
const period = (id: string, storyParentId: string | null, startDate: string, endDate: string): ListPeriod => ({id,storyParentId,label:{fr:id,en:''},startDate,endDate,categories:[]});
const fixtures = [period('a',null,'1000','1500'),period('b',null,'1500','2000'),
  period('a1','a','1100','1300'),period('a2','a','1200','1400'),period('b1','b','1600','1800'),
  period('grandchild','a1','1100','1150'),period('deep','grandchild','1105','1110')];
const views: VueWrapper[] = [];
beforeEach(()=>{vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue(storyFixture('1'));});
afterEach(()=>{views.splice(0).forEach(view=>view.unmount());vi.restoreAllMocks();});

it('assigns identical lanes at every depth in exploration, full preview, and interactive miniature', async()=>{
  const linked={...period('linked-story:9:period:grandchild','grandchild','1110','1140'),linkedStoryId:'9',sourceAnchor:{type:'period' as const,id:'grandchild'}};
  const all=[...fixtures,linked];
  const grid=mount(PeriodGrid,{props:{periods:fixtures.slice(0,2),childPeriods:fixtures.slice(2),childLinkedPeriods:[linked],showChildren:true,events:[],loading:false,currentPeriod:null,parentPeriod:null,currentStoryId:'1'}});
  const full=mount(StoryTimeline,{props:{periods:all,collapsible:true}});
  const compact=mount(StoryTimeline,{props:{periods:all,compact:true,collapsible:true}});
  const miniature=mount(StoryTimeline,{props:{periods:all,compact:true}});
  views.push(grid,full,compact,miniature); await flushPromises();
  const lanes=(view:VueWrapper,property:string)=>{
    const positions=view.findAll('[data-period-id]').map(node=>({id:node.attributes('data-period-id'),top:parseFloat((node.element as HTMLElement).style.getPropertyValue(property))}));
    const rows=[...new Set(positions.map(position=>position.top))].sort((a,b)=>a-b);
    return positions.map(position=>[position.id,rows.indexOf(position.top)]);
  };
  const expected=[['a',0],['b',0],['a1',1],['a2',2],['b1',2],['grandchild',3],['deep',4],['linked-story:9:period:grandchild',4]];
  expect(lanes(grid,'--period-top')).toEqual(expected);
  expect(lanes(full,'--story-period-top')).toEqual(expected);
  expect(lanes(compact,'--story-period-top')).toEqual(expected);
  expect(lanes(miniature,'--story-period-top')).toEqual(expected.filter(([, lane])=>Number(lane)<4));
  await grid.get('[data-period-id="linked-story:9:period:grandchild"] .period-card__title-action').trigger('click');
  expect(grid.emitted('story-select')).toEqual([['9',{type:'period',id:'grandchild'}]]);
});

it('collects all reachable descendants with local parent overrides and bounds legacy cycles',()=>{
  const items=[...fixtures,{...period('foreign',null,'1100','1200'),parentId:'a'},
    period('cycle1','cycle2','1100','1200'),period('cycle2','cycle1','1100','1200')];
  expect(timelineHierarchy(items,getStoryPeriodParentId,['a']).map(({item,depth})=>[item.id,depth]))
    .toEqual([['a',0],['a1',1],['a2',1],['grandchild',2],['deep',3]]);
  const all=timelineHierarchy(items,getStoryPeriodParentId);
  expect(new Set(all.map(node=>node.item.id)).size).toBe(items.length);
});

it('ignores invalid dates and keeps independent downward-only floors for each depth',()=>{
  const result=layoutSequentialLanes([
    {id:'child',depth:1,start:90,end:10},{id:'root',depth:0,start:100,end:0},
    {id:'deep',depth:4,start:80,end:20},{id:'invalid',depth:0,start:NaN,end:0},
  ]);
  expect(result.map(item=>[item.id,item.lane])).toEqual([['root',0],['child',1],['deep',2]]);
});
