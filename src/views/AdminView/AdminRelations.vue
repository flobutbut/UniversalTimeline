<template>
  <section class="admin-relations" aria-labelledby="admin-relations-title">
    <header class="admin-relations__header">
      <div><h2 id="admin-relations-title">Réseau des relations</h2><p class="admin-relations__muted">Toutes les frises, périodes et événements dans un réseau de forces. Une fiche partagée reste un seul objet.</p></div>
      <Button variant="tertiary" size="sm" :disabled="overviewLoading" @click="refresh"><template #icon><Icon icon="mdi:refresh" width="18" height="18" aria-hidden="true" /></template>Actualiser</Button>
    </header>
    <FeedbackState v-if="overviewLoading" kind="loading" layout="inline" />
    <FeedbackState v-else-if="overviewError" kind="error" layout="inline" :message="overviewError" retryable @retry="refresh" />
    <template v-else-if="overview">
      <p class="admin-relations__muted" role="status">{{ overview.stories.length }} frises · {{ overview.periods.length }} périodes · {{ overview.events.length }} événements · {{ graph.edges.length }} liens affichés · {{ formatAdminDate(overview.generatedAt,true) }} · privées comprises</p>
      <div class="admin-relations__toolbar">
        <SearchInput v-model="query" placeholder="Rechercher un objet du réseau" />
        <Switch v-model="showStories" variant="sm" label="Frises" /><Switch v-model="showPeriods" variant="sm" label="Périodes" /><Switch v-model="showEvents" variant="sm" label="Événements" />
        <Button variant="tertiary" size="sm" :pressed="showList" @click="showList=!showList">Liste des objets</Button>
        <Button v-if="selectedId" variant="ghost" size="sm" @click="deselect">Désélectionner</Button>
      </div>
      <RelationGraphCanvas v-if="graph.nodes.length" :graph="graph" :selected="selectedId" @select-node="selectNode" @select-edge="selectEdge" @deselect="deselect" />
      <FeedbackState v-else kind="empty" layout="inline" message="Activez un type d’objet pour l’afficher dans le réseau." />
      <section v-if="query.trim() || showList" class="admin-relations__results" aria-label="Objets du réseau">
        <p class="admin-relations__muted" role="status">{{ results.length }} objets</p>
        <div class="admin-relations__result-grid">
          <button v-for="node in results" :key="node.id" class="admin-relations__row" type="button" :aria-pressed="selectedId===node.id" :class="{'admin-relations__row--selected':selectedId===node.id}" @click="selectNode(node.id)">
            <ItemSummary :title="node.title" :description="`${kindLabels[node.kind]} · ${node.subtitle}`" />
          </button>
        </div>
        <FeedbackState v-if="!results.length" kind="empty" layout="inline" message="Aucun objet ne correspond." />
      </section>
      <section class="admin-relations__detail" aria-labelledby="relation-detail-title" :aria-busy="detailLoading">
        <FeedbackState v-if="detailLoading" kind="loading" layout="inline" />
        <FeedbackState v-else-if="detailError" kind="error" layout="inline" :message="detailError" retryable @retry="retryDetail" />
        <template v-else-if="selectedEdge">
          <h3 id="relation-detail-title">{{ selectedEdge.label }}</h3><p>{{ nodeTitle(selectedEdge.source) }} → {{ nodeTitle(selectedEdge.target) }}</p>
          <ul v-if="edgeLinks.length" class="admin-relations__links"><li v-for="link in edgeLinks" :key="link.id"><Tag :label="relationLinkLabels[link.type]" /><Button v-if="link.anchor" variant="ghost" size="sm" wrap @click="chooseEntity(link.anchor.kind,link.anchor.id)">{{ link.anchor.title }}</Button><span v-else>Sans ancre explicite</span></li></ul>
          <template v-else><p class="admin-relations__muted">{{ selectedEdge.kind==='hierarchy'?'Cette hiérarchie appartient aux frises indiquées ci-dessous.':'Cette fiche appartient à la frise indiquée ci-dessous.' }}</p><ul class="admin-relations__links"><li v-for="id in selectedEdge.storyIds" :key="id"><Button variant="ghost" size="sm" wrap @click="chooseStory(id)">{{ storyTitle(id) }}</Button><Tag v-if="selectedEdge.importance" :label="importanceLabel(selectedEdge.importance)" /></li></ul></template>
        </template>
        <template v-else-if="entity">
          <div class="admin-relations__heading"><h3 id="relation-detail-title">{{ entity.title }}</h3><Tag :label="kindLabels[entity.kind]" /><Tag :label="entity.stories.length>1?`Partagé dans ${entity.stories.length} frises`:entity.stories.length?'Dans une frise':'Inutilisé'" /></div>
          <p>{{ formatDate(entity.startDate) }}<template v-if="entity.endDate"> → {{ formatDate(entity.endDate) }}</template></p>
          <p class="admin-relations__muted">{{ entity.id }}<template v-if="entity.wikidataId"> · <a :href="`https://www.wikidata.org/wiki/${entity.wikidataId}`" target="_blank" rel="noopener noreferrer">{{ entity.wikidataId }}</a></template></p>
          <ul class="admin-relations__links"><li v-for="story in entity.stories" :key="story.id"><Button variant="ghost" size="sm" wrap @click="chooseStory(story.id)">{{ story.title }}</Button><Tag v-if="!story.isPublic" label="Privée" /><span class="admin-relations__muted">{{ entity.kind==='period'?story.parentId?`Sous ${story.parentTitle??story.parentId}`:'Racine dans cette frise':`Importance : ${importanceLabel(story.importance??'normal')}` }}</span><Button v-if="story.isPublic" variant="tertiary" size="sm" :to="storyTimelineLocation(story.id)">Ouvrir la frise</Button></li></ul>
          <template v-if="entityLinks.length"><h4>Passerelles utilisant cette fiche</h4><p v-for="link in entityLinks" :key="link.id">{{ storyTitle(link.source) }} → {{ storyTitle(link.target) }} · {{ relationLinkLabels[link.type] }}</p></template>
        </template>
        <template v-else-if="selectedStory">
          <div class="admin-relations__heading"><h3 id="relation-detail-title">{{ selectedStory.title }}</h3><Tag :label="selectedStory.isPublic?'Publique':'Privée'" /><Button v-if="selectedStory.isPublic" variant="tertiary" size="sm" :to="storyTimelineLocation(selectedStory.id)">Ouvrir la frise</Button></div>
          <p>{{ selectedStory.periods }} périodes · {{ selectedStory.events }} événements</p>
          <details v-if="content"><summary>Périodes et événements de cette frise</summary><div class="admin-relations__content-lists"><div><h4>Périodes</h4><button v-for="period in content.periods" :key="period.id" class="admin-relations__row" type="button" @click="chooseEntity('period',period.id)"><ItemSummary :title="period.title" :description="`Dans ${period.uses} frise(s) · ${period.parentId?`Sous ${content.periods.find(p=>p.id===period.parentId)?.title??period.parentId}`:'Racine'}`" /></button></div><div><h4>Événements</h4><button v-for="event in content.events" :key="event.id" class="admin-relations__row" type="button" @click="chooseEntity('event',event.id)"><ItemSummary :title="event.title" :description="`Dans ${event.uses} frise(s) · ${importanceLabel(event.importance)}`" /></button></div></div></details>
          <h4>Relations avec les autres frises</h4><ul class="admin-relations__links"><li v-for="link in storyLinks" :key="link.id"><span>{{ storyTitle(link.source) }} → {{ storyTitle(link.target) }}</span><Tag :label="relationLinkLabels[link.type]" /><Button v-if="link.anchor" variant="ghost" size="sm" wrap @click="chooseEntity(link.anchor.kind,link.anchor.id)">{{ link.anchor.title }}</Button></li></ul>
        </template>
        <template v-else><h3 id="relation-detail-title">Explorer le réseau</h3><p class="admin-relations__muted">Tous les objets sont déjà affichés, y compris les fiches inutilisées. Cliquez pour lire les détails, déplacez un cercle pour faire réagir le réseau. Le clic dans le vide désélectionne.</p></template>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Switch from '@/components/base/Switch.vue';
