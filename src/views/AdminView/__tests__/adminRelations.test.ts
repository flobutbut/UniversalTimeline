import {afterEach,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import {createPinia,disposePinia,type Pinia} from 'pinia';
import {useAuthStore} from '@/stores/useAuthStore';
import {adminApi} from '@/services/AdminApiService';
import AdminRelations from '../AdminRelations.vue';
import Switch from '@/components/base/Switch.vue';
import Button from '@/components/base/Button.vue';
import {graphKey} from '../relationGraph';
import type {RelationEntity,RelationsContent,RelationsNetwork} from '@/types/adminRelations';
import {network,leafNetwork} from './networkFixture';
vi.mock('../RelationGraphCanvas.vue',()=>({default:{name:'RelationGraphCanvas',props:['graph','selected','expanded'],emits:['deselect','selectNode','toggleExpand'],template:'<div aria-label="Réseau de test"><slot name="search" /><button data-relation-expand @click="$emit(\'toggleExpand\')">{{expanded?\'Réduire le graphe\':\'Agrandir le graphe\'}}</button></div>'}}));
let pinia:Pinia;let view:ReturnType<typeof mount>;
async function start(data:RelationsNetwork=network){
  pinia=createPinia();const auth=useAuthStore(pinia);Object.assign(auth,{enabled:true,ready:true,account:{id:'admin',isAdmin:true}});
  vi.spyOn(adminApi,'relations').mockResolvedValue(data);
  if(!vi.isMockFunction(adminApi.relationStory))vi.spyOn(adminApi,'relationStory').mockResolvedValue({storyId:'1',periods:[],events:[]});
  view=mount(AdminRelations,{attachTo:document.body,global:{plugins:[pinia]}});await flushPromises();return auth;
}
afterEach(()=>{view?.unmount();if(pinia)disposePinia(pinia);vi.restoreAllMocks();});

it('expands the existing network, isolates the background and restores focus and selection on Escape',async()=>{
  const background=document.createElement('button');background.textContent='Navigation extérieure';document.body.append(background);
  try{
    await start(leafNetwork());await toggle('Frises sans enfants');
    const canvas=view.findComponent({name:'RelationGraphCanvas'});const graph=canvas.props('graph');
    canvas.vm.$emit('selectNode',graphKey('story','2'));await flushPromises();
    const trigger=view.get('[data-relation-expand]');(trigger.element as HTMLElement).focus();await trigger.trigger('click');await flushPromises();
    expect(view.attributes('role')).toBe('dialog');expect(background.hasAttribute('inert')).toBe(true);
    expect(view.get('header').isVisible()).toBe(false);expect(view.get('.admin-relations__detail').isVisible()).toBe(false);
    expect(canvas.props('graph')).toBe(graph);expect(canvas.props('selected')).toBe(graphKey('story','2'));
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flushPromises();
    expect(view.attributes('role')).toBeUndefined();expect(view.attributes('inert')).toBeUndefined();expect(background.hasAttribute('inert')).toBe(false);
    expect(view.get('header').isVisible()).toBe(true);expect(canvas.props('selected')).toBe(graphKey('story','2'));
    expect(document.activeElement).toBe(trigger.element);
  }finally{background.remove();}
});

it('keeps the expand control available for an empty filtered network and cleans up isolation on unmount',async()=>{
  const background=document.createElement('button');document.body.append(background);
  try{
    await start();await toggle('Frises');await toggle('Périodes');await toggle('Événements');
    expect(view.findComponent({name:'RelationGraphCanvas'}).props('graph').nodes).toHaveLength(0);
    await view.get('[data-relation-expand]').trigger('click');await flushPromises();
    expect(view.attributes('role')).toBe('dialog');expect(background.hasAttribute('inert')).toBe(true);
    view.unmount();expect(background.hasAttribute('inert')).toBe(false);
  }finally{background.remove();}
});
it('shows the complete network immediately and selection/deselection never changes its contents',async()=>{
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});const before=canvas.props('graph');
  expect(before.nodes).toHaveLength(6);expect(view.text()).toContain('2 frises · 2 périodes · 2 événements');
  canvas.vm.$emit('selectNode',graphKey('story','1'));await flushPromises();
  expect(canvas.props('graph')).toBe(before);expect(canvas.props('selected')).toBe(graphKey('story','1'));
  canvas.vm.$emit('deselect');await flushPromises();
  expect(canvas.props('selected')).toBeNull();expect(canvas.props('graph')).toBe(before);
  expect(view.get('.admin-relations__detail').text()).toContain('Explorer le réseau');
});

