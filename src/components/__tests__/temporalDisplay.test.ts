import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import StoryTimeline from '@/components/StoryTimeline.vue';
import { TimelineScalingService } from '@/services/TimelineScalingService';
import { listEventYearsBP } from '@/lib/listEventTableHelpers';
import { compareYearsOldestFirst } from '@temporal';

it('keeps undated items accessible outside the axis instead of plotting them at today',async()=>{
  const view=mount(StoryTimeline,{props:{periods:[
    {id:'dated',label:{fr:'Datée',en:''},startDate:'M65',endDate:'M54'},
    {id:'unknown',label:{fr:'Ancienne',en:''},startDate:'unknown',endDate:'NOW'},
  ],events:[{id:'e',label:'Sans date',date:'unknown'}]}});
  expect(view.findAll('.story-timeline__period-bar')).toHaveLength(1);
  expect(view.findAll('.story-timeline__event-marker')).toHaveLength(0);
  const undated=view.get('.story-timeline__undated');expect(undated.text()).toContain('Dates non déterminées');
  await undated.findAll('button')[0].trigger('click');expect(view.emitted('select-period')?.[0]).toEqual(['unknown']);
  await undated.findAll('button')[1].trigger('click');expect(view.emitted('select-event')?.[0]).toEqual(['e']);
  expect(view.get('.story-timeline__foot').text()).not.toMatch(/aujourd/i);view.unmount();
});
it('does not draw an axis when every item has an unknown date',()=>{
  const view=mount(StoryTimeline,{props:{events:[{id:'e',label:'Événement',date:'unknown'}]}});
  expect(view.find('.story-timeline__track').exists()).toBe(false);expect(view.text()).toContain('Événement');view.unmount();
});
it('excludes unknown dates from scaling and treats a zero imported bound as explicit data',()=>{
  const service=new TimelineScalingService();
  expect(service.calculateTotalDuration([{startDate:'M65',endDate:'M54'},{startDate:'unknown',endDate:'unknown'}])).toBe(11000000);
  expect(service.calculateTotalDuration([{startYearsBP:100,endYearsBP:0}])).toBe(100);
  expect(service.calculateTotalDuration([{startDate:'unknown',endDate:'unknown'}])).toBe(0);
  expect(service.calculatePeriodStyles({startDate:'unknown',endDate:'unknown'},100,100)).toEqual({left:'0%',width:'0%'});
});
it('distinguishes undated events from the present, sorting unknowns last',()=>{
  expect(listEventYearsBP({date:'unknown',dateYearsBP:0})).toBeNull();
  expect(listEventYearsBP({date:'NOW',dateYearsBP:50})).toBe(0);
  expect([null,0,65,null,54].sort(compareYearsOldestFirst)).toEqual([65,54,0,null,null]);
});

it('sizes event markers by their importance in the frise and names it in the tooltip', async () => {
  const view = mount(StoryTimeline, { attachTo: document.body, props: { periods: [{ id: 'p', label: { fr: 'P', en: '' }, startDate: 'M65', endDate: 'M50' }], events: [
    { id: 'major', label: 'Majeur', date: 'M60', importance: 'major' as const },
    { id: 'normal', label: 'Normal', date: 'M58' },
    { id: 'minor', label: 'Mineur', date: 'M55', importance: 'minor' as const },
  ] } });
  const markers = view.findAll('.story-timeline__event-marker');
  expect(markers.map(marker => marker.classes().filter(name => /--(major|minor)$/.test(name)))).toEqual([
    ['story-timeline__event-marker--major'], [], ['story-timeline__event-marker--minor'],
  ]);
  await markers[0].trigger('mouseenter');
  expect(document.body.querySelector('.story-timeline-tooltip__detail')?.textContent).toMatch(/· Majeur$/);
  await markers[1].trigger('mouseenter');
  expect(document.body.querySelector('.story-timeline-tooltip__detail')?.textContent).not.toContain('·');
  view.unmount();
});
