import {afterEach,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import {createMemoryHistory,createRouter} from 'vue-router';
import {createPinia,disposePinia,type Pinia} from 'pinia';
import {useAuthStore} from '@/stores/useAuthStore';
import {adminApi} from '@/services/AdminApiService';
import AdminRelations from '../AdminRelations.vue';
import Switch from '@/components/base/Switch.vue';
import Button from '@/components/base/Button.vue';
import {graphKey} from '../relationGraph';
import type {RelationsNetwork} from '@/types/adminRelations';
import {network,leafNetwork} from './networkFixture';
vi.mock('../RelationGraphCanvas.vue',()=>({default:{name:'RelationGraphCanvas',props:['graph','selected','expanded'],emits:['deselect','selectNode','selectEdge','toggleExpand'],template:'<div aria-label="Réseau de test"><slot name="search" /><slot v-if="selected" name="selection" :close="()=> $emit(\'deselect\')" /><button data-relation-expand @click="$emit(\'toggleExpand\')">{{expanded?\'Réduire le graphe\':\'Agrandir le graphe\'}}</button></div>'}}));
let pinia:Pinia;let view:ReturnType<typeof mount>;
async function start(data:RelationsNetwork=network){
  pinia=createPinia();const auth=useAuthStore(pinia);Object.assign(auth,{enabled:true,ready:true,account:{id:'admin',isAdmin:true}});
  vi.spyOn(adminApi,'relations').mockResolvedValue(data);
  if(!vi.isMockFunction(adminApi.relationStory))vi.spyOn(adminApi,'relationStory').mockResolvedValue({storyId:'1',periods:[],events:[]});
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{template:'<div />'}},{path:'/database',name:'database',component:{template:'<div />'}}]});await router.push('/');await router.isReady();
  view=mount(AdminRelations,{attachTo:document.body,global:{plugins:[pinia,router]}});await flushPromises();return auth;
}
afterEach(()=>{view?.unmount();if(pinia)disposePinia(pinia);vi.restoreAllMocks();});

it('expands the existing network, isolates the background and restores focus and selection on reduction',async()=>{
  const background=document.createElement('button');background.textContent='Navigation extérieure';document.body.append(background);
  try{
    await start(leafNetwork());await toggle('Frises sans enfants');
    const canvas=view.findComponent({name:'RelationGraphCanvas'});const graph=canvas.props('graph');
    canvas.vm.$emit('selectNode',graphKey('story','2'));await flushPromises();
    const trigger=view.get('[data-relation-expand]');(trigger.element as HTMLElement).focus();await trigger.trigger('click');await flushPromises();
    expect(view.attributes('role')).toBe('dialog');expect(background.hasAttribute('inert')).toBe(true);
    expect(view.get('header').isVisible()).toBe(false);expect(view.find('.admin-relations__detail').exists()).toBe(false);
    expect(canvas.props('graph')).toBe(graph);expect(canvas.props('selected')).toBe(graphKey('story','2'));
    await trigger.trigger('click');await flushPromises();
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
  expect(view.find('[aria-label="Objet sélectionné"]').exists()).toBe(false);
});

it.each([['story','1'],['period','p'],['event','e']] as const)('opens the selected %s fiche from the popover in normal and expanded mode',async(kind,id)=>{
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey(kind,id));await flushPromises();
  const link=()=>view.findAllComponents(Button).find(button=>button.text()==='Ouvrir');
  expect(link()?.props('to')).toEqual({name:'database',query:{[kind]:id}});expect(link()?.get('a').attributes('href')).toBe(`/database?${kind}=${id}`);
  expect(view.find('.admin-relations__toolbar').exists()).toBe(false);expect(view.find('.admin-relations__detail').exists()).toBe(false);
  await view.get('[data-relation-expand]').trigger('click');await flushPromises();expect(link()?.isVisible()).toBe(true);
  canvas.vm.$emit('deselect');await flushPromises();expect(link()).toBeUndefined();
});

it.each(['period','event'] as const)('disables opening an orphan %s and explains why',async kind=>{
  const data={...network,periods:[...network.periods,{id:'unused',title:'Période orpheline'}]};
  await start(data);const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey(kind,'unused'));await flushPromises();
  const open=view.findAllComponents(Button).find(button=>button.text()==='Ouvrir')!;
  expect(open.props('disabled')).toBe(true);expect(open.get('button').attributes('disabled')).toBeDefined();expect(open.find('a').exists()).toBe(false);
  expect(view.get('[aria-label="Objet sélectionné"]').text()).toContain('Objet orphelin · aucune frise parente');
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

it('lists distinct parent frises and their period contexts, even when frise nodes are hidden',async()=>{
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});
  canvas.vm.$emit('selectNode',graphKey('period','p'));await flushPromises();
  const popup=()=>view.get('[aria-label="Objet sélectionné"]');
  expect(popup().text()).toContain('Frises parentes');expect(popup().text()).toContain('Sous Parent');
  expect(popup().findAll('li').map(item=>item.text())).toEqual(['SourceSous Parent','Privée']);
  expect(popup().findAll('li a').map(link=>link.attributes('href'))).toEqual(['/database?story=1','/database?story=2']);
  await toggle('Frises');expect(popup().findAll('li')).toHaveLength(2);
  expect(popup().get('.relation-selection__actions a').attributes('href')).toBe('/database?period=p');
});

it('limits the parents to retained frises when filtering thematic parents',async()=>{
  await start(leafNetwork());await toggle('Frises sans enfants');await toggle('Contenus partagés seulement');
  view.findComponent({name:'RelationGraphCanvas'}).vm.$emit('selectNode',graphKey('period','p'));await flushPromises();
  const popup=view.get('[aria-label="Objet sélectionné"]');
  expect(popup.findAll('li').map(item=>item.text())).toEqual(['Privée','Autre finale']);
});

it('keeps selection local without fetching details and closes the popover with its close button',async()=>{
  const readEntity=vi.spyOn(adminApi,'relationEntity');await start();
  const canvas=view.findComponent({name:'RelationGraphCanvas'});const graph=canvas.props('graph');
  for(const id of [graphKey('event','e'),graphKey('story','1')]){canvas.vm.$emit('selectNode',id);await flushPromises();}
  expect(readEntity).not.toHaveBeenCalled();expect(adminApi.relationStory).not.toHaveBeenCalled();
  await view.get('[aria-label="Fermer la sélection"]').trigger('click');
  expect(canvas.props('selected')).toBeNull();expect(canvas.props('graph')).toBe(graph);
});

it('lists historical parents of a frise without treating navigation links as parents',async()=>{
  await start(leafNetwork());view.findComponent({name:'RelationGraphCanvas'}).vm.$emit('selectNode',graphKey('story','3'));await flushPromises();
  expect(view.get('[aria-label="Objet sélectionné"]').findAll('li').map(item=>item.text())).toEqual(['Source']);
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
  expect(view.attributes('role')).toBe('dialog');expect(canvas.props('selected')).toBeNull();
  await input.trigger('keydown',{key:'Escape'});await flushPromises();expect(view.attributes('role')).toBeUndefined();
});