it.each([['story','1'],['period','p'],['event','unused']] as const)('offers the selected %s fiche in Frises, including unused records and expanded mode',async(kind,id)=>{
  if(kind!=='story')vi.spyOn(adminApi,'relationEntity').mockResolvedValue({kind,id,title:'Fiche',startDate:'1900',endDate:null,wikidataId:null,stories:[]});
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey(kind,id));await flushPromises();
  const link=()=>view.findAllComponents(Button).find(button=>button.text()==='Ouvrir la fiche dans Frises');
  expect(link()?.props('to')).toEqual({name:'database',query:{[kind]:id}});
  await view.get('[data-relation-expand]').trigger('click');await flushPromises();
  expect(link()?.isVisible()).toBe(true);
  canvas.vm.$emit('deselect');await flushPromises();expect(link()).toBeUndefined();
});

async function toggle(label:string){
  await view.findAllComponents(Switch).find(component=>component.props('label')===label)!.get('button').trigger('click');
  await flushPromises();
}

it('combines scope filters, clears an excluded selection, and restores the full network',async()=>{
  await start(leafNetwork());const canvas=view.findComponent({name:'RelationGraphCanvas'});const full=canvas.props('graph');
  canvas.vm.$emit('selectNode',graphKey('story','1'));await flushPromises();
  await toggle('Frises sans enfants');
  expect(canvas.props('selected')).toBeNull();expect(canvas.props('graph').nodes).toHaveLength(5);
  expect(view.text()).toContain('2 frises · 1 périodes · 2 événements');
  await toggle('Contenus partagés seulement');
  expect(canvas.props('graph').nodes).toHaveLength(4);
  expect(canvas.props('graph').nodes.some((node:{entityId:string})=>node.entityId==='e')).toBe(false);
  await toggle('Frises');
  expect(canvas.props('graph').nodes).toHaveLength(2);
  expect(canvas.props('graph').nodes.every((node:{subtitle:string})=>node.subtitle==='Dans 2 frise(s)')).toBe(true);
  await toggle('Frises');await toggle('Frises sans enfants');await toggle('Contenus partagés seulement');
  expect(canvas.props('graph')).toEqual(full);
});

it('keeps retained entity details consistent with the filtered sharing count',async()=>{
  vi.spyOn(adminApi,'relationEntity').mockResolvedValue({kind:'period',id:'p',title:'Période partagée',startDate:'1900',endDate:'2000',wikidataId:null,stories:[
    {id:'1',title:'Parent thématique',isPublic:true},{id:'2',title:'Privée',isPublic:false},{id:'3',title:'Autre finale',isPublic:true},
  ]});
  await start(leafNetwork());await toggle('Frises sans enfants');await toggle('Contenus partagés seulement');
  view.findComponent({name:'RelationGraphCanvas'}).vm.$emit('selectNode',graphKey('period','p'));await flushPromises();
  const detail=view.get('.admin-relations__detail');
  expect(detail.text()).toContain('Partagé dans 2 frises');expect(detail.text()).toContain('2 utilisations dans les frises retenues · 3 au total');
  expect(detail.text()).not.toContain('Parent thématique');expect(detail.text()).toContain('Autre finale');
});

