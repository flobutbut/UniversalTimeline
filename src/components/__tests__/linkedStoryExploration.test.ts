import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';
import AssociatedStoriesBadge from '@/views/HomeView/AssociatedStoriesBadge.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import { linkedStoryPeriods } from '@/lib/linkedStoryPeriods';
import { indexStoryNavigationLinks, rootStoryNavigationLinks, storyNavigationLinks } from '@/lib/storyNavigationLinks';
let view:ReturnType<typeof mount>;
afterEach(()=>{view?.unmount();vi.restoreAllMocks();});
it('keeps frises displayed as periods in associated choices at their period and root, alongside their cards',()=>{
  const source=storyFixture('1',[{id:'parent',label_fr:'Parent'}],[{id:'event',label_fr:'Event',date:'1700'}],[
    {id:'2',title_fr:'Liée',atRoot:true,rootDisplayAsPeriod:true,anchors:[{type:'period',id:'parent',displayAsPeriod:true},{type:'event',id:'event'}]},
  ]);
  const links=storyNavigationLinks(source);
  expect(indexStoryNavigationLinks(links,'period').get('parent')?.map(s=>s.id)).toEqual(['2']);
  expect(indexStoryNavigationLinks(links,'event').get('event')?.map(s=>s.id)).toEqual(['2']);
  expect(rootStoryNavigationLinks(source).map(s=>s.id)).toEqual(['2']);
  const summary={...storyFixture('2'),startDate:'1500',endDate:'1900'};
  expect(linkedStoryPeriods(source,'parent',[summary])[0]).toMatchObject({linkedStoryId:'2',label:{fr:'Liée'},sourceAnchor:{type:'period',id:'parent'},startDate:'1500',endDate:'1900'});
  expect(linkedStoryPeriods(source,null,[summary])).toHaveLength(1);
  expect(linkedStoryPeriods(source,'unrelated',[summary])).toEqual([]);
});
it('omits from the open period badge only the frises visible as cards',async()=>{
  const source=storyFixture('1',[{id:'parent',label_fr:'Parent',start_date:'1600',end_date:'1800'}],[],[
    {id:'2',title_fr:'En carte',anchors:[{type:'period',id:'parent',displayAsPeriod:true}]},
    {id:'3',title_fr:'Hors fenêtre',anchors:[{type:'period',id:'parent',displayAsPeriod:true}]},
    {id:'4',title_fr:'Badge',anchors:[{type:'period',id:'parent'}]},
  ]);
  vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue(source);
  const links=linkedStoryPeriods(source,'parent',[{...storyFixture('2'),startDate:'1650',endDate:'1700'},{...storyFixture('3'),startDate:'1900',endDate:'1950'}]);
  view=mount(PeriodGrid,{props:{periods:[],linkedPeriods:links,events:[],loading:false,currentPeriod:source.periods[0],parentPeriod:null,currentStoryId:'1'}});await flushPromises();await new Promise(resolve=>setTimeout(resolve,10));await flushPromises();
  const badge=view.findAllComponents(AssociatedStoriesBadge).find(item=>item.props('periodId')==='parent')!;
  expect(badge.props('stories').map((story:{id:string})=>story.id)).toEqual(['3','4']);
});
it('clips associated story cards to the current window and opens the story without creating a period navigation level',async()=>{
  vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue(storyFixture('1'));
  const source=storyFixture('1',[{id:'parent',label_fr:'Parent',start_date:'1600',end_date:'1800'}],[],[
    {id:'2',title_fr:'Longue',anchors:[{type:'period',id:'parent',displayAsPeriod:true}]},
    {id:'3',title_fr:'Hors fenêtre',anchors:[{type:'period',id:'parent',displayAsPeriod:true}]},
  ]);
  const links=linkedStoryPeriods(source,'parent',[{...storyFixture('2'),startDate:'1500',endDate:'1700'},{...storyFixture('3'),startDate:'1900',endDate:'1950'}]);
  view=mount(PeriodGrid,{props:{periods:[],linkedPeriods:links,events:[],loading:false,currentPeriod:source.periods[0],parentPeriod:null,currentStoryId:'1'}});await flushPromises();
  const card=view.findAllComponents(PeriodCard).find(card=>card.props('period').id==='linked-story:2')!;
  expect(card.exists()).toBe(true);expect(view.findAllComponents(PeriodCard).some(card=>card.props('period').id==='linked-story:3')).toBe(false);
  expect(parseFloat(card.element.style.getPropertyValue('--period-left'))).toBeCloseTo(0,2);
  expect(parseFloat(card.element.style.getPropertyValue('--period-width'))).toBeCloseTo(50,0);
  expect(card.props('period').startDate).toBe('1500');
  card.vm.$emit('select',card.props('period'));await flushPromises();
  expect(view.emitted('story-select')).toEqual([['2',{type:'period',id:'parent'}]]);expect(view.emitted('period-click')).toBeUndefined();
});
