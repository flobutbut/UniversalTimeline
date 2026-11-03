import type {RelationsNetwork} from '@/types/adminRelations';
export const network:RelationsNetwork={generatedAt:'2026-11-03T18:00:00Z',stories:[
  {id:'1',title:'Source',isPublic:true,periods:2,events:1},{id:'2',title:'Privée',isPublic:false,periods:1,events:1},
],periods:[{id:'parent',title:'Parent'},{id:'p',title:'Période partagée'}],events:[{id:'e',title:'Commun'},{id:'unused',title:'Inutilisé'}],
memberships:[
  {storyId:'1',kind:'period',entityId:'parent',parentId:null,importance:null},
  {storyId:'1',kind:'period',entityId:'p',parentId:'parent',importance:null},
  {storyId:'2',kind:'period',entityId:'p',parentId:null,importance:null},
  {storyId:'1',kind:'event',entityId:'e',parentId:null,importance:'major'},
  {storyId:'2',kind:'event',entityId:'e',parentId:null,importance:'minor'},
],links:[
  {id:'a',type:'entry',source:'1',target:'2',anchor:{kind:'period',id:'p',title:'Période partagée'}},
  {id:'b',type:'entry',source:'1',target:'2',anchor:{kind:'event',id:'e',title:'Commun'}},
  {id:'c',type:'presentation',source:'1',target:'2',anchor:{kind:'period',id:'p',title:'Période partagée'}},
]};
