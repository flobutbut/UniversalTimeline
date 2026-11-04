import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { adminApi } from '@/services/AdminApiService';
import type { RelationsContent, RelationsNetwork } from '@/types/adminRelations';
import AdminTimelines from '../AdminTimelines.vue';
import TimelineMapCanvas from '../TimelineMapCanvas.vue';
import TimelineMapCard from '../TimelineMapCard.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import { leafNetwork } from './networkFixture';

let pinia:Pinia;
let view:ReturnType<typeof mount>;
let resizeCallbacks:Map<Element,ResizeObserverCallback>;
const period=(id:string,title:string,startDate:string,endDate:string,parentId:string|null=null)=>({id,title,startDate,endDate,parentId,wikidataId:null,uses:1});
const content:RelationsContent={storyId:'1',periods:[
  period('parent','Parent','M100','NOW'),period('p','Période partagée','M100','M50','parent'),
  period('later','Suite','M50','NOW','parent'),period('deep','Profondeur','M90','M80','p'),
],events:[{id:'e',title:'Commun',date:'M85',wikidataId:null,importance:'major',uses:2}]};
beforeEach(()=>{
  resizeCallbacks=new Map();
  vi.stubGlobal('ResizeObserver',class {
    constructor(private callback:ResizeObserverCallback){}
    observe(element:Element){resizeCallbacks.set(element,this.callback);}
    unobserve(element:Element){resizeCallbacks.delete(element);}
    disconnect(){}
  });
});
afterEach(()=>{view?.unmount();if(pinia)disposePinia(pinia);vi.restoreAllMocks();vi.unstubAllGlobals();});
async function start(data:RelationsNetwork=leafNetwork()) {
  pinia=createPinia();const auth=useAuthStore(pinia);Object.assign(auth,{enabled:true,ready:true,account:{id:'admin',isAdmin:true}});
  vi.spyOn(adminApi,'relations').mockResolvedValue(data);
  vi.spyOn(adminApi,'relationStory').mockImplementation(async id=>({...content,storyId:id}));
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{template:'<div />'}},{path:'/database',name:'database',component:{template:'<div />'}}]});
  await router.push('/');await router.isReady();
  view=mount(AdminTimelines,{attachTo:document.body,global:{plugins:[pinia,router]}});await flushPromises();return auth;
}
const card=(id:string)=>view.findAllComponents(TimelineMapCard).find(item=>item.props('story').id===id)!;
const button=(text:string)=>view.findAll('button').find(item=>item.text()===text)!;

