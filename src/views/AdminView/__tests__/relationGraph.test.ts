import {expect,it} from 'vitest';
import {buildRelationGraph,filterRelationNetwork,graphKey} from '../relationGraph';
import {network,leafNetwork} from './networkFixture';

it('includes every frise, period and event on first render, even unused objects',()=>{
  const graph=buildRelationGraph(network);
  expect(graph.nodes.map(n=>n.kind)).toEqual(['story','story','period','period','event','event']);
  expect(graph.nodes.find(n=>n.entityId==='unused')?.subtitle).toBe('Dans 0 frise(s)');
  expect(graph.edges.filter(e=>e.kind==='contains')).toHaveLength(5);
});
it('represents one shared fiche once and retains all private/public memberships and local importance',()=>{
  const graph=buildRelationGraph(network);
  expect(graph.nodes.filter(n=>n.id===graphKey('event','e'))).toHaveLength(1);
  expect(graph.edges.filter(e=>e.target===graphKey('event','e')).map(e=>[e.storyIds,e.importance])).toEqual([[['1'],'major'],[['2'],'minor']]);
  expect(graph.nodes.filter(n=>n.entityId==='p')).toHaveLength(1);
});
it('keeps local period hierarchy contextual, and never infers event-period edges',()=>{
  const graph=buildRelationGraph(network);
  expect(graph.edges.find(e=>e.kind==='hierarchy')).toMatchObject({source:graphKey('period','parent'),target:graphKey('period','p'),storyIds:['1']});
  expect(graph.edges.filter(e=>e.target===graphKey('event','e')).every(e=>e.source.startsWith('["story"'))).toBe(true);
});
it('groups parallel explicit links without losing their anchors or mixing relation types',()=>{
  const graph=buildRelationGraph(network);
  expect(graph.edges.find(e=>e.kind==='entry')?.linkIds).toEqual(['a','b']);
  expect(graph.edges.find(e=>e.kind==='presentation')?.linkIds).toEqual(['c']);
});
it('only explicit type filters remove nodes and never leave dangling edges',()=>{
  const graph=buildRelationGraph(network,['period','event']);const ids=new Set(graph.nodes.map(n=>n.id));
  expect(graph.nodes).toHaveLength(4);expect(graph.edges).toHaveLength(1);
  expect(graph.edges.every(e=>ids.has(e.source)&&ids.has(e.target))).toBe(true);
});

it('retains final frises and their contents without treating navigation links as children',()=>{
  const input=leafNetwork();const filtered=filterRelationNetwork(input,{leafStoriesOnly:true});
  expect(filtered.stories.map(s=>s.id)).toEqual(['2','3']);
  expect(filtered.periods.map(p=>p.id)).toEqual(['p']);
  expect(filtered.events.map(e=>e.id)).toEqual(['e','leaf-shared']);
  expect(filtered.links.map(l=>l.id)).toEqual(['cross-entry','cross-view']);
  expect(filtered.memberships.every(m=>m.storyId!=='1')).toBe(true);
  expect(input.stories).toHaveLength(3);expect(input.memberships).toHaveLength(8);
});

it('recalculates shared contents between retained final frises, excluding parent-child-only reuse',()=>{
  const filtered=filterRelationNetwork(leafNetwork(),{leafStoriesOnly:true,sharedOnly:true});
  expect(filtered.periods.map(p=>p.id)).toEqual(['p']);expect(filtered.events.map(e=>e.id)).toEqual(['leaf-shared']);
  const graph=buildRelationGraph(filtered);
  expect(graph.nodes).toHaveLength(4);
  expect(graph.nodes.find(n=>n.id===graphKey('period','p'))?.subtitle).toBe('Dans 2 frise(s)');
  expect(graph.edges.filter(e=>e.kind==='contains')).toHaveLength(4);
  const ids=new Set(graph.nodes.map(n=>n.id));expect(graph.edges.every(e=>ids.has(e.source)&&ids.has(e.target))).toBe(true);
});

it('supports shared-only independently and counts distinct frises rather than duplicate memberships',()=>{
  const filtered=filterRelationNetwork(leafNetwork(),{sharedOnly:true});
  expect(filtered.stories).toHaveLength(3);expect(filtered.events.map(e=>e.id)).toEqual(['e','leaf-shared']);
  const duplicate={...network,memberships:[network.memberships[0],network.memberships[0]]};
  expect(filterRelationNetwork(duplicate,{sharedOnly:true}).periods).toHaveLength(0);
});

it('does not retain hierarchy from a removed parent even when both catalogue periods remain shared',()=>{
  const input=leafNetwork();input.memberships.push(
    {storyId:'2',kind:'period',entityId:'parent',parentId:null,importance:null},
    {storyId:'3',kind:'period',entityId:'parent',parentId:null,importance:null},
  );
  const graph=buildRelationGraph(filterRelationNetwork(input,{leafStoriesOnly:true,sharedOnly:true}));
  expect(graph.nodes.filter(n=>n.kind==='period')).toHaveLength(2);
  expect(graph.edges.some(e=>e.kind==='hierarchy')).toBe(false);
});

it('preserves the complete network by default and handles no shared contents or no final frises',()=>{
  expect(filterRelationNetwork(network)).toBe(network);
  const noShared=filterRelationNetwork({...network,memberships:network.memberships.filter(m=>m.storyId==='1')},{leafStoriesOnly:true,sharedOnly:true});
  expect(noShared.stories).toHaveLength(2);expect(noShared.events).toEqual([]);expect(noShared.periods).toEqual([]);expect(noShared.memberships).toEqual([]);
  const cyclic={...network,links:[
    {id:'a',type:'legacy' as const,source:'1',target:'2',anchor:null},
    {id:'b',type:'legacy' as const,source:'2',target:'1',anchor:null},
  ]};
  expect(buildRelationGraph(filterRelationNetwork(cyclic,{leafStoriesOnly:true}))).toEqual({nodes:[],edges:[]});
});
