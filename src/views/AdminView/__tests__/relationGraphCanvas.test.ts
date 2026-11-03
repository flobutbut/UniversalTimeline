import {afterEach,expect,it,vi} from 'vitest';
import {mount} from '@vue/test-utils';
import RelationGraphCanvas from '../RelationGraphCanvas.vue';
import {buildRelationGraph,graphKey} from '../relationGraph';
import {network} from './networkFixture';
let view:ReturnType<typeof mount>;
afterEach(()=>{view?.unmount();vi.unstubAllGlobals();});
function start(){
  vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true}));
  const graph=buildRelationGraph(network);graph.nodes.forEach(Object.freeze);graph.edges.forEach(Object.freeze);
  view=mount(RelationGraphCanvas,{props:{graph,selected:null}});return graph;
}
it('renders all objects using D3 without mutating the projection and distinguishes object clicks from blank clicks',async()=>{
  start();expect(view.findAll('[data-node-id]')).toHaveLength(6);
  await view.get('[data-kind="event"] circle').trigger('click');
  expect(view.emitted('selectNode')?.[0]).toEqual([graphKey('event','e')]);expect(view.emitted('deselect')).toBeUndefined();
  await view.get('.relation-canvas__plot > svg').trigger('click');expect(view.emitted('deselect')).toHaveLength(1);
  await view.get('.relation-canvas__plot > svg').trigger('keydown',{key:'Escape'});expect(view.emitted('deselect')).toHaveLength(2);
});
it('selection highlights neighbours without rebuilding or moving simulation nodes',async()=>{
  start();const positions=view.findAll('[data-node-id]').map(n=>n.attributes('transform'));
  await view.setProps({selected:graphKey('event','e')});
  expect(view.findAll('[data-node-id]')).toHaveLength(6);
  expect(view.findAll('[data-node-id]').map(n=>n.attributes('transform'))).toEqual(positions);
  expect(view.get('[data-node-id=\'["event","unused"]\']').attributes('opacity')).toBe('0.13');
});

it('dismisses a selection before reducing the expanded graph with Escape',async()=>{
  start();await view.setProps({expanded:true,selected:graphKey('event','e')});
  await view.get('.relation-canvas__plot > svg').trigger('keydown',{key:'Escape'});
  expect(view.emitted('deselect')).toHaveLength(1);expect(view.emitted('toggleExpand')).toBeUndefined();
  await view.setProps({selected:null});await view.get('.relation-canvas__plot > svg').trigger('keydown',{key:'Escape'});expect(view.emitted('toggleExpand')).toHaveLength(1);
});

it('anchors the selection overlay to the object, follows zoom, and cleans it up on deselection',async()=>{
  vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true}));
  view=mount(RelationGraphCanvas,{attachTo:document.body,props:{graph:buildRelationGraph(network),selected:graphKey('period','p')},slots:{selection:'<a href="/database?period=p">Ouvrir</a>'}});
  const panel=view.get('.relation-canvas__selection');
  expect(panel.attributes('style')).toContain('visible');const before=panel.attributes('style');
  const positions=view.findAll('[data-node-id]').map(node=>node.attributes('transform'));
  await view.get('[aria-label="Zoom avant"]').trigger('click');
  expect(panel.attributes('style')).not.toBe(before);expect(view.findAll('[data-node-id]').map(node=>node.attributes('transform'))).toEqual(positions);
  await panel.get('a').trigger('keydown',{key:'Escape'});expect(view.emitted('deselect')).toHaveLength(1);expect(document.activeElement).toBe(view.get('.relation-canvas__plot > svg').element);
  await view.setProps({selected:null});expect(view.find('.relation-canvas__selection').exists()).toBe(false);
});
