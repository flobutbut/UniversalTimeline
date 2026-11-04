<template>
  <section ref="workspace" class="admin-timelines" :class="{'admin-timelines--expanded':expanded}" :role="expanded?'dialog':undefined" :aria-modal="expanded?'true':undefined" aria-labelledby="admin-timelines-title" tabindex="-1" @keydown.esc="dismissSelection">
    <ExpandedMapFocus v-if="expanded" />
    <header v-show="!expanded" class="admin-timelines__header">
      <div>
        <h2 id="admin-timelines-title">Carte des frises</h2>
      </div>
      <Button variant="tertiary" size="sm" :disabled="loading" @click="refresh"><template #icon><Icon icon="mdi:refresh" width="18" height="18" aria-hidden="true" /></template>Actualiser</Button>
    </header>
    <FeedbackState v-if="loading" kind="loading" layout="inline" :message="network?`Chargement des aperçus : ${completed} / ${network.stories.length} frises…`:'Chargement des frises…'" />
    <FeedbackState v-else-if="error" kind="error" layout="inline" :message="error" retryable @retry="refresh" />
    <template v-else-if="network">
      <FeedbackState v-if="failures.size" kind="error" layout="inline" :message="`${failures.size} aperçu(s) indisponible(s). La carte est incomplète.`" retryable @retry="refresh" />
      <TimelineMapCanvas ref="canvas" :expanded="expanded" temporal @toggle-expand="setExpanded(!expanded)" @view-change="viewport=$event">
        <template #tools>
          <Switch v-model="showEvents" variant="sm" label="Événements" />
          <Button variant="ghost" size="sm" :disabled="!layout.parents.size" @click="setBranches(false)">Tout déplier</Button>
          <Button variant="ghost" size="sm" :disabled="!layout.parents.size" @click="setBranches(true)">Tout replier</Button>
        </template>
        <template #search><RelationGraphSearch :nodes="graph.nodes" @select="locateObject" /></template>
        <span class="sr-only" role="status">{{ selectionStatus }}</span>
        <div class="admin-timelines__map" :style="{'--map-width':layout.width+'px','--map-height':layout.height+'px'}">
          <span v-if="layout.undatedTop!==null" class="admin-timelines__undated" :style="{top:layout.undatedTop+'px'}">Dates non déterminées</span>
          <div v-for="row in projectedRows" :key="row.story.id" class="admin-timelines__position" :data-temporal-story="row.story.id"
            :data-start="row.bounds?.start" :data-end="row.bounds?.end" :data-dated="!!row.bounds"
            :style="{'--row-left':row.left+'px','--row-width':row.width+'px','--row-top':row.top+'px',left:row.projected.left+'px',width:row.projected.width+'px',visibility:row.projected.visible?'visible':'hidden',top:row.top+'px'}">
            <TimelineMapCard :ref="value=>registerCard(row.story.id,value)" :story="row.story" :content="contents.get(row.story.id)" :show-events="showEvents"
              :child-count="row.childCount" :collapsed="collapsed.has(row.story.id)" :selected="selectedNode" :bounds="row.projected.bounds" :full-bounds="row.bounds" :reference-time="layout.referenceTime" :align-title-end="viewport.width-row.projected.left<240"
              @select="selectedId=$event" @toggle="toggleBranch" @resize="setCardHeight(row.story.id,$event)" />
          </div>
        </div>
        <FeedbackState v-if="!network.stories.length" kind="empty" message="Aucune frise à afficher." />
      </TimelineMapCanvas>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, nextTick, onMounted, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Switch from '@/components/base/Switch.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import { useDialog } from '@/composables/useDialog';
import { buildRelationGraph } from './relationGraph';
import { storyAncestors } from './adminTimelineTree';
import { buildTemporalTimelineMap, projectTemporalRow, type TemporalViewport } from './temporalTimelineMap';
import { useAdminTimelines } from './useAdminTimelines';
import RelationGraphSearch from './RelationGraphSearch.vue';
import TimelineMapCard from './TimelineMapCard.vue';
import TimelineMapCanvas from './TimelineMapCanvas.vue';