it('does not offer hidden parent-only content from the filtered story details',async()=>{
  vi.spyOn(adminApi,'relationStory').mockResolvedValue({storyId:'2',periods:[],events:[
    {id:'e',title:'Partagé avec le parent seulement',date:'1900',wikidataId:null,importance:'normal',uses:2},
    {id:'leaf-shared',title:'Partagé entre finales',date:'1901',wikidataId:null,importance:'normal',uses:2},
  ]});
  await start(leafNetwork());await toggle('Frises sans enfants');await toggle('Contenus partagés seulement');
  view.findComponent({name:'RelationGraphCanvas'}).vm.$emit('selectNode',graphKey('story','2'));await flushPromises();
  expect(view.get('details').text()).toContain('Partagé entre finales');expect(view.get('details').text()).not.toContain('Partagé avec le parent seulement');
  expect(view.get('details').text()).toContain('Dans 2 frise(s) retenues');
});
it('a late entity response cannot replace a newer story selection',async()=>{
  let resolve!:(value:RelationEntity)=>void;vi.spyOn(adminApi,'relationEntity').mockImplementation(()=>new Promise(r=>{resolve=r;}));
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey('event','e'));await flushPromises();
  canvas.vm.$emit('selectNode',graphKey('story','1'));await flushPromises();
  resolve({kind:'event',id:'e',title:'Obsolète',startDate:'1900',endDate:null,wikidataId:null,stories:[]});await flushPromises();
  expect(view.get('.admin-relations__detail').text()).toContain('Source');expect(view.text()).not.toContain('Obsolète');
});
it('deselection cancels pending details while preserving the complete network',async()=>{
  let resolve!:(value:RelationsContent)=>void;vi.spyOn(adminApi,'relationStory').mockImplementation(()=>new Promise(r=>{resolve=r;}));
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey('story','1'));await flushPromises();canvas.vm.$emit('deselect');await flushPromises();
  resolve({storyId:'1',periods:[],events:[]});await flushPromises();
  expect(canvas.props('selected')).toBeNull();expect(canvas.props('graph').nodes).toHaveLength(6);
  expect(view.get('.admin-relations__detail').text()).toContain('Explorer le réseau');
});
it('purges privileged graph data on identity change and ignores pending reads',async()=>{
  const auth=await start();let resolve!:(value:RelationsNetwork)=>void;
  vi.mocked(adminApi.relations).mockImplementation(()=>new Promise(r=>{resolve=r;}));
  await view.findAll('button').find(b=>b.text()==='Actualiser')!.trigger('click');auth.account=null;auth.identityVersion++;await flushPromises();
  resolve(network);await flushPromises();expect(view.find('[aria-label="Réseau de test"]').exists()).toBe(false);
});
it('an overview error remains retryable instead of looking like an empty network',async()=>{
  await start();vi.mocked(adminApi.relations).mockRejectedValueOnce(new Error('Indisponible'));
  await view.findAll('button').find(b=>b.text()==='Actualiser')!.trigger('click');await flushPromises();
  expect(view.find('[role="alert"]').exists()).toBe(true);
});

it('chooses a search suggestion without rebuilding the graph and lets Escape dismiss suggestions before the expanded view',async()=>{
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});const graph=canvas.props('graph');
  const input=view.get('[role="combobox"]');(input.element as HTMLInputElement).focus();await input.setValue('Privée');
  await input.trigger('keydown',{key:'ArrowDown'});await input.trigger('keydown',{key:'Enter'});await flushPromises();
  expect(canvas.props('selected')).toBe(graphKey('story','2'));expect(canvas.props('graph')).toBe(graph);
  await view.get('[data-relation-expand]').trigger('click');await flushPromises();
  (input.element as HTMLInputElement).focus();await input.setValue('Source');
  await input.trigger('keydown',{key:'Escape'});await flushPromises();
  expect(view.attributes('role')).toBe('dialog');expect(view.find('[role="listbox"]').exists()).toBe(false);
  await input.trigger('keydown',{key:'Escape'});await flushPromises();
  expect(view.attributes('role')).toBeUndefined();expect(canvas.props('selected')).toBe(graphKey('story','2'));
});