import Tag from '@/components/base/Tag.vue';
import ItemSummary from '@/components/base/ItemSummary.vue';
import {storyTimelineLocation} from '@/router/storyTarget';
import {DateService} from '@/services/DateService';
import {relationLinkLabels,type RelationEntityKind} from '@/types/adminRelations';
import {formatAdminDate} from './adminFormat';
import {buildRelationGraph,graphKey,importanceLabel,type GraphKind} from './relationGraph';
import {useAdminRelations} from './useAdminRelations';
import RelationGraphCanvas from './RelationGraphCanvas.vue';

const {overview,content,entity,selectedStory,overviewLoading,overviewError,detailLoading,detailError,selectStory,selectEntity,clearDetail,load,retryDetail}=useAdminRelations();
const selectedId=ref<string|null>(null);const query=ref('');const showList=ref(false);
const showStories=ref(true);const showPeriods=ref(true);const showEvents=ref(true);
const kindLabels={story:'Frise',period:'Période',event:'Événement'};
const graph=computed(()=>buildRelationGraph(overview.value??{generatedAt:'',stories:[],links:[],periods:[],events:[],memberships:[]},
  (['story','period','event'] as GraphKind[]).filter(kind=>kind==='story'?showStories.value:kind==='period'?showPeriods.value:showEvents.value)));
