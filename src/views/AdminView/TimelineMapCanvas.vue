<template>
  <div class="timeline-map-canvas" :class="{'timeline-map-canvas--expanded':expanded,'timeline-map-canvas--temporal':temporal}">
    <div class="timeline-map-canvas__toolbar" role="group" :aria-label="uiText('Commandes de la carte')">
      <Button variant="tertiary" size="sm" icon-only :aria-label="uiText('Dézoomer')" :disabled="zoomLevel<=MIN_ZOOM" @click="scale(1/1.3)"><template #icon><Icon icon="mdi:minus" width="18" height="18" aria-hidden="true" /></template></Button>
      <output class="timeline-map-canvas__zoom" :aria-label="uiText('Niveau de zoom')">{{ uiText(zoomLabel) }}</output>
      <Button variant="tertiary" size="sm" icon-only :aria-label="uiText('Zoomer')" :disabled="zoomLevel>=MAX_ZOOM" @click="scale(1.3)"><template #icon><Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" /></template></Button>
      <Button variant="tertiary" size="sm" @click="fit">{{ uiText("Tout voir") }}</Button>
      <slot name="tools" />
      <Button class="timeline-map-canvas__expand" variant="tertiary" size="sm" icon-only data-timeline-expand :aria-label="uiText(expanded?'Réduire la carte':'Agrandir la carte')" :title="uiText(expanded?'Réduire la carte':'Agrandir la carte')" @click="emit('toggleExpand')"><template #icon><Icon :icon="expanded?'mdi:fullscreen-exit':'mdi:fullscreen'" width="18" height="18" aria-hidden="true" /></template></Button>
    </div>
    <div class="timeline-map-canvas__plot">
      <div class="timeline-map-canvas__search"><slot name="search" /></div>
      <div ref="viewport" class="timeline-map-canvas__viewport" tabindex="0" role="region" :aria-label="uiText('Canevas de toutes les frises')" :aria-describedby="helpId" @keydown="onKeydown">
        <div ref="scene" class="timeline-map-canvas__scene" @focusin="revealFocus"><slot /></div>
      </div>
    </div>
    <p :id="helpId" class="sr-only">{{ uiText("Molette ou pincement pour zoomer. Glisser le fond ou utiliser les flèches pour se déplacer. + et − pour zoomer. Début pour tout voir.") }}</p>
  </div>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Icon } from '@iconify/vue';
