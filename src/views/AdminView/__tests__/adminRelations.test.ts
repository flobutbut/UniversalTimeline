import {afterEach,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import {createPinia,disposePinia,type Pinia} from 'pinia';
import {useAuthStore} from '@/stores/useAuthStore';
import {adminApi} from '@/services/AdminApiService';
import AdminRelations from '../AdminRelations.vue';
import {graphKey} from '../relationGraph';
import type {RelationEntity,RelationsContent,RelationsNetwork} from '@/types/adminRelations';
import {network} from './networkFixture';
vi.mock('../RelationGraphCanvas.vue',()=>({default:{name:'RelationGraphCanvas',props:['graph','selected'],emits:['deselect','selectNode'],template:'<div aria-label="Réseau de test" />'}}));
let pinia:Pinia;let view:ReturnType<typeof mount>;
async function start(){
  pinia=createPinia();const auth=useAuthStore(pinia);Object.assign(auth,{enabled:true,ready:true,account:{id:'admin',isAdmin:true}});
  vi.spyOn(adminApi,'relations').mockResolvedValue(network);
  if(!vi.isMockFunction(adminApi.relationStory))vi.spyOn(adminApi,'relationStory').mockResolvedValue({storyId:'1',periods:[],events:[]});
  view=mount(AdminRelations,{global:{plugins:[pinia]}});await flushPromises();return auth;
}
afterEach(()=>{view?.unmount();if(pinia)disposePinia(pinia);vi.restoreAllMocks();});
it('shows the complete network immediately and selection/deselection never changes its contents',async()=>{
  await start();const canvas=view.findComponent({name:'RelationGraphCanvas'});const before=canvas.props('graph');
  expect(before.nodes).toHaveLength(6);expect(view.text()).toContain('2 frises · 2 périodes · 2 événements');
  canvas.vm.$emit('selectNode',graphKey('story','1'));await flushPromises();
  expect(canvas.props('graph')).toBe(before);expect(canvas.props('selected')).toBe(graphKey('story','1'));
  canvas.vm.$emit('deselect');await flushPromises();
  expect(canvas.props('selected')).toBeNull();expect(canvas.props('graph')).toBe(before);
  expect(view.get('.admin-relations__detail').text()).toContain('Explorer le réseau');
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