it('shows only each frise title above the existing compact preview',async()=>{
  await start();expect(adminApi.relationStory).toHaveBeenCalledTimes(3);
  expect(view.findAllComponents(StoryTimeline)).toHaveLength(3);
  const root=card('1');
  expect(root.text()).toBe('Source');
  expect(root.getComponent(StoryTimeline).props('compact')).toBe(true);
  expect(root.getComponent(StoryTimeline).props('collapsible')).toBe(false);
  expect(root.findAll('button')).toHaveLength(1);
  expect(root.find('header,footer,nav').exists()).toBe(false);
  expect(view.find('[aria-label="Objet sélectionné"]').exists()).toBe(false);
  expect(root.find('svg').exists()).toBe(false);
  expect(view.find('[data-connection-id],marker').exists()).toBe(false);
  expect(root.getComponent(StoryTimeline).props('proportional')).toBe(true);
});
it('renders the previews at their shared date positions and preserves those bounds when hiding events',async()=>{
  await start();
  vi.mocked(adminApi.relationStory).mockImplementation(async id=>({...content,storyId:id,events:[],periods:[
    period(`range${id}`,id,id==='1'?'M100':id==='2'?'M50':'M25',id==='2'?'M25':'NOW'),
  ]}));
  await button('Actualiser').trigger('click');await flushPromises();
  const position=(id:string)=>view.get(`[data-temporal-story="${id}"]`).element as HTMLElement;
  expect(position('1').style.getPropertyValue('--row-left')).toBe('0px');
  expect(position('2').style.getPropertyValue('--row-left')).toBe('2048px');expect(position('2').style.getPropertyValue('--row-width')).toBe('1024px');
  expect(position('3').style.getPropertyValue('--row-left')).toBe('3072px');expect(position('3').style.getPropertyValue('--row-width')).toBe('1024px');
  const before=position('2').getAttribute('style');
  await view.get('[role="switch"]').trigger('click');expect(position('2').getAttribute('style')).toBe(before);
});
it('moves following frises upward when hiding events shrinks a preview, and restores their positions on showing them',async()=>{
  await start();
  const position=(id:string)=>view.get(`[data-temporal-story="${id}"]`).element as HTMLElement;
  const report=async(id:string,height:number)=>{
    const element=card(id).element;
    resizeCallbacks.get(element)!([{target:element,contentRect:{height}} as ResizeObserverEntry],{} as ResizeObserver);
    await flushPromises();
  };
  await report('1',64);await report('2',64);await report('3',64);
  const originalTop=position('2').style.getPropertyValue('--row-top');
  const originalHeight=view.get('.admin-timelines__map').attributes('style');
  const originalX=position('2').style.getPropertyValue('--row-left');
  await view.get('[role="switch"]').trigger('click');
  await report('1',46);await report('2',46);await report('3',46);
  expect(position('2').style.getPropertyValue('--row-top')).toBe('54px');
  expect(position('3').style.getPropertyValue('--row-top')).toBe('108px');
  expect(position('2').style.getPropertyValue('--row-left')).toBe(originalX);
  expect(view.get('.admin-timelines__map').attributes('style')).not.toBe(originalHeight);
  await view.get('[role="switch"]').trigger('click');
  await report('1',64);await report('2',64);await report('3',64);
  expect(position('2').style.getPropertyValue('--row-top')).toBe(originalTop);
  expect(view.get('.admin-timelines__map').attributes('style')).toBe(originalHeight);
});
it('reveals a searched object inside folded branches, and a hidden event restores its marker',async()=>{
  await start();await button('Tout replier').trigger('click');expect(view.findAllComponents(TimelineMapCard)).toHaveLength(1);
  const input=view.get('[role="combobox"]');await input.setValue('Privée');await input.trigger('keydown',{key:'Enter'});await flushPromises();
  expect(view.findAllComponents(TimelineMapCard)).toHaveLength(3);
  expect(card('2').classes()).toContain('timeline-map-card--selected');
  expect(view.get('[role="status"]').text()).toContain('Privée');
  expect(view.find('[aria-label="Objet sélectionné"]').exists()).toBe(false);
  await card('2').get('.timeline-map-card__title').trigger('click');
  expect(view.findAllComponents(TimelineMapCard)).toHaveLength(3);
  await view.get('[role="switch"]').trigger('click');expect(view.find('[data-event-id="e"]').exists()).toBe(false);
  await input.setValue('Commun');await input.trigger('keydown',{key:'Enter'});await flushPromises();
  expect(view.get('[role="switch"]').attributes('aria-checked')).toBe('true');
  expect(view.get('[data-event-id="e"]').classes()).toContain('story-timeline__event-marker--selected');
});
it('keeps the mounted canvas, zoom, folds and selection when expanding; Escape unwinds search, selection then expansion',async()=>{
  const background=document.createElement('button');document.body.append(background);
  try {
    await start();const canvas=view.getComponent(TimelineMapCanvas);const instance=canvas.element;
    await canvas.get('[aria-label="Zoomer"]').trigger('click');
    const search=view.get('[role="combobox"]');await search.setValue('Privée');await search.trigger('keydown',{key:'Enter'});await flushPromises();
    const zoom=canvas.get('output').text();
    const trigger=view.get('[data-timeline-expand]');(trigger.element as HTMLElement).focus();await trigger.trigger('click');await flushPromises();
    expect(view.attributes('role')).toBe('dialog');expect(background.hasAttribute('inert')).toBe(true);
    expect(view.getComponent(TimelineMapCanvas).element).toBe(instance);expect(canvas.get('output').text()).toBe(zoom);
    const input=view.get('[role="combobox"]');await input.setValue('Commun');
    await input.trigger('keydown',{key:'Escape'});expect(view.find('[role="listbox"]').exists()).toBe(false);
    await input.trigger('keydown',{key:'Escape'});expect(view.findAll('.timeline-map-card--selected')).toHaveLength(0);
    expect(view.attributes('role')).toBe('dialog');
    await input.trigger('keydown',{key:'Escape'});await flushPromises();expect(view.attributes('role')).toBeUndefined();
    expect(view.attributes('inert')).toBeUndefined();expect(background.hasAttribute('inert')).toBe(false);expect(document.activeElement).toBe(trigger.element);
  } finally {background.remove();}
});
it('explains orphans and surfaces incomplete previews with a working retry',async()=>{
  await start();vi.mocked(adminApi.relationStory).mockRejectedValueOnce(new Error('Indisponible'));
  await button('Actualiser').trigger('click');await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('carte est incomplète');
  expect(view.findAllComponents(TimelineMapCard)).toHaveLength(3);
  expect(view.findAllComponents(StoryTimeline)).toHaveLength(2);
  await button('Réessayer').trigger('click');await flushPromises();expect(view.find('[role="alert"]').exists()).toBe(false);
  const input=view.get('[role="combobox"]');await input.setValue('Inutilisé');await input.trigger('keydown',{key:'Enter'});await flushPromises();
  expect(view.get('[role="status"]').text()).toContain('aucune frise');
});
it('purges private data and ignores pending previews when the admin identity changes',async()=>{
  const auth=await start();let resolve!:(value:RelationsContent)=>void;
  vi.mocked(adminApi.relationStory).mockImplementation(()=>new Promise(r=>{resolve=r;}));
  await button('Actualiser').trigger('click');await flushPromises();
  auth.account=null;auth.identityVersion++;await flushPromises();resolve(content);await flushPromises();
  expect(view.findComponent(TimelineMapCanvas).exists()).toBe(false);expect(view.text()).not.toContain('Privée');
});
it('caps concurrent preview requests and reports a retryable network error',async()=>{
  await start();let active=0;let peak=0;
  vi.mocked(adminApi.relationStory).mockImplementation(async id=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;return {...content,storyId:id};});
  vi.mocked(adminApi.relations).mockResolvedValue({...leafNetwork(),stories:Array.from({length:11},(_,i)=>({id:String(i),title:String(i),isPublic:false,periods:4,events:1}))});
  await button('Actualiser').trigger('click');await flushPromises();expect(peak).toBe(4);expect(view.findAllComponents(TimelineMapCard)).toHaveLength(11);
  vi.mocked(adminApi.relations).mockRejectedValueOnce(new Error('Indisponible'));
  await button('Actualiser').trigger('click');await flushPromises();expect(view.get('[role="alert"]').text()).toContain('Indisponible');
  await button('Réessayer').trigger('click');await flushPromises();expect(view.findComponent(TimelineMapCanvas).exists()).toBe(true);
});