import { select, zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3';
import Button from '@/components/base/Button.vue';
import type { TemporalViewport } from './temporalTimelineMap';

const props=defineProps<{ expanded:boolean; temporal?:boolean }>();
const emit = defineEmits<{ toggleExpand:[]; viewChange:[view:TemporalViewport] }>();
const MIN_ZOOM=.01;
const MAX_ZOOM=props.temporal?1e9:3;
const zoomLevel=ref(1);
const zoomLabel=computed(()=>zoomLevel.value<10?`${Math.round(zoomLevel.value*100)} %`
  :zoomLevel.value>=1e6?`${(zoomLevel.value/1e6).toFixed(1)}M×`
    :zoomLevel.value>=1e3?`${(zoomLevel.value/1e3).toFixed(1)}k×`:`${Math.round(zoomLevel.value)}×`);
const helpId=useId();
const viewport=ref<HTMLElement>();
const scene=ref<HTMLElement>();
let zoomer:ZoomBehavior<HTMLElement,unknown>;
let observer:ResizeObserver | undefined;
let automaticFit=true;
let width=0;
let height=0;
let placing=false;
let renderedY=0;
const dimensions=()=>({width:viewport.value?.clientWidth || 800,height:viewport.value?.clientHeight || 560});

function place(transform:ZoomTransform) {
  if (!viewport.value) return;
  placing=true;
  select(viewport.value).call(zoomer.transform,transform);
  placing=false;
}
function fit() {
  if (!viewport.value || !scene.value || !zoomer) return;
  automaticFit=true;
  const size=dimensions();
  const w=scene.value.offsetWidth || 560;
  const h=scene.value.offsetHeight || 300;
  const k=Math.max(MIN_ZOOM,Math.min(1,(size.width-48)/w,props.temporal?1:(size.height-112)/h));
  place(zoomIdentity.translate((size.width-w*k)/2,80+Math.max(0,(size.height-112-h*(props.temporal?1:k))/2)).scale(k));
}
function preserveView() {automaticFit=false;}
function scale(factor:number) {
  if (!viewport.value || !zoomer) return;
  automaticFit=false;
  const size=dimensions();
  select(viewport.value).call(zoomer.scaleBy,factor,[size.width/2,size.height/2]);
}
function frame(element:HTMLElement) {
  if (!viewport.value || !scene.value || !zoomer) return;
  automaticFit=false;
  const host=viewport.value.getBoundingClientRect();
  const rect=element.getBoundingClientRect();
  const current=zoomTransform(viewport.value);
  const position=props.temporal?element.closest<HTMLElement>('[data-temporal-story]'):null;
  const x=position?parseFloat(position.style.getPropertyValue('--row-left')):(rect.left-host.left-current.x)/current.k;
  const y=position?parseFloat(position.style.getPropertyValue('--row-top')):(rect.top-host.top-current.y)/(props.temporal?1:current.k);
  const w=position?parseFloat(position.style.getPropertyValue('--row-width')):rect.width/current.k;
  const h=rect.height/(props.temporal?1:current.k) || 300;
  const size=dimensions();
  const k=props.temporal?Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,w>0?(size.width-48)/w:current.k))
    :Math.max(MIN_ZOOM,Math.min(1,(size.width-48)/(w||560),(size.height-112)/h));
  place(zoomIdentity.translate((size.width-w*k)/2-x*k,80+(size.height-112-h*(props.temporal?1:k))/2-y*(props.temporal?1:k)).scale(k));
}
function revealFocus(event:FocusEvent) {
  const target=event.target instanceof HTMLElement?event.target:undefined;
  // A pointer press must finish at its original coordinates; only keyboard focus recenters.
  if (!target?.matches(':focus-visible')) return;
  const card=target?.closest<HTMLElement>('[data-story-id]');
  if (!card || !viewport.value) return;
  const rect=target!.getBoundingClientRect();
  const host=viewport.value.getBoundingClientRect();
  if (rect.left<host.left || rect.right>host.right || rect.top<host.top+60 || rect.bottom>host.bottom) frame(card);
}
function onKeydown(event:KeyboardEvent) {
  if (event.target!==viewport.value || !zoomer) return;
  if (event.key==='+' || event.key==='=') scale(1.3);
  else if (event.key==='-' || event.key==='−') scale(1/1.3);
  else if (event.key==='Home') fit();
  else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
    automaticFit=false;
    const amount=(event.shiftKey?200:80)/zoomLevel.value;
    select(viewport.value!).call(zoomer.translateBy,event.key==='ArrowLeft'?amount:event.key==='ArrowRight'?-amount:0,event.key==='ArrowUp'?amount:event.key==='ArrowDown'?-amount:0);
  } else return;
  event.preventDefault();
}
onMounted(async()=>{
  zoomer=zoom<HTMLElement,unknown>().extent(()=>{const size=dimensions();return [[0,0],[size.width,size.height]];}).scaleExtent([MIN_ZOOM,MAX_ZOOM])
    .filter(event=>!event.button && (event.type==='wheel' || !(event.target instanceof Element && event.target.closest('button,a,input,select,textarea,[role="switch"]'))))
    .on('start',event=>{if(event.sourceEvent)automaticFit=false;})
    .on('zoom',event=>{
      const {x,y,k}=event.transform;
      // Temporal zoom changes dates only; vertical movement belongs to panning.
      if (props.temporal&&!placing&&k!==zoomLevel.value) {
        place(zoomIdentity.translate(x,renderedY).scale(k));
        return;
      }
      renderedY=y;
      zoomLevel.value=k;
      if (props.temporal) emit('viewChange',{x,scale:k,width:dimensions().width});
      if(scene.value) {
        scene.value.style.setProperty('--canvas-zoom',String(k));
        scene.value.style.setProperty('--canvas-offset-x',`${x}px`);
        scene.value.style.transform=props.temporal?`translate(0px, ${y}px)`:`translate(${x}px, ${y}px) scale(${k})`;
      }
    });
  select(viewport.value!).call(zoomer).on('dblclick.zoom',null);
  observer=new ResizeObserver(()=>{
    const size=dimensions();
    if (automaticFit) fit();
    else if (viewport.value && (width!==size.width || height!==size.height)) select(viewport.value).call(zoomer.translateBy,(size.width-width)/2/zoomLevel.value,(size.height-height)/2/zoomLevel.value);
    width=size.width;height=size.height;
  });
  observer.observe(viewport.value!);observer.observe(scene.value!);
  await nextTick();fit();
});
onBeforeUnmount(()=>{observer?.disconnect();if(viewport.value)select(viewport.value).on('.zoom',null);});
defineExpose({ frame, fit, preserveView });
</script>

<style scoped>
.timeline-map-canvas {min-width:0;display:flex;flex-direction:column;border:1px solid var(--color-border-default);border-radius:var(--radius-lg);background:var(--color-surface-default);overflow:hidden;}
.timeline-map-canvas__toolbar {display:flex;align-items:center;flex-wrap:wrap;gap:var(--spacing-sm);padding:var(--spacing-sm);border-bottom:1px solid var(--color-border-default);flex-shrink:0;}
.timeline-map-canvas__zoom {min-width:48px;text-align:center;color:var(--color-text-secondary);font:var(--type-meta);font-variant-numeric:tabular-nums;}
.timeline-map-canvas__expand {margin-inline-start:auto;}
.timeline-map-canvas__plot {position:relative;height:clamp(420px,calc(100dvh - 290px),900px);isolation:isolate;min-height:0;}
.timeline-map-canvas__viewport {position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;background-color:var(--color-surface-subtle);background-image:radial-gradient(var(--color-border-default) 1px,transparent 1px);background-size:20px 20px;}
.timeline-map-canvas__viewport:active {cursor:grabbing;}
.timeline-map-canvas__viewport:focus-visible {outline:2px solid var(--color-border-focus);outline-offset:-2px;}
.timeline-map-canvas__scene {--canvas-zoom:1;--canvas-offset-x:0px;position:absolute;top:0;left:0;display:flex;align-items:flex-start;gap:64px;width:max-content;transform-origin:0 0;padding:16px;}
.timeline-map-canvas--temporal .timeline-map-canvas__scene {padding:0;}
.timeline-map-canvas__search {position:absolute;top:var(--spacing-md);left:var(--spacing-md);width:248px;max-width:calc(100% - var(--spacing-md) * 2);z-index:var(--z-index-dropdown);}
.timeline-map-canvas--expanded {flex:1;min-height:160px;}
.timeline-map-canvas--expanded .timeline-map-canvas__plot {height:auto;flex:1;}
</style>
