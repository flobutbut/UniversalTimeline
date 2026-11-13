import { uiFormat } from '@/i18n';
import type { RelationLinkKind,RelationsNetwork } from '@/types/adminRelations';
import { relationLinkLabels } from '@/types/adminRelations';

export type GraphKind='story'|'period'|'event';
export interface GraphNode {id:string;kind:GraphKind;entityId:string;title:string;subtitle:string}
export interface GraphEdge {
  id:string;source:string;target:string;kind:RelationLinkKind|'contains'|'hierarchy';label:string;
  linkIds:string[];storyIds:string[];importance?:string;
}
export interface RelationGraph {nodes:GraphNode[];edges:GraphEdge[]}
export const graphKey=(kind:GraphKind,id:string)=>JSON.stringify([kind,id]);
export const importanceLabel=(importance:string)=>({major:'Majeur',normal:'Normal',minor:'Détail'}[importance]??importance);

export interface RelationGraphFilters {leafStoriesOnly?:boolean;sharedOnly?:boolean}

/** Only historical parent/child links define children; access points and presentations are navigation. */
export function filterRelationNetwork(network:RelationsNetwork,filters:RelationGraphFilters={}):RelationsNetwork {
  if(!filters.leafStoriesOnly&&!filters.sharedOnly)return network;
  const parents=new Set(network.links.filter(link=>link.type==='legacy').map(link=>link.source));
  const stories=network.stories.filter(story=>!filters.leafStoriesOnly||!parents.has(story.id));
  const storyIds=new Set(stories.map(story=>story.id));
  const memberships=network.memberships.filter(membership=>storyIds.has(membership.storyId));
  const uses=new Map<string,Set<string>>();
  for(const membership of memberships){
    const id=graphKey(membership.kind,membership.entityId);const sources=uses.get(id)??new Set<string>();
    sources.add(membership.storyId);uses.set(id,sources);
  }
  const keep=(kind:'period'|'event',id:string)=>filters.sharedOnly?(uses.get(graphKey(kind,id))?.size??0)>=2:uses.has(graphKey(kind,id));
  return {...network,stories,
    periods:network.periods.filter(period=>keep('period',period.id)),
    events:network.events.filter(event=>keep('event',event.id)),
    memberships:memberships.filter(membership=>keep(membership.kind,membership.entityId)),
    links:network.links.filter(link=>storyIds.has(link.source)&&storyIds.has(link.target)),
  };
}

/** Complete canonical network: selection is deliberately absent from this projection. */
export function buildRelationGraph(network:RelationsNetwork,visibleKinds:GraphKind[]=['story','period','event']):RelationGraph {
  const uses=new Map<string,Set<string>>();
  for (const membership of network.memberships) {
    const key=graphKey(membership.kind,membership.entityId);const sources=uses.get(key)??new Set<string>();
    sources.add(membership.storyId);uses.set(key,sources);
  }
  const nodes:GraphNode[]=[
    ...network.stories.map(story=>({id:graphKey('story',story.id),kind:'story' as const,entityId:story.id,title:story.title,
      subtitle:uiFormat`${story.isPublic?'Publique':'Privée'} · ${story.periods} périodes · ${story.events} événements`})),
    ...(['period','event'] as const).flatMap(kind=>(kind==='period'?network.periods:network.events).map(entity=>({
      id:graphKey(kind,entity.id),kind,entityId:entity.id,title:entity.title,subtitle:uiFormat`Dans ${uses.get(graphKey(kind,entity.id))?.size??0} frise(s)`,
    }))),
  ].filter(node=>visibleKinds.includes(node.kind));
  const ids=new Set(nodes.map(node=>node.id));const edges:GraphEdge[]=[];const groups=new Map<string,GraphEdge>();
  const add=(edge:GraphEdge)=>{if(ids.has(edge.source)&&ids.has(edge.target))edges.push(edge);};
  for (const membership of network.memberships) {
    add({id:JSON.stringify(['membership',membership.storyId,membership.kind,membership.entityId]),
      source:graphKey('story',membership.storyId),target:graphKey(membership.kind,membership.entityId),kind:'contains',
      label:membership.kind==='event'?`Contient · ${importanceLabel(membership.importance??'normal')}`:'Contient cette période',
      linkIds:[],storyIds:[membership.storyId],...(membership.importance?{importance:membership.importance}:{})});
    if (membership.kind==='period'&&membership.parentId) {
      const id=JSON.stringify(['hierarchy',membership.parentId,membership.entityId]);
      const existing=groups.get(id);
      if(existing)existing.storyIds.push(membership.storyId);
      else {
        const edge:GraphEdge={id,source:graphKey('period',membership.parentId),target:graphKey('period',membership.entityId),
          kind:'hierarchy',label:'Sous-période dans la frise',linkIds:[],storyIds:[membership.storyId]};
        groups.set(id,edge);add(edge);
      }
    }
  }
  for (const link of network.links) {
    const id=JSON.stringify(['link',link.type,link.source,link.target]);const existing=groups.get(id);
    if(existing){existing.linkIds.push(link.id);existing.label=`${relationLinkLabels[link.type]} (${existing.linkIds.length})`;}
    else {
      const edge:GraphEdge={id,source:graphKey('story',link.source),target:graphKey('story',link.target),kind:link.type,
        label:relationLinkLabels[link.type],linkIds:[link.id],storyIds:[link.source,link.target]};
      groups.set(id,edge);add(edge);
    }
  }
  return {nodes,edges};
}
