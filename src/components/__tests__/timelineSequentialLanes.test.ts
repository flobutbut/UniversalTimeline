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
