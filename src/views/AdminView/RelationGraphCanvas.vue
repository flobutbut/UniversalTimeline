<template>
  <div class="relation-canvas" :class="{'relation-canvas--expanded':expanded}">
    <div class="relation-canvas__tools">
      <Button variant="tertiary" size="sm" aria-label="Zoom avant" icon-only @click="scale(1.3)"><template #icon><Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" /></template></Button>
      <Button variant="tertiary" size="sm" aria-label="Zoom arrière" icon-only @click="scale(1/1.3)"><template #icon><Icon icon="mdi:minus" width="18" height="18" aria-hidden="true" /></template></Button>
      <Button variant="tertiary" size="sm" @click="fit">Tout cadrer</Button>
      <Button variant="tertiary" size="sm" :pressed="paused" @click="toggleAnimation">{{ paused?'Reprendre':'Pause' }}</Button>
      <Button variant="ghost" size="sm" @click="restart">Relancer les forces</Button>
      <Button class="relation-canvas__expand" data-relation-expand variant="tertiary" size="sm" icon-only :pressed="!!expanded" :aria-label="expanded?'Réduire le graphe':'Agrandir le graphe'" :title="expanded?'Réduire le graphe (Échap)':'Agrandir le graphe'" @click="$emit('toggleExpand')"><template #icon><Icon :icon="expanded?'mdi:arrow-collapse':'mdi:arrow-expand'" width="18" height="18" aria-hidden="true" /></template></Button>
    </div>
    <div ref="host" class="relation-canvas__plot">
      <svg v-show="graph.nodes.length" ref="svg" tabindex="0" role="img" :aria-label="`Réseau D3 : ${graph.nodes.length} objets, ${graph.edges.length} liens. Déplacez les cercles ; clic dans le vide pour désélectionner. ${expanded?'Échap pour réduire le graphe.':'Échap pour désélectionner.'}`" @keydown.esc.prevent="handleEscape">
        <defs><marker :id="markerId" viewBox="0 -5 10 10" refX="13" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,-5L10,0L0,5" fill="var(--color-border-strong)" /></marker></defs>
        <g ref="scene"><g ref="linkLayer" /><g ref="nodeLayer" /></g>
      </svg>
      <div v-if="!graph.nodes.length" class="relation-canvas__empty"><slot name="empty" /></div>
    </div>
    <div class="relation-canvas__legend">
      <span><i class="relation-canvas__mark--story" />Frises</span><span><i class="relation-canvas__mark--period" />Périodes</span><span><i class="relation-canvas__mark--event" />Événements</span>
      <span>Survol pour le titre · glisser pour déplacer · clic dans le vide pour désélectionner</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted,onBeforeUnmount,ref,useId,watch } from 'vue';
import { select,forceSimulation,forceLink,forceManyBody,forceCenter,forceCollide,forceX,forceY,zoom,zoomIdentity,drag,
  type Simulation,type SimulationNodeDatum,type SimulationLinkDatum,type Selection,type ZoomBehavior } from 'd3';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import type { RelationGraph,GraphNode,GraphEdge } from './relationGraph';

interface NetworkNode extends GraphNode,SimulationNodeDatum {}
interface NetworkLink extends Omit<GraphEdge,'source'|'target'>,SimulationLinkDatum<NetworkNode> {}
const props=defineProps<{graph:RelationGraph;selected:string|null;expanded?:boolean}>();
const emit=defineEmits<{selectNode:[id:string];selectEdge:[id:string];deselect:[];toggleExpand:[]}>();
const host=ref<HTMLElement>();const svg=ref<SVGSVGElement>();const scene=ref<SVGGElement>();const linkLayer=ref<SVGGElement>();const nodeLayer=ref<SVGGElement>();
const markerId=`network-arrow-${useId()}`;const allLabels=defineModel<boolean>('allLabels',{default:false});const paused=ref(false);
let simulation:Simulation<NetworkNode,NetworkLink>|undefined;let resize:ResizeObserver|undefined;
let nodes:NetworkNode[]=[];let links:NetworkLink[]=[];let width=800;let height=560;let zoomLevel=1;let interacted=false;
let zoomer:ZoomBehavior<SVGSVGElement,unknown>;
let circles:Selection<SVGGElement,NetworkNode,SVGGElement,unknown>;
let paths:Selection<SVGPathElement,NetworkLink,SVGGElement,unknown>;
const radius=(node:NetworkNode)=>node.kind==='story'?13:node.kind==='period'?7:4.5;
const color=(node:NetworkNode)=>`var(--color-data-${node.kind==='story'?'frise':node.kind})`;
const endpoint=(value:string|number|NetworkNode)=>value as NetworkNode;