const { network, contents, failures, loading, error, completed, load }=useAdminTimelines();
const workspace=ref<HTMLElement>();
const canvas=ref<InstanceType<typeof TimelineMapCanvas>>();
const expanded=ref(false);
const showEvents=ref(true);
const collapsed=ref(new Set<string>());
const viewport=ref<TemporalViewport>({x:0,scale:1,width:800});
const selectedId=ref<string|null>(null);
const cards=new Map<string,InstanceType<typeof TimelineMapCard>>();
const cardHeights=shallowRef(new Map<string,number>());
const referenceTime=computed(()=>{void contents.value;return Date.now();});
const layout=computed(()=>buildTemporalTimelineMap(network.value??{generatedAt:'',stories:[],links:[],periods:[],events:[],memberships:[]},contents.value,collapsed.value,referenceTime.value,cardHeights.value));
const projectedRows=computed(()=>layout.value.rows.map(row=>({...row,projected:projectTemporalRow(row,viewport.value)})));
const graph=computed(()=>buildRelationGraph(network.value??{generatedAt:'',stories:[],links:[],periods:[],events:[],memberships:[]}));
const selectedNode=computed(()=>graph.value.nodes.find(node=>node.id===selectedId.value));
const selectionStatus=computed(()=>{
  const node=selectedNode.value;
  if (!node) return '';
  const orphan=node.kind!=='story'&&!network.value?.memberships.some(member=>member.kind===node.kind&&member.entityId===node.entityId);
  return `${node.title}${orphan?' · Cet objet n’appartient à aucune frise.':''}`;
});
let expansionTrigger:HTMLElement|null=null;
const ExpandedMapFocus=defineComponent({setup(){
  useDialog(workspace,{close:()=>{if(selectedId.value)selectedId.value=null;else void setExpanded(false);},initialFocus:'[data-timeline-expand]'});
  return ()=>null;
}});
async function setExpanded(value:boolean) {
  if (expanded.value===value) return;
  if (value) expansionTrigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  expanded.value=value;
  if (!value) {
    await nextTick();workspace.value?.removeAttribute('inert');
    if (expansionTrigger?.isConnected&&!expansionTrigger.closest('[inert]')) expansionTrigger.focus();
  }
}
function dismissSelection(event:KeyboardEvent) {
  if (!event.defaultPrevented&&selectedId.value) {event.preventDefault();event.stopPropagation();selectedId.value=null;}
}
function registerCard(id:string,value:Element|ComponentPublicInstance|null) {
  if (value) cards.set(id,value as InstanceType<typeof TimelineMapCard>);else cards.delete(id);
}
function setCardHeight(id:string,height:number) {
  if (Math.abs((cardHeights.value.get(id)??0)-height)<.5) return;
  cardHeights.value=new Map(cardHeights.value).set(id,height);
}
function toggleBranch(id:string) {
  const next=new Set(collapsed.value);
  if (next.has(id)) next.delete(id);else next.add(id);
  collapsed.value=next;
}
async function setBranches(retract:boolean) {
  collapsed.value=retract?new Set(layout.value.parents.values()):new Set();
  await nextTick();canvas.value?.fit();
}
async function locateObject(id:string) {
  const node=graph.value.nodes.find(item=>item.id===id);
  if (!node||!network.value) return;
  selectedId.value=id;
  if (node.kind==='event') showEvents.value=true;
  const storyId=node.kind==='story'?node.entityId:network.value.memberships.find(member=>member.kind===node.kind&&member.entityId===node.entityId)?.storyId;
  if (!storyId) return;
  const next=new Set(collapsed.value);
  storyAncestors(storyId,layout.value.parents).forEach(ancestor=>next.delete(ancestor));
  collapsed.value=next;
  await nextTick();
  const card=cards.get(storyId);
  if (card?.$el instanceof HTMLElement) canvas.value?.frame(card.$el);
}
function refresh() {selectedId.value=null;collapsed.value=new Set();void load();}
watch(network,value=>{
  selectedId.value=null;collapsed.value=new Set();cardHeights.value=new Map();
  if (!value&&expanded.value) void setExpanded(false);
});
watch(showEvents,()=>canvas.value?.preserveView(),{flush:'sync'});
onMounted(load);
</script>

<style scoped>
.admin-timelines {display:flex;flex-direction:column;gap:var(--spacing-md);min-width:0;}
.admin-timelines__header {display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:var(--spacing-md);}
.admin-timelines__header > div {flex:1;min-width:240px;}
.admin-timelines h2 {margin:0;font-size:var(--font-size-2xl);}
.admin-timelines p {margin:var(--spacing-sm) 0;color:var(--color-text-secondary);font:var(--type-compact);}
.admin-timelines__map {position:relative;width:var(--map-width);height:var(--map-height);}
.admin-timelines__position {position:absolute;}
.admin-timelines__position > :deep(.timeline-map-card) {width:100%;}
.admin-timelines__undated {position:absolute;left:var(--canvas-offset-x, 0px);white-space:nowrap;font:var(--type-meta);color:var(--color-text-secondary);}
.admin-timelines--expanded {position:fixed;inset:0;z-index:var(--z-index-modal);height:100dvh;box-sizing:border-box;padding:var(--spacing-md);overflow:auto;background:var(--color-background-default);color:var(--color-text-primary);}
</style>