const results=computed(()=>graph.value.nodes.filter(node=>node.title.toLocaleLowerCase('fr').includes(query.value.trim().toLocaleLowerCase('fr'))));
const selectedEdge=computed(()=>graph.value.edges.find(edge=>edge.id===selectedId.value)??null);
const edgeLinks=computed(()=>overview.value?.links.filter(link=>selectedEdge.value?.linkIds.includes(link.id))??[]);
const storyLinks=computed(()=>overview.value?.links.filter(link=>link.source===selectedStory.value?.id||link.target===selectedStory.value?.id)??[]);
const entityLinks=computed(()=>overview.value?.links.filter(link=>link.anchor?.kind===entity.value?.kind&&link.anchor?.id===entity.value?.id)??[]);
const storyTitle=(id:string)=>overview.value?.stories.find(story=>story.id===id)?.title??id;
const nodeTitle=(id:string)=>graph.value.nodes.find(node=>node.id===id)?.title??id;
const formatDate=(date:string)=>DateService.format(DateService.parse(date));
function chooseStory(id:string){selectedId.value=graphKey('story',id);void selectStory(id);}
function chooseEntity(kind:RelationEntityKind,id:string){selectedId.value=graphKey(kind,id);void selectEntity(kind,id);}
function selectNode(id:string){const node=graph.value.nodes.find(node=>node.id===id);if(!node)return;if(node.kind==='story')chooseStory(node.entityId);else chooseEntity(node.kind,node.entityId);}
function selectEdge(id:string){clearDetail();selectedId.value=id;}
function deselect(){selectedId.value=null;clearDetail();}
function refresh(){deselect();void load();}
watch(graph,()=>{if(selectedId.value&&!graph.value.nodes.some(n=>n.id===selectedId.value)&&!graph.value.edges.some(e=>e.id===selectedId.value))deselect();});
onMounted(load);
</script>

<style scoped>
.admin-relations {display:flex;flex-direction:column;gap:var(--spacing-md);min-width:0;}
.admin-relations h2 {margin:0;font-size:var(--font-size-2xl);}
.admin-relations h3 {margin:0;font:var(--type-panel-title);}
.admin-relations h4 {margin:var(--spacing-lg) 0 var(--spacing-sm);font:var(--type-label);}
.admin-relations p {margin:var(--spacing-sm) 0;}
.admin-relations__header,.admin-relations__heading,.admin-relations__toolbar {display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-md);}
.admin-relations__header {justify-content:space-between;}
.admin-relations__muted {color:var(--color-text-secondary);font:var(--type-compact);}
.admin-relations__toolbar > :first-child {flex:1 1 260px;}
.admin-relations__detail,.admin-relations__results {padding:var(--spacing-lg);border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-surface-raised);min-width:0;overflow-wrap:anywhere;}
.admin-relations__links {display:flex;flex-direction:column;gap:var(--spacing-sm);padding:0;list-style:none;}
.admin-relations__links li {display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-sm);}
.admin-relations__result-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));max-height:300px;overflow:auto;}
.admin-relations__row {display:flex;min-width:0;width:100%;padding:var(--spacing-md);border:0;border-bottom:1px solid var(--color-border-light);background:transparent;color:var(--color-text-primary);font:var(--type-compact);text-align:left;cursor:pointer;}
.admin-relations__row > * {min-width:0;}
.admin-relations__row:hover {background:var(--color-interaction-hover);}
.admin-relations__row--selected,.admin-relations__row--selected:hover {background:var(--color-interaction-selected);color:var(--color-text-on-selected);}
.admin-relations__row:focus-visible,.admin-relations summary:focus-visible {outline:2px solid var(--color-border-focus);outline-offset:-2px;}
.admin-relations summary {padding:var(--spacing-sm);cursor:pointer;font:var(--type-label);}
.admin-relations__content-lists {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--spacing-lg);}
.admin-relations__content-lists > div {min-width:0;max-height:300px;overflow:auto;}
</style>