function paint(){
  circles?.attr('transform',node=>`translate(${node.x??0},${node.y??0})`);
  paths?.attr('d',link=>{const a=endpoint(link.source);const b=endpoint(link.target);return `M${a.x??0},${a.y??0}L${b.x??0},${b.y??0}`;});
}
function highlight(){
  if(!circles)return;
  const neighborhood=new Set<string>();const selected=props.selected;
  if(selected){neighborhood.add(selected);for(const link of links){const a=endpoint(link.source).id;const b=endpoint(link.target).id;
    if(a===selected||b===selected||link.id===selected){neighborhood.add(a);neighborhood.add(b);neighborhood.add(link.id);}}}
  circles.attr('opacity',node=>!selected||neighborhood.has(node.id)?1:0.13);
  circles.select('circle').attr('stroke',node=>node.id===selected?'var(--color-border-focus)':color(node)).attr('stroke-width',node=>node.id===selected?3:1);
  circles.select('text').attr('display',node=>allLabels.value||node.kind==='story'||zoomLevel>1.4||neighborhood.has(node.id)?null:'none');
  paths.attr('stroke-opacity',link=>!selected?link.kind==='contains'?0.22:0.4:neighborhood.has(link.id)?0.9:0.07)
    .attr('stroke-width',link=>link.id===selected?3:1);
}
function fit(){
  if(!nodes.length||!svg.value||!zoomer)return;
  const xs=nodes.map(node=>node.x??0);const ys=nodes.map(node=>node.y??0);
  const x0=Math.min(...xs)-65;const x1=Math.max(...xs)+65;const y0=Math.min(...ys)-45;const y1=Math.max(...ys)+45;
  const k=Math.max(0.08,Math.min(1.8,width/(x1-x0),height/(y1-y0))*.9);
  select(svg.value).call(zoomer.transform,zoomIdentity.translate(width/2-k*(x0+x1)/2,height/2-k*(y0+y1)/2).scale(k));
}
function scale(factor:number){if(svg.value)select(svg.value).call(zoomer.scaleBy,factor);interacted=true;}
function toggleAnimation(){paused.value=!paused.value;if(paused.value)simulation?.stop();else simulation?.alpha(.35).restart();}
function restart(){paused.value=false;simulation?.alpha(.9).alphaTarget(0).restart();}
function handleEscape(){if(props.expanded)emit('toggleExpand');else emit('deselect');}

