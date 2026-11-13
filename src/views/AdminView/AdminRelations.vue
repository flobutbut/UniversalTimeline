<template>
  <section ref="workspace" class="admin-relations" :class="{'admin-relations--expanded':expanded}" :role="expanded?'dialog':undefined" :aria-modal="expanded?'true':undefined" aria-labelledby="admin-relations-title" tabindex="-1" @keydown.esc="dismissFromKeyboard">
    <ExpandedGraphFocus v-if="expanded" />
    <header v-show="!expanded" class="admin-relations__header">
      <div><h2 id="admin-relations-title">{{ uiText("Réseau des relations") }}</h2>
        <p v-if="overview" class="admin-relations__muted" role="status">{{ visibleCounts.story }} {{ uiText("frises ·") }} {{ visibleCounts.period }} {{ uiText("périodes ·") }} {{ visibleCounts.event }} {{ uiText("événements ·") }} {{ graph.edges.length }} {{ uiText("liens affichés") }}<template v-if="filtersActive"> {{ uiText("· sur") }} {{ overview.stories.length+overview.periods.length+overview.events.length }} {{ uiText("objets au total") }}</template> · {{ formatAdminDate(overview.generatedAt,true) }} {{ uiText("· privées comprises") }}</p>
      </div>
      <Button variant="tertiary" size="sm" :disabled="overviewLoading" @click="refresh"><template #icon><Icon icon="mdi:refresh" width="18" height="18" aria-hidden="true" /></template>{{ uiText("Actualiser") }}</Button>
    </header>
    <FeedbackState v-if="overviewLoading" kind="loading" layout="inline" />
    <FeedbackState v-else-if="overviewError" kind="error" layout="inline" :message="uiText(overviewError)" retryable @retry="refresh" />
    <template v-else-if="overview">
      <div class="admin-relations__filters" role="group" :aria-label="uiText('Filtres du réseau')">
        <Switch v-model="showStories" variant="sm" :label="uiText('Frises')" /><Switch v-model="showPeriods" variant="sm" :label="uiText('Périodes')" /><Switch v-model="showEvents" variant="sm" :label="uiText('Événements')" />
        <Switch v-model="leafStoriesOnly" variant="sm" :label="uiText('Frises sans enfants')" />
        <Switch v-model="sharedOnly" variant="sm" :label="uiText('Contenus partagés seulement')" />
        <Switch v-model="allLabels" variant="sm" :label="uiText('Tous les libellés')" />
      </div>
      <p v-if="filtersActive && !expanded" class="admin-relations__muted">{{ filteredNetwork.stories.length }} {{ uiText("frises retenues. Les partages sont comptés entre ces frises uniquement.") }}<template v-if="leafStoriesOnly"> {{ uiText("Seuls les liens parent–enfant définissent les enfants ; les passerelles sont conservées.") }}</template><template v-if="sharedOnly && !filteredNetwork.periods.length && !filteredNetwork.events.length"> {{ uiText("Aucun contenu partagé entre les frises retenues.") }}</template></p>
      <RelationGraphCanvas v-model:all-labels="allLabels" :graph="graph" :selected="selectedId" :expanded="expanded" @toggle-expand="setExpanded(!expanded)" @select-node="selectNode" @select-edge="selectEdge" @deselect="deselect">
        <template #search><RelationGraphSearch :nodes="graph.nodes" @select="selectNode" /></template>
        <template #selection="{close}"><RelationGraphSelection :node="selectedNode" :edge="selectedEdge" :network="filteredNetwork" :graph="graph" @close="close" /></template>
        <template #empty><FeedbackState kind="empty" layout="inline" :message="uiText(filtersActive?'Aucun objet ne correspond aux filtres et types activés.':'Activez un type d’objet pour l’afficher dans le réseau.')" /></template>
      </RelationGraphCanvas>
    </template>
  </section>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import {computed,defineComponent,nextTick,onMounted,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import Switch from '@/components/base/Switch.vue';
import {useDialog} from '@/composables/useDialog';
import {formatAdminDate} from './adminFormat';
import {buildRelationGraph,filterRelationNetwork,type GraphKind} from './relationGraph';
import {useAdminRelations} from './useAdminRelations';
import RelationGraphCanvas from './RelationGraphCanvas.vue';
import RelationGraphSearch from './RelationGraphSearch.vue';
import RelationGraphSelection from './RelationGraphSelection.vue';

const {overview,overviewLoading,overviewError,load}=useAdminRelations();
const selectedId=ref<string|null>(null);const allLabels=ref(false);
const workspace=ref<HTMLElement>();const expanded=ref(false);
let expansionTrigger:HTMLElement|null=null;
// Mount only the focus scope on expansion; the canvas and its simulation stay mounted.
const ExpandedGraphFocus=defineComponent({setup(){
  useDialog(workspace,{close:()=>{if(selectedId.value)deselect();else void setExpanded(false);},initialFocus:'[data-relation-expand]'});
  return ()=>null;
}});
async function setExpanded(value:boolean){
  if(value===expanded.value)return;
  if(value)expansionTrigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  expanded.value=value;
  if(!value){
    await nextTick();
    // useDialog marks its closing root inert; this persistent workspace returns to normal mode.
    workspace.value?.removeAttribute('inert');
    if(expansionTrigger?.isConnected&&!expansionTrigger.closest('[inert]'))expansionTrigger.focus();
  }
}
const showStories=ref(true);const showPeriods=ref(true);const showEvents=ref(true);
const leafStoriesOnly=ref(false);const sharedOnly=ref(false);
const filtersActive=computed(()=>leafStoriesOnly.value||sharedOnly.value);
const filteredNetwork=computed(()=>filterRelationNetwork(overview.value??{generatedAt:'',stories:[],links:[],periods:[],events:[],memberships:[]},{leafStoriesOnly:leafStoriesOnly.value,sharedOnly:sharedOnly.value}));
const graph=computed(()=>buildRelationGraph(filteredNetwork.value,
  (['story','period','event'] as GraphKind[]).filter(kind=>kind==='story'?showStories.value:kind==='period'?showPeriods.value:showEvents.value)));
const visibleCounts=computed(()=>({story:graph.value.nodes.filter(n=>n.kind==='story').length,period:graph.value.nodes.filter(n=>n.kind==='period').length,event:graph.value.nodes.filter(n=>n.kind==='event').length}));
const selectedNode=computed(()=>graph.value.nodes.find(node=>node.id===selectedId.value));
const selectedEdge=computed(()=>graph.value.edges.find(edge=>edge.id===selectedId.value));
function selectNode(id:string){if(graph.value.nodes.some(node=>node.id===id))selectedId.value=id;}
function selectEdge(id:string){if(graph.value.edges.some(edge=>edge.id===id))selectedId.value=id;}
function deselect(){selectedId.value=null;}
function dismissFromKeyboard(event:KeyboardEvent){if(!event.defaultPrevented&&selectedId.value){event.preventDefault();event.stopPropagation();deselect();}}
function refresh(){deselect();void load();}
watch(graph,()=>{if(selectedId.value&&!graph.value.nodes.some(n=>n.id===selectedId.value)&&!graph.value.edges.some(e=>e.id===selectedId.value))deselect();});
watch(overview,value=>{if(!value&&expanded.value)void setExpanded(false);});
onMounted(load);
</script>

<style scoped>
.admin-relations {display:flex;flex-direction:column;gap:var(--spacing-md);min-width:0;}
.admin-relations h2 {margin:0;font-size:var(--font-size-2xl);}
.admin-relations p {margin:var(--spacing-sm) 0;}
.admin-relations__header,.admin-relations__filters {display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-sm);flex-shrink:0;}
.admin-relations__header {justify-content:space-between;}
.admin-relations__muted {color:var(--color-text-secondary);font:var(--type-compact);}
.admin-relations--expanded {position:fixed;inset:0;z-index:var(--z-index-modal);height:100dvh;box-sizing:border-box;padding:var(--spacing-md);gap:var(--spacing-sm);overflow:auto;background:var(--color-background-default);color:var(--color-text-primary);}
</style>
