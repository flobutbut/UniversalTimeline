import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
import type { ListPeriod } from '@/types/database';
const period=(id:string,startDate:string,endDate:string):ListPeriod=>({id,label:{fr:id,en:''},startDate,endDate,categories:[]});
let view:ReturnType<typeof mount>;
const top=(id:string)=>parseFloat((view.get(`[data-period-id="${id}"]`).element as HTMLElement).style.getPropertyValue('--period-top'));
async function render(periods:ListPeriod[],linkedPeriods: Array<ListPeriod & {linkedStoryId:string}>=[]) {
  view=mount(PeriodGrid,{props:{periods,linkedPeriods,events:[],loading:false,currentPeriod:null,parentPeriod:null,currentStoryId:'1'}});
  await flushPromises();
}
beforeEach(()=>{vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue(storyFixture('1'));});
afterEach(()=>{view?.unmount();vi.restoreAllMocks();});

it('keeps successive exploration periods on one line, including shared boundaries and gaps',async()=>{
  await render([period('last','1920','1950'),period('middle','1850','1900'),period('first','1800','1850')]);
  expect(top('first')).toBe(top('middle'));expect(top('middle')).toBe(top('last'));
  expect(view.findAll('.period-grid__period-position').map(card=>card.attributes('data-period-id'))).toEqual(['first','middle','last']);
});

it('shares the same downward-only lane floor between exploration periods and associated story cards',async()=>{
  await render([
    period('f','1940','1950'),period('e','1910','1930'),period('c','1850','1860'),period('a','1800','1840'),period('b','1820','1900'),
  ],[{...period('linked-story:2','1900','1920'),linkedStoryId:'2'}]);
  expect(top('b')).toBeGreaterThan(top('a'));expect(top('c')).toBeGreaterThan(top('b'));
  expect(top('linked-story:2')).toBe(top('c'));
  expect(top('e')).toBeGreaterThan(top('linked-story:2'));expect(top('f')).toBe(top('e'));
});

it('places even a short real temporal overlap on the next line instead of ignoring it at a large scale',async()=>{
  await render([period('long','1000','2000'),period('one-day-overlap','1999-12-31','2020')]);
  expect(top('one-day-overlap')).toBeGreaterThan(top('long'));
});

it('packs each level across parent boundaries, keeps its overlap floor, and restores the default layout', async () => {
  const parents = [period('parent-a','1000','1500'), period('parent-b','1500','2000')];
  const children = [
    {...period('a1','1000','1200'),storyParentId:'parent-a'},
    {...period('a2','1200','1400'),storyParentId:'parent-a'},
    {...period('a-overlap','1300','1500'),storyParentId:'parent-a'},
    {...period('b1','1600','1800'),storyParentId:'parent-b'},
    {...period('grandchild','1050','1100'),storyParentId:'a1'},
    {...period('foreign','1600','1800'),storyParentId:'another-frise'},
  ];
  await render(parents);
  await view.setProps({childPeriods:children,showChildren:true});
  expect(view.findAll('.period-grid__period-position').map(card=>card.attributes('data-period-id'))).toEqual(['parent-a','parent-b','a1','a2','a-overlap','b1','grandchild']);
  expect(top('a1')).toBeGreaterThan(top('parent-a'));expect(top('a1')).toBe(top('a2'));
  expect(top('a-overlap')).toBeGreaterThan(top('a2'));
  expect(top('parent-a')).toBe(top('parent-b'));
  expect(top('b1')).toBe(top('a-overlap'));
  expect(top('grandchild')).toBeGreaterThan(top('b1'));
  expect(view.get('[data-period-id="a1"]').classes()).not.toContain('period-card--compact');
  expect(view.get('[data-period-id="a1"]').attributes('aria-description')).toBe('Sous-période de parent-a');
  await view.get('[data-period-id="a1"] .period-card__title-action').trigger('click');
  expect(view.emitted('period-click')?.at(-1)).toEqual([children[0]]);
  await view.setProps({showChildren:false});
  expect(view.find('[data-period-id="a1"]').exists()).toBe(false);
  expect(top('parent-a')).toBe(top('parent-b'));
});

it('clips inline children to the existing window without changing parent or event coordinates', async () => {
  await render([period('parent','1000','2000')]);
  await view.setProps({events:[{id:'event',label:{fr:'Repère',en:''},date:'1500',categories:[]}]});
  const original = view.get('[data-period-id="parent"]').attributes('style');
  const eventStyle = view.get('.event-card').attributes('style');
  await view.setProps({showChildren:true,childPeriods:[
    {...period('overflows','0500','2500'),storyParentId:'parent'},
    {...period('outside','2500','2600'),storyParentId:'parent'},
    {...period('undated','',''),storyParentId:'parent'},
  ]});
  expect(view.get('[data-period-id="parent"]').attributes('style')).toBe(original);
  expect(view.get('.event-card').attributes('style')).toBe(eventStyle);
  const style = (view.get('[data-period-id="overflows"]').element as HTMLElement).style;
  expect(style.getPropertyValue('--period-left')).toBe('0%');
  expect(style.getPropertyValue('--period-width')).toBe('100%');
  expect(view.find('[data-period-id="outside"]').exists()).toBe(false);
  expect(view.get('.period-grid__undated').text()).toContain('undated');
});

it('opens an inline associated frise with its real anchor rather than a virtual catalogue period', async () => {
  await render([period('parent','1000','2000')]);
  await view.setProps({showChildren:true,childLinkedPeriods:[{
    ...period('linked-story:2:period:parent','1200','1800'),storyParentId:'parent',linkedStoryId:'2',sourceAnchor:{type:'period',id:'parent'},
  }]});
  await view.get('[data-period-id="linked-story:2:period:parent"] .period-card__title-action').trigger('click');
  expect(view.emitted('story-select')).toEqual([['2',{type:'period',id:'parent'}]]);
  expect(view.emitted('period-click')).toBeUndefined();
});

it('continues successive children from different parents on one line and separates real parent overlaps', async () => {
  await render([period('a','1000','1500'),period('b','1500','2000')]);
  await view.setProps({showChildren:true,childPeriods:[
    {...period('a1','1000','1500'),storyParentId:'a'},
    {...period('b1','1500','2000'),storyParentId:'b'},
  ]});
  expect(top('a')).toBe(top('b'));
  expect(top('a1')).toBe(top('b1'));
  expect(top('a1')).toBeGreaterThan(top('a'));
  await view.setProps({periods:[period('a','1000','1600'),period('b','1500','2000')]});
  expect(top('b')).toBeGreaterThan(top('a'));
  expect(top('a1')).toBeGreaterThan(top('b'));
  expect(top('a1')).toBe(top('b1'));
});
