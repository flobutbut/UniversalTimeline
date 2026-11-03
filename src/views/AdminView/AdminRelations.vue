<template>
  <section ref="workspace" class="admin-relations" :class="{'admin-relations--expanded':expanded}" :role="expanded?'dialog':undefined" :aria-modal="expanded?'true':undefined" aria-labelledby="admin-relations-title" tabindex="-1">
    <ExpandedGraphFocus v-if="expanded" />
    <header v-show="!expanded" class="admin-relations__header">
      <div><h2 id="admin-relations-title">Réseau des relations</h2>
        <p v-if="overview" class="admin-relations__muted" role="status">{{ visibleCounts.story }} frises · {{ visibleCounts.period }} périodes · {{ visibleCounts.event }} événements · {{ graph.edges.length }} liens affichés<template v-if="filtersActive"> · sur {{ overview.stories.length+overview.periods.length+overview.events.length }} objets au total</template> · {{ formatAdminDate(overview.generatedAt,true) }} · privées comprises</p>
      </div>
      <Button variant="tertiary" size="sm" :disabled="overviewLoading" @click="refresh"><template #icon><Icon icon="mdi:refresh" width="18" height="18" aria-hidden="true" /></template>Actualiser</Button>
    </header>
    <FeedbackState v-if="overviewLoading" kind="loading" layout="inline" />
    <FeedbackState v-else-if="overviewError" kind="error" layout="inline" :message="overviewError" retryable @retry="refresh" />
    <template v-else-if="overview">
      <div v-if="selectedId" class="admin-relations__toolbar">
        <Button v-if="selectedRecordLocation" variant="tertiary" size="sm" wrap :to="selectedRecordLocation">Ouvrir la fiche dans Frises</Button>
        <Button v-if="selectedId" variant="ghost" size="sm" @click="deselect">Désélectionner</Button>
      </div>
      <div class="admin-relations__filters" role="group" aria-label="Filtres du réseau">
        <Switch v-model="showStories" variant="sm" label="Frises" /><Switch v-model="showPeriods" variant="sm" label="Périodes" /><Switch v-model="showEvents" variant="sm" label="Événements" />
        <Switch v-model="leafStoriesOnly" variant="sm" label="Frises sans enfants" />
        <Switch v-model="sharedOnly" variant="sm" label="Contenus partagés seulement" />
        <Switch v-model="allLabels" variant="sm" label="Tous les libellés" />
      </div>
      <p v-if="filtersActive && !expanded" class="admin-relations__muted">{{ filteredNetwork.stories.length }} frises retenues. Les partages sont comptés entre ces frises uniquement.<template v-if="leafStoriesOnly"> Seuls les liens parent–enfant définissent les enfants ; les passerelles sont conservées.</template><template v-if="sharedOnly && !filteredNetwork.periods.length && !filteredNetwork.events.length"> Aucun contenu partagé entre les frises retenues.</template></p>
      <RelationGraphCanvas v-model:all-labels="allLabels" :graph="graph" :selected="selectedId" :expanded="expanded" @toggle-expand="setExpanded(!expanded)" @select-node="selectNode" @select-edge="selectEdge" @deselect="deselect">
        <template #search><RelationGraphSearch :nodes="graph.nodes" @select="selectNode" /></template>
        <template #empty><FeedbackState kind="empty" layout="inline" :message="filtersActive?'Aucun objet ne correspond aux filtres et types activés.':'Activez un type d’objet pour l’afficher dans le réseau.'" /></template>
      </RelationGraphCanvas>
      <section v-show="!expanded" class="admin-relations__detail" aria-labelledby="relation-detail-title" :aria-busy="detailLoading">
        <FeedbackState v-if="detailLoading" kind="loading" layout="inline" />
        <FeedbackState v-else-if="detailError" kind="error" layout="inline" :message="detailError" retryable @retry="retryDetail" />
        <template v-else-if="selectedEdge">
          <h3 id="relation-detail-title">{{ selectedEdge.label }}</h3><p>{{ nodeTitle(selectedEdge.source) }} → {{ nodeTitle(selectedEdge.target) }}</p>
          <ul v-if="edgeLinks.length" class="admin-relations__links"><li v-for="link in edgeLinks" :key="link.id"><Tag :label="relationLinkLabels[link.type]" /><Button v-if="link.anchor" variant="ghost" size="sm" wrap :disabled="!scopeEntityIds.has(graphKey(link.anchor.kind,link.anchor.id))" @click="chooseEntity(link.anchor.kind,link.anchor.id)">{{ link.anchor.title }}</Button><span v-else>Sans ancre explicite</span></li></ul>
          <template v-else><p class="admin-relations__muted">{{ selectedEdge.kind==='hierarchy'?'Cette hiérarchie appartient aux frises indiquées ci-dessous.':'Cette fiche appartient à la frise indiquée ci-dessous.' }}</p><ul class="admin-relations__links"><li v-for="id in selectedEdge.storyIds" :key="id"><Button variant="ghost" size="sm" wrap @click="chooseStory(id)">{{ storyTitle(id) }}</Button><Tag v-if="selectedEdge.importance" :label="importanceLabel(selectedEdge.importance)" /></li></ul></template>
        </template>
        <template v-else-if="entity">
          <div class="admin-relations__heading"><h3 id="relation-detail-title">{{ entity.title }}</h3><Tag :label="kindLabels[entity.kind]" /><Tag :label="entityUsages.length>1?`Partagé dans ${entityUsages.length} frises`:entityUsages.length?'Dans une frise':'Inutilisé'" /></div>
          <p v-if="filtersActive && !expanded" class="admin-relations__muted">{{ entityUsages.length }} utilisations dans les frises retenues · {{ entity.stories.length }} au total.</p>
          <p>{{ formatDate(entity.startDate) }}<template v-if="entity.endDate"> → {{ formatDate(entity.endDate) }}</template></p>
          <p class="admin-relations__muted">{{ entity.id }}<template v-if="entity.wikidataId"> · <a :href="`https://www.wikidata.org/wiki/${entity.wikidataId}`" target="_blank" rel="noopener noreferrer">{{ entity.wikidataId }}</a></template></p>
          <ul class="admin-relations__links"><li v-for="story in entityUsages" :key="story.id"><Button variant="ghost" size="sm" wrap @click="chooseStory(story.id)">{{ story.title }}</Button><Tag v-if="!story.isPublic" label="Privée" /><span class="admin-relations__muted">{{ entity.kind==='period'?story.parentId?`Sous ${story.parentTitle??story.parentId}`:'Racine dans cette frise':`Importance : ${importanceLabel(story.importance??'normal')}` }}</span><Button v-if="story.isPublic" variant="tertiary" size="sm" :to="storyTimelineLocation(story.id)">Ouvrir la frise</Button></li></ul>
          <template v-if="entityLinks.length"><h4>Passerelles utilisant cette fiche</h4><p v-for="link in entityLinks" :key="link.id">{{ storyTitle(link.source) }} → {{ storyTitle(link.target) }} · {{ relationLinkLabels[link.type] }}</p></template>
        </template>
        <template v-else-if="selectedStory">
          <div class="admin-relations__heading"><h3 id="relation-detail-title">{{ selectedStory.title }}</h3><Tag :label="selectedStory.isPublic?'Publique':'Privée'" /><Button v-if="selectedStory.isPublic" variant="tertiary" size="sm" :to="storyTimelineLocation(selectedStory.id)">Ouvrir la frise</Button></div>
          <p>{{ selectedStory.periods }} périodes · {{ selectedStory.events }} événements au total</p>
          <details v-if="content"><summary>{{ filtersActive?'Contenus de cette frise retenus dans le réseau':'Périodes et événements de cette frise' }}</summary><div class="admin-relations__content-lists"><div><h4>Périodes</h4><button v-for="period in visibleContent.periods" :key="period.id" class="admin-relations__row" type="button" @click="chooseEntity('period',period.id)"><ItemSummary :title="period.title" :description="`Dans ${usageCount('period',period.id)} frise(s) retenues · ${period.parentId?`Sous ${content.periods.find(p=>p.id===period.parentId)?.title??period.parentId}`:'Racine'}`" /></button></div><div><h4>Événements</h4><button v-for="event in visibleContent.events" :key="event.id" class="admin-relations__row" type="button" @click="chooseEntity('event',event.id)"><ItemSummary :title="event.title" :description="`Dans ${usageCount('event',event.id)} frise(s) retenues · ${importanceLabel(event.importance)}`" /></button></div></div></details>
          <h4>Relations avec les autres frises</h4><ul class="admin-relations__links"><li v-for="link in storyLinks" :key="link.id"><span>{{ storyTitle(link.source) }} → {{ storyTitle(link.target) }}</span><Tag :label="relationLinkLabels[link.type]" /><Button v-if="link.anchor" variant="ghost" size="sm" wrap :disabled="!scopeEntityIds.has(graphKey(link.anchor.kind,link.anchor.id))" @click="chooseEntity(link.anchor.kind,link.anchor.id)">{{ link.anchor.title }}</Button></li></ul>
        </template>
        <template v-else><h3 id="relation-detail-title">Explorer le réseau</h3><p class="admin-relations__muted">{{ filtersActive?'Les objets et liens correspondent aux filtres activés.':'Tous les objets sont déjà affichés, y compris les fiches inutilisées.' }} Cliquez pour lire les détails, déplacez un cercle pour faire réagir le réseau. Le clic dans le vide désélectionne.</p></template>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import {computed,defineComponent,nextTick,onMounted,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import Switch from '@/components/base/Switch.vue';
import Tag from '@/components/base/Tag.vue';
import ItemSummary from '@/components/base/ItemSummary.vue';
import {storyTimelineLocation} from '@/router/storyTarget';
import {databaseRecordLocation} from '@/router/searchTarget';
import {DateService} from '@/services/DateService';
import {useDialog} from '@/composables/useDialog';
import {relationLinkLabels,type RelationEntityKind} from '@/types/adminRelations';
import {formatAdminDate} from './adminFormat';
import {buildRelationGraph,filterRelationNetwork,graphKey,importanceLabel,type GraphKind} from './relationGraph';
import {useAdminRelations} from './useAdminRelations';
import RelationGraphCanvas from './RelationGraphCanvas.vue';
import RelationGraphSearch from './RelationGraphSearch.vue';

const {overview,content,entity,selectedStory,overviewLoading,overviewError,detailLoading,detailError,selectStory,selectEntity,clearDetail,load,retryDetail}=useAdminRelations();
const selectedId=ref<string|null>(null);const allLabels=ref(false);
const workspace=ref<HTMLElement>();const expanded=ref(false);
let expansionTrigger:HTMLElement|null=null;
// Mount only the focus scope on expansion; the canvas and its simulation stay mounted.
const ExpandedGraphFocus=defineComponent({setup(){
  useDialog(workspace,{close:()=>{void setExpanded(false);},initialFocus:'[data-relation-expand]'});
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
const kindLabels={story:'Frise',period:'Période',event:'Événement'};
const filteredNetwork=computed(()=>filterRelationNetwork(overview.value??{generatedAt:'',stories:[],links:[],periods:[],events:[],memberships:[]},{leafStoriesOnly:leafStoriesOnly.value,sharedOnly:sharedOnly.value}));
const retainedStoryIds=computed(()=>new Set(filteredNetwork.value.stories.map(story=>story.id)));
const graph=computed(()=>buildRelationGraph(filteredNetwork.value,
  (['story','period','event'] as GraphKind[]).filter(kind=>kind==='story'?showStories.value:kind==='period'?showPeriods.value:showEvents.value)));
const scopeEntityIds=computed(()=>new Set([...filteredNetwork.value.periods.map(p=>graphKey('period',p.id)),...filteredNetwork.value.events.map(e=>graphKey('event',e.id))]));
const visibleContent=computed(()=>({periods:content.value?.periods.filter(p=>scopeEntityIds.value.has(graphKey('period',p.id)))??[],events:content.value?.events.filter(e=>scopeEntityIds.value.has(graphKey('event',e.id)))??[]}));
const scopedUses=computed(()=>{const uses=new Map<string,Set<string>>();for(const membership of filteredNetwork.value.memberships){const key=graphKey(membership.kind,membership.entityId);const ids=uses.get(key)??new Set<string>();ids.add(membership.storyId);uses.set(key,ids);}return uses;});
const usageCount=(kind:RelationEntityKind,id:string)=>scopedUses.value.get(graphKey(kind,id))?.size??0;
const visibleCounts=computed(()=>({story:graph.value.nodes.filter(n=>n.kind==='story').length,period:graph.value.nodes.filter(n=>n.kind==='period').length,event:graph.value.nodes.filter(n=>n.kind==='event').length}));
const selectedRecordLocation=computed(()=>{const node=graph.value.nodes.find(node=>node.id===selectedId.value);return node?databaseRecordLocation(node.kind,node.entityId):undefined;});
const selectedEdge=computed(()=>graph.value.edges.find(edge=>edge.id===selectedId.value)??null);
const edgeLinks=computed(()=>overview.value?.links.filter(link=>selectedEdge.value?.linkIds.includes(link.id))??[]);
const storyLinks=computed(()=>filteredNetwork.value.links.filter(link=>link.source===selectedStory.value?.id||link.target===selectedStory.value?.id));
const entityLinks=computed(()=>filteredNetwork.value.links.filter(link=>link.anchor?.kind===entity.value?.kind&&link.anchor?.id===entity.value?.id));
const entityUsages=computed(()=>entity.value?.stories.filter(story=>retainedStoryIds.value.has(story.id))??[]);
const storyTitle=(id:string)=>overview.value?.stories.find(story=>story.id===id)?.title??id;
const nodeTitle=(id:string)=>graph.value.nodes.find(node=>node.id===id)?.title??id;
const formatDate=(date:string)=>DateService.format(DateService.parse(date));
function chooseStory(id:string){if(!retainedStoryIds.value.has(id))return;showStories.value=true;selectedId.value=graphKey('story',id);void selectStory(id);}
function chooseEntity(kind:RelationEntityKind,id:string){if(!scopeEntityIds.value.has(graphKey(kind,id)))return;if(kind==='period')showPeriods.value=true;else showEvents.value=true;selectedId.value=graphKey(kind,id);void selectEntity(kind,id);}
function selectNode(id:string){const node=graph.value.nodes.find(node=>node.id===id);if(!node)return;if(node.kind==='story')chooseStory(node.entityId);else chooseEntity(node.kind,node.entityId);}
function selectEdge(id:string){clearDetail();selectedId.value=id;}
function deselect(){selectedId.value=null;clearDetail();}
function refresh(){deselect();void load();}
watch(graph,()=>{if(selectedId.value&&!graph.value.nodes.some(n=>n.id===selectedId.value)&&!graph.value.edges.some(e=>e.id===selectedId.value))deselect();});
watch(overview,value=>{if(!value&&expanded.value)void setExpanded(false);});
onMounted(load);
</script>

<style scoped>
.admin-relations {display:flex;flex-direction:column;gap:var(--spacing-md);min-width:0;}
.admin-relations h2 {margin:0;font-size:var(--font-size-2xl);}
.admin-relations h3 {margin:0;font:var(--type-panel-title);}
.admin-relations h4 {margin:var(--spacing-lg) 0 var(--spacing-sm);font:var(--type-label);}
.admin-relations p {margin:var(--spacing-sm) 0;}
.admin-relations__header,.admin-relations__heading,.admin-relations__toolbar,.admin-relations__filters {display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-md);}
.admin-relations__header {justify-content:space-between;}
.admin-relations__muted {color:var(--color-text-secondary);font:var(--type-compact);}
.admin-relations__toolbar,.admin-relations__filters {gap:var(--spacing-sm);flex-shrink:0;}
.admin-relations__detail {padding:var(--spacing-lg);border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-surface-raised);min-width:0;overflow-wrap:anywhere;}
.admin-relations__links {display:flex;flex-direction:column;gap:var(--spacing-sm);padding:0;list-style:none;}
.admin-relations__links li {display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-sm);}
.admin-relations__row {display:flex;min-width:0;width:100%;padding:var(--spacing-md);border:0;border-bottom:1px solid var(--color-border-light);background:transparent;color:var(--color-text-primary);font:var(--type-compact);text-align:left;cursor:pointer;}
.admin-relations__row > * {min-width:0;}
.admin-relations__row:hover {background:var(--color-interaction-hover);}
.admin-relations__row:focus-visible,.admin-relations summary:focus-visible {outline:2px solid var(--color-border-focus);outline-offset:-2px;}
.admin-relations summary {padding:var(--spacing-sm);cursor:pointer;font:var(--type-label);}
.admin-relations__content-lists {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--spacing-lg);}
.admin-relations__content-lists > div {min-width:0;max-height:300px;overflow:auto;}
.admin-relations--expanded {position:fixed;inset:0;z-index:var(--z-index-modal);height:100dvh;box-sizing:border-box;padding:var(--spacing-md);gap:var(--spacing-sm);overflow:auto;background:var(--color-background-default);color:var(--color-text-primary);}
</style>
