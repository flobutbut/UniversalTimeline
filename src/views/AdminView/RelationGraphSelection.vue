<template>
  <PopoverSurface padded class="relation-selection" role="region" :aria-label="uiText(node?'Objet sélectionné':'Lien sélectionné')">
    <div class="relation-selection__heading">
      <h3>{{ uiText(node?.title ?? edge?.label) }}</h3>
      <Button variant="ghost" size="xs" icon-only :aria-label="uiText('Fermer la sélection')" @click="$emit('close')"><template #icon><Icon icon="mdi:close" width="16" height="16" aria-hidden="true" /></template></Button>
    </div>
    <div class="relation-selection__actions">
      <Tag :label="uiText(node?kindLabels[node.kind]:'Relation')" />
      <Button v-if="node" variant="tertiary" size="sm" :disabled="orphan" :aria-describedby="orphan?orphanId:undefined" :to="databaseRecordLocation(node.kind,node.entityId)">{{ uiText("Ouvrir") }}</Button>
    </div>
    <p v-if="edge" class="relation-selection__caption">{{ nodeTitle(edge.source) }} → {{ nodeTitle(edge.target) }}</p>
    <p v-if="orphan" :id="orphanId" class="relation-selection__caption">{{ uiText("Objet orphelin · aucune frise parente") }}</p>
    <template v-if="parents.length">
      <p class="relation-selection__caption">{{ uiText(node?'Frise'+(parents.length>1?'s parentes':' parente'):'Frises concernées') }}</p>
      <ul class="relation-selection__parents">
        <li v-for="parent in parents" :key="parent.id">
          <Button variant="ghost" size="sm" wrap :to="databaseRecordLocation('story',parent.id)">{{ parent.title }}</Button>
          <span v-if="parent.context" class="relation-selection__caption">{{ parent.context }}</span>
        </li>
      </ul>
    </template>
  </PopoverSurface>
</template>

<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import {computed,useId} from 'vue';
import {Icon} from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import {databaseRecordLocation} from '@/router/searchTarget';
import type {RelationsNetwork} from '@/types/adminRelations';
import type {GraphNode,GraphEdge,RelationGraph} from './relationGraph';

const props=defineProps<{node?:GraphNode;edge?:GraphEdge;network:RelationsNetwork;graph:RelationGraph}>();
defineEmits<{close:[]}>();
const kindLabels={story:'Frise',period:'Période',event:'Événement'};
const orphanId=`relation-orphan-${useId()}`;
const nodeTitle=(id:string)=>props.graph.nodes.find(node=>node.id===id)?.title??'';
const memberships=computed(()=>props.network.memberships.filter(m=>m.kind===props.node?.kind&&m.entityId===props.node?.entityId));
const orphan=computed(()=>!!props.node&&props.node.kind!=='story'&&!memberships.value.length);
const parents=computed(()=>{
  const ids=new Set(props.edge?.storyIds??(props.node?.kind==='story'
    ?props.network.links.filter(link=>link.type==='legacy'&&link.target===props.node?.entityId).map(link=>link.source)
    :memberships.value.map(m=>m.storyId)));
  return props.network.stories.filter(story=>ids.has(story.id)).map(story=>{
    const parentIds=new Set(memberships.value.filter(m=>m.storyId===story.id&&m.parentId).map(m=>m.parentId));
    const titles=props.network.periods.filter(period=>parentIds.has(period.id)).map(period=>period.title);
    return {...story,context:titles.length?uiFormat`Sous ${titles.join(', ')}`:''};
  });
});
</script>

<style scoped>
.relation-selection {display:flex;flex-direction:column;align-items:flex-start;gap:var(--spacing-sm);min-width:0;max-height:inherit;box-sizing:border-box;overflow-y:auto;overflow-wrap:anywhere;}
.relation-selection__heading,.relation-selection__actions {display:flex;flex-shrink:0;justify-content:space-between;gap:var(--spacing-sm);width:100%;}
.relation-selection__heading {align-items:flex-start;}
.relation-selection__actions {align-items:center;}
.relation-selection__heading h3 {margin:0;font:var(--type-panel-title);}
.relation-selection__caption {margin:0;flex-shrink:0;color:var(--color-text-secondary);font:var(--type-meta);}
.relation-selection__parents {display:flex;flex-direction:column;gap:var(--spacing-xs);margin:0;padding:0;width:100%;min-height:0;overflow-y:auto;list-style:none;}
.relation-selection__parents li {display:flex;flex-direction:column;align-items:flex-start;min-width:0;}
</style>