function draw(){
  if(!nodeLayer.value||!linkLayer.value)return;
  simulation?.stop();const previous=new Map(nodes.map(node=>[node.id,node]));
  // D3 mutates its simulation data; transport data and the projection remain untouched.
  nodes=props.graph.nodes.map(node=>({...node,...(previous.has(node.id)?{x:previous.get(node.id)!.x,y:previous.get(node.id)!.y}:{} )}));
  links=props.graph.edges.map(link=>({...link}));
  paths=select(linkLayer.value).selectAll<SVGPathElement,NetworkLink>('path').data(links,link=>link.id).join('path')
    .attr('data-edge-id',link=>link.id).attr('fill','none').attr('stroke','var(--color-border-strong)')
    .attr('stroke-dasharray',link=>link.kind==='legacy'?'2 4':link.kind==='presentation'?'6 4':null)
    .attr('marker-end',link=>link.kind==='contains'?null:`url(#${markerId})`).attr('cursor','pointer')
    .on('click',(event,link)=>{event.stopPropagation();emit('selectEdge',link.id);});
  paths.selectAll('title').data(link=>[link]).join('title').text(link=>link.label);
  circles=select(nodeLayer.value).selectAll<SVGGElement,NetworkNode>('g').data(nodes,node=>node.id).join(enter=>{
    const group=enter.append('g');group.append('circle');group.append('text');group.append('title');return group;
  }).attr('data-node-id',node=>node.id).attr('data-kind',node=>node.kind).attr('cursor','grab')
    .on('click',(event,node)=>{event.stopPropagation();if(!event.defaultPrevented)emit('selectNode',node.id);});
  circles.select('circle').attr('r',radius).attr('fill',color).attr('fill-opacity',.65).attr('stroke',color);
  circles.select('text').text(node=>node.title.length>36?`${node.title.slice(0,35)}…`:node.title)
    .attr('x',node=>radius(node)+5).attr('y',3).attr('fill','var(--color-text-primary)')
    .attr('font-size','var(--font-size-sm)').attr('font-family','var(--font-family-base)').attr('pointer-events','none');
  circles.select('title').text(node=>`${node.title}\n${node.subtitle}`);
  circles.call(drag<SVGGElement,NetworkNode>().clickDistance(4)
    .on('start',(event,node)=>{interacted=true;if(!event.active&&!paused.value)simulation?.alphaTarget(.15).restart();node.fx=node.x;node.fy=node.y;})
    .on('drag',(event,node)=>{node.fx=event.x;node.fy=event.y;node.x=event.x;node.y=event.y;paint();})
    .on('end',(event,node)=>{if(!event.active)simulation?.alphaTarget(0);node.fx=null;node.fy=null;}));
  simulation=forceSimulation<NetworkNode>(nodes)
    .force('link',forceLink<NetworkNode,NetworkLink>(links).id(node=>node.id).distance(link=>link.kind==='contains'?65:90).strength(.15))
    .force('charge',forceManyBody<NetworkNode>().strength(node=>node.kind==='story'?-210:-55))
    .force('collide',forceCollide<NetworkNode>().radius(node=>radius(node)+7).iterations(2))
    .force('center',forceCenter(0,0)).force('x',forceX(0).strength(.012)).force('y',forceY(0).strength(.012))
    .alphaDecay(.018).alphaMin(.008).on('tick',paint).on('end',()=>{if(!interacted)fit();});
  simulation.stop().tick(45);paint();fit();highlight();if(!paused.value)simulation.restart();
}
onMounted(()=>{
  paused.value=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  zoomer=zoom<SVGSVGElement,unknown>().extent(()=>[[0,0],[width,height]]).scaleExtent([.08,5])
    .on('start',event=>{if(event.sourceEvent)interacted=true;})
    .on('zoom',event=>{select(scene.value!).attr('transform',event.transform.toString());zoomLevel=event.transform.k;highlight();});
  select(svg.value!).call(zoomer).on('dblclick.zoom',null).on('click',event=>{if(event.target===svg.value)emit('deselect');});
  width=host.value!.clientWidth||800;height=host.value!.clientHeight||560;select(svg.value!).attr('viewBox',`0 0 ${width} ${height}`);
  resize=new ResizeObserver(()=>{width=host.value!.clientWidth||800;height=host.value!.clientHeight||560;select(svg.value!).attr('viewBox',`0 0 ${width} ${height}`);fit();});
  resize.observe(host.value!);draw();
});
watch(()=>props.graph,draw);watch(()=>props.selected,highlight);watch(allLabels,highlight);
onBeforeUnmount(()=>{simulation?.stop();resize?.disconnect();if(svg.value)select(svg.value).on('.zoom',null);});
</script>

<style scoped>
.relation-canvas { min-width:0; background:var(--color-surface-default); border:1px solid var(--color-border-default); border-radius:var(--radius-lg); overflow:hidden; }
.relation-canvas__tools { display:flex; flex-wrap:wrap; align-items:center; gap:var(--spacing-sm); padding:var(--spacing-sm); border-bottom:1px solid var(--color-border-default); }
.relation-canvas__plot { position:relative; height:clamp(360px,calc(100dvh - 370px),820px); min-width:0; }
.relation-canvas__expand {margin-inline-start:auto;}
.relation-canvas__empty {position:absolute;inset:0;display:grid;place-items:center;padding:var(--spacing-md);box-sizing:border-box;}
.relation-canvas--expanded {display:flex;flex-direction:column;flex:1;min-height:160px;}
.relation-canvas--expanded .relation-canvas__plot {flex:1;min-height:0;height:auto;}
.relation-canvas--expanded .relation-canvas__tools,.relation-canvas--expanded .relation-canvas__legend {flex-shrink:0;}
.relation-canvas__plot svg { width:100%; height:100%; display:block; touch-action:none; }
.relation-canvas__plot svg:focus-visible { outline:2px solid var(--color-border-focus); outline-offset:-2px; }
.relation-canvas__legend { display:flex; flex-wrap:wrap; gap:var(--spacing-md); padding:var(--spacing-md); border-top:1px solid var(--color-border-default); color:var(--color-text-secondary); font:var(--type-meta); }
.relation-canvas__legend span { display:inline-flex; align-items:center; gap:var(--spacing-xs); }
.relation-canvas__legend i { width:var(--spacing-sm); height:var(--spacing-sm); border-radius:var(--radius-pill); }
.relation-canvas__mark--story { background:var(--color-data-frise); }
.relation-canvas__mark--period { background:var(--color-data-period); }
.relation-canvas__mark--event { background:var(--color-data-event); }
</style>
