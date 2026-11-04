import { expect, it } from 'vitest';
import type { RelationsContent } from '@/types/adminRelations';
import { buildTimelineForest, storyAncestors, type TimelineBranch } from '../adminTimelineTree';
import { leafNetwork } from './networkFixture';

const flatten = (branches:TimelineBranch[]):string[] => branches.flatMap(branch=>[branch.story.id,...flatten(branch.children)]);
it('juxtaposes siblings chronologically without losing frises',()=>{
  const contents=new Map<string,RelationsContent>([
    ['2',{storyId:'2',periods:[],events:[{id:'recent',title:'Récent',date:'2000',importance:'normal',wikidataId:null,uses:1}]}],
    ['3',{storyId:'3',periods:[],events:[{id:'old',title:'Ancien',date:'M65',importance:'normal',wikidataId:null,uses:1}]}],
  ]);
  const network=leafNetwork();network.links=network.links.filter(link=>link.type==='legacy');
  const forest=buildTimelineForest(network,contents);
  expect(forest.roots.map(branch=>branch.story.id)).toEqual(['1']);
  expect(forest.roots[0].children.map(branch=>branch.story.id)).toEqual(['3','2']);
  expect(storyAncestors('3',forest.parents)).toEqual(['1']);
  expect(flatten(forest.roots).sort()).toEqual(['1','2','3']);
});
it('keeps siblings at the same parent level despite entry points and detail-view shortcuts between them',()=>{
  const forest=buildTimelineForest(leafNetwork(),new Map());
  expect(forest.parents.get('2')).toBe('1');
  expect(forest.parents.get('3')).toBe('1');
  expect(storyAncestors('3',forest.parents)).toEqual(['1']);
  expect(flatten(forest.roots).sort()).toEqual(['1','2','3']);
});
it('uses navigation as a fallback when a frise has no explicit parent',()=>{
  const network=leafNetwork();network.links=network.links.filter(link=>link.type!=='legacy');
  const forest=buildTimelineForest(network,new Map());
  expect(forest.parents.get('2')).toBe('1');expect(forest.parents.get('3')).toBe('2');
});
it('bounds historical cycles, self-links and missing parents without losing a frise',()=>{
  const network=leafNetwork();
  network.links=[
    {id:'1',type:'legacy',source:'1',target:'2',anchor:null},
    {id:'2',type:'legacy',source:'2',target:'1',anchor:null},
    {id:'3',type:'legacy',source:'3',target:'3',anchor:null},
    {id:'4',type:'legacy',source:'missing',target:'3',anchor:null},
  ];
  const forest=buildTimelineForest(network,new Map());
  expect(flatten(forest.roots).sort()).toEqual(['1','2','3']);
  expect(forest.parents.size).toBe(1);
  expect(storyAncestors('1',new Map([['1','2'],['2','1']]))).toEqual(['2']);
});
