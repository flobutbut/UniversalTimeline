import {expect,it} from 'vitest';
import {buildRelationGraph,graphKey} from '../relationGraph';
import {network} from './networkFixture';

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
