import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createPinia,setActivePinia} from 'pinia';
import {effectScope,type EffectScope} from 'vue';
import {useHomeNavigation} from '../useHomeNavigation';
import {StoryApiService} from '@/services/StoryApiService';
import {storyFixture} from '@/testFixtures/story';
import {readTimelineReturnPath,timelineLocation} from '@/router/storyTarget';
import type {NavigationContext,Story} from '@/types/database';
const p=(id:string,startDate:string,endDate='TODAY')=>({id,label:{fr:id,en:''},startDate,endDate,categories:[],storyParentId:null});
const historical=[p('ancient','-3200','0476'),p('middle','0476','1492'),p('modern','1492','1789')];
const context:NavigationContext={id:'50',title:{fr:'Histoire',en:''},periods:historical,presentations:historical.map((period,i)=>({periodId:period.id,storyId:['10','15','16'][i],title:period.label}))};
const earth={type:'period' as const,id:'earth'};
let scope:EffectScope,nav:ReturnType<typeof useHomeNavigation>,data:Map<string,Story>;
beforeEach(()=>{
  setActivePinia(createPinia());
  data=new Map([
    ['1',storyFixture('1',[p('earth','G4.54')],[],['11','2','23'].map(id=>({id,title_fr:id,anchors:[earth]})))],
    ['11',storyFixture('11',[p('hadean','G4.54','G4.031'),p('archean','G4.031','G2.5')])],
    ['2',storyFixture('2',[p('life','G4.031')])],['23',storyFixture('23',[p('climate','G2.45')])],
    ['5',storyFixture('5',[p('homo','M2.8')],[],[{id:'39',title_fr:'Techniques',anchors:[],atRoot:true}])],
    ['39',storyFixture('39',[p('stone','M3.3')])],
    ['50',{...storyFixture('50',historical),navigationContexts:[context]}],
    ['10',{...storyFixture('10',[p('old','-3200','0476')]),navigationContexts:[context]}],
    ['15',{...storyFixture('15',[p('early','0476','1000'),p('late','1000','1492')]),navigationContexts:[context]}],
    ['16',{...storyFixture('16',[],[{id:'event',label_fr:'Révolution',date:'1789'}]),navigationContexts:[context]}],
  ]);
  vi.spyOn(StoryApiService.getInstance(),'getListStories').mockResolvedValue([...data.values()]);
  vi.spyOn(StoryApiService.getInstance(),'getStory').mockImplementation(async id=>{const value=data.get(id);if(!value)throw new Error('Not found');return value;});
  scope=effectScope();nav=scope.run(()=>useHomeNavigation())!;
});
afterEach(()=>{scope.stop();vi.restoreAllMocks();});
it('shows Earth as a return marker without adding it to geology or changing its bounds',async()=>{
  await nav.openStory('1',{storyId:'1',periodId:'earth'});await nav.selectStory('11',earth);
  expect(nav.currentPeriod.value).toBeNull();expect(nav.contextBar.value?.id).toBe('earth');expect(nav.contextBar.value?.startDate).toBe('G4.54');
  expect(nav.displayedPeriods.value.map(p=>p.id)).toEqual(['hadean','archean']);expect(nav.currentStoryBounds.value?.endYearsBP).toBe(2500000000);
  await nav.goBack();expect(nav.currentStoryId.value).toBe('1');expect(nav.currentPeriod.value?.id).toBe('earth');
});
it('retains the target duration and actual origin when the climate narrative is shorter',async()=>{
  await nav.openStory('1',{storyId:'1',periodId:'earth'});await nav.selectStory('23',earth);
  expect(nav.currentStoryBounds.value?.startYearsBP).toBe(2450000000);expect(nav.previousPeriod.value).toBeNull();expect(nav.nextPeriod.value).toBeNull();
  await nav.goBack();expect(nav.currentPeriod.value?.id).toBe('earth');
});
it('keeps chronological neighbors on direct entry with no wrapper or invented history',async()=>{
  await nav.openStory('15');expect(nav.currentPeriod.value).toBeNull();expect(nav.contextBar.value?.id).toBe('middle');
  expect(nav.returnPath.value).toEqual([]);expect(nav.previousPeriod.value?.id).toBe('ancient');expect(nav.nextPeriod.value?.id).toBe('modern');
  await nav.goBack();expect(nav.currentStoryId.value).toBe('50');expect(nav.currentPeriod.value?.id).toBe('middle');
});
it('crosses narratives temporally while keeping the original return and local subdivision order',async()=>{
  await nav.openStory('50',{storyId:'50',periodId:'middle'});await nav.selectStory('15',{type:'period',id:'middle'});
  await nav.handlePeriodClick(nav.displayedPeriods.value[0]);expect(nav.nextPeriod.value?.id).toBe('late');
  await nav.goBack();expect(nav.nextPeriod.value?.id).toBe('modern');
  nav.navigateAdjacentPeriod('next');await vi.waitFor(()=>expect(nav.currentStoryId.value).toBe('16'));
  await vi.waitFor(()=>expect(nav.loading.value).toBe(false));
  expect(nav.currentPeriod.value).toBeNull();expect(nav.storyEvents.value).toHaveLength(1);expect(nav.returnPath.value).toHaveLength(1);
  expect(nav.storyBreadcrumb.value.map(p=>p.id)).toEqual(['story:50','story:16']);
  await nav.goBack();expect(nav.currentStoryId.value).toBe('50');expect(nav.currentPeriod.value?.id).toBe('middle');
});
it('accepts the old period URL as a reference after the wrapper is removed',async()=>{
  await nav.openStory('15',{storyId:'15',contextId:'50',periodId:'middle'});
  expect(nav.error.value).toBeNull();expect(nav.currentPeriod.value).toBeNull();expect(nav.referencePeriodId.value).toBe('middle');
});
it('restores the actual source position after a temporal transition while an old wrapper still exists',async()=>{
  data.set('16',{...storyFixture('16',[p('modern','1492','1789')]),navigationContexts:[context]});
  await nav.openStory('50',{storyId:'50',periodId:'middle'});await nav.selectStory('15',{type:'period',id:'middle'});
  nav.navigateAdjacentPeriod('next');await vi.waitFor(()=>expect(nav.currentStoryId.value).toBe('16'));
  await vi.waitFor(()=>expect(nav.loading.value).toBe(false));expect(nav.currentPeriod.value?.id).toBe('modern');
  await nav.goBack();expect(nav.currentStoryId.value).toBe('50');expect(nav.currentPeriod.value?.id).toBe('middle');
});
it('keeps shared entry associations while returning through the actual visited narratives',async()=>{
  await nav.openStory('1',{storyId:'1',periodId:'earth'});await nav.selectStory('11',earth);await nav.selectStory('2',earth);
  expect(nav.contextStories.value.map(s=>s.id)).toContain('23');await nav.goBack();expect(nav.currentStoryId.value).toBe('11');
  await nav.goBack();expect(nav.currentPeriod.value?.id).toBe('earth');
});
it('opens a root entry even when the target starts before the source',async()=>{
  await nav.openStory('5',{storyId:'5',view:'overview'});expect(nav.rootStories.value.map(s=>s.id)).toEqual(['39']);await nav.selectStory('39');
  expect(nav.contextBar.value).toBeNull();expect(nav.returnTitle.value).toBe('Frise 5');expect(nav.currentStoryBounds.value?.startYearsBP).toBe(3300000);
  await nav.goBack();expect(nav.currentStoryId.value).toBe('5');expect(nav.currentPeriod.value).toBeNull();
});
it('keeps the true dates of a partially overlapping origin without expanding the target window',async()=>{
  const origin=p('hominins','M7','M1.2');data.set('1',storyFixture('1',[origin]));
  await nav.openStory('1',{storyId:'1',periodId:'hominins'});await nav.selectStory('5',{type:'period',id:'hominins'});
  expect(nav.contextBar.value?.startDate).toBe('M7');expect(nav.contextBar.value?.endDate).toBe('M1.2');
  expect(nav.currentStoryBounds.value?.startYearsBP).toBe(2800000);expect(nav.displayedPeriods.value.map(p=>p.id)).toEqual(['homo']);
});
it.each([['M7','M3'],['2100','2200'],['','']])('keeps an origin outside the window or without dates out of the timeline (%s to %s)',async(start,end)=>{
  data.set('1',storyFixture('1',[p('origin',start,end)]));
  await nav.openStory('1',{storyId:'1',view:'overview'});await nav.selectStory('5',{type:'period',id:'origin'});
  expect(nav.contextBar.value).toBeNull();expect(nav.returnTitle.value).toBe('Frise 1');
  await nav.goBack();expect(nav.currentStoryId.value).toBe('1');
});
it('does not turn a source frise into a period when entry comes from an event',async()=>{
  data.set('1',storyFixture('1',[p('older','M7','M3')],[{id:'appearance',label_fr:'Apparition du genre Homo',date:'M2.8'}]));
  await nav.openStory('1',{storyId:'1',view:'overview'});await nav.selectStory('5',{type:'event',id:'appearance'});
  expect(nav.contextBar.value).toBeNull();expect(nav.returnTitle.value).toBe('Frise 1');
  expect(nav.currentStoryBounds.value?.startYearsBP).toBe(2800000);
  await nav.goBack();expect(nav.currentStoryId.value).toBe('1');
});
it('restores return state after reload using browser history without storing it in the data',async()=>{
  const state={timelineReturnPath:[{storyId:'1',periodId:'earth',anchor:earth,anchorStoryId:'1'}]};
  const returnPath=readTimelineReturnPath(state);expect(returnPath).toHaveLength(1);
  const location=timelineLocation({storyId:'11',view:'overview',returnPath});expect(location).toHaveProperty('state',state);
  await nav.openStory('11',{storyId:'11',view:'overview',returnPath});await nav.goBack();expect(nav.currentPeriod.value?.id).toBe('earth');
  expect(readTimelineReturnPath({timelineReturnPath:[{storyId:'invalid'}]})).toEqual([]);
});
