<template>
  <div ref="root" class="relation-search" @focusout="onFocusout">
    <SearchInput ref="input" v-model="query" placeholder="Rechercher un objet" autocomplete="off"
      role="combobox" aria-autocomplete="list" :aria-expanded="visible" :aria-controls="visible?listId:undefined" :aria-activedescendant="activeId"
      @focus="show" @click="show" @keydown="onKeydown" />
    <PopoverSurface v-if="visible" class="relation-search__suggestions" :style="{maxHeight:`${popupHeight}px`}">
      <p class="relation-search__status" role="status">{{ results.length }} résultat{{ results.length===1?'':'s' }}</p>
      <div :id="listId" role="listbox" aria-label="Suggestions du réseau">
        <button v-for="(node,index) in results" :id="optionId(index)" :key="node.id" type="button" role="option" tabindex="-1"
          :aria-selected="cursor===index" :title="node.title" class="relation-search__option" :class="{'relation-search__option--active':cursor===index}"
          @pointerdown.prevent @mousedown.prevent @mouseenter="cursor=index" @click="choose(node)">
          <ItemSummary :title="node.title" :description="`${kindLabels[node.kind]} · ${node.subtitle}`" />
        </button>
      </div>
      <FeedbackState v-if="!results.length" kind="empty" layout="inline" message="Aucun objet ne correspond." />
    </PopoverSurface>
  </div>
</template>

<script setup lang="ts">
import {computed,nextTick,onMounted,onScopeDispose,ref,watch} from 'vue';
import SearchInput from '@/components/base/SearchInput.vue';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import ItemSummary from '@/components/base/ItemSummary.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import {useSuggestionNavigation} from '@/composables/useSuggestionNavigation';
import type {GraphNode} from './relationGraph';

const props=defineProps<{nodes:GraphNode[]}>();
const emit=defineEmits<{select:[id:string]}>();
const root=ref<HTMLElement>();const input=ref<InstanceType<typeof SearchInput>>();
const query=ref('');const open=ref(false);const popupHeight=ref(320);
const kindLabels={story:'Frise',period:'Période',event:'Événement'};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
const results=computed(()=>{
  const needle=normalize(query.value);
  if(!needle)return [];
  return props.nodes.filter(node=>normalize(node.title).includes(needle)).sort((a,b)=>
    Number(normalize(b.title).startsWith(needle))-Number(normalize(a.title).startsWith(needle))||a.title.localeCompare(b.title,'fr'));
});
const visible=computed(()=>open.value&&!!query.value.trim());
const {listId,optionId,cursor,activeId,move,current}=useSuggestionNavigation(()=>results.value,()=>visible.value);
function close(){open.value=false;}
function show(){open.value=!!query.value.trim();}
function choose(node:GraphNode){query.value=node.title;emit('select',node.id);input.value?.focus();close();}
function onKeydown(event:KeyboardEvent){
  if(event.isComposing)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();show();move(event.key==='ArrowDown'?1:-1);
  }else if(event.key==='Enter'&&visible.value){
    event.preventDefault();const node=current()??results.value[0];if(node)choose(node);
  }else if(event.key==='Escape'&&visible.value){
    event.preventDefault();event.stopPropagation();close();
  }else if(event.key==='Tab')close();
}
function onFocusout(event:FocusEvent){if(!(event.relatedTarget instanceof Node)||!root.value?.contains(event.relatedTarget))close();}
function onOutsidePointer(event:PointerEvent){if(event.target instanceof Node&&!root.value?.contains(event.target))close();}
function updatePopupHeight(){
  if(!visible.value||!root.value)return;
  const rect=root.value.getBoundingClientRect();
  const bottom=root.value.closest('.relation-canvas')?.getBoundingClientRect().bottom??window.innerHeight;
  const margin=parseFloat(getComputedStyle(root.value).getPropertyValue('--spacing-md'))||12;
  popupHeight.value=Math.max(0,Math.min(320,Math.min(bottom,window.innerHeight)-rect.bottom-margin));
}
watch(query,show,{flush:'sync'});
watch(visible,value=>{if(value)void nextTick(updatePopupHeight);});
onMounted(()=>{
  document.addEventListener('pointerdown',onOutsidePointer,true);
  window.addEventListener('resize',updatePopupHeight);
  document.addEventListener('scroll',updatePopupHeight,true);
});
onScopeDispose(()=>{
  document.removeEventListener('pointerdown',onOutsidePointer,true);
  window.removeEventListener('resize',updatePopupHeight);
  document.removeEventListener('scroll',updatePopupHeight,true);
});
</script>

<style scoped>
.relation-search {position:relative;min-width:0;}
.relation-search__suggestions {position:absolute;top:calc(100% + var(--spacing-xs));left:0;right:0;max-height:min(320px,40dvh);overflow-y:auto;z-index:var(--z-index-dropdown);}
.relation-search__status {margin:0;padding:var(--spacing-sm) var(--spacing-md);color:var(--color-text-secondary);font:var(--type-meta);}
.relation-search__option {display:flex;width:100%;min-width:0;padding:var(--spacing-md);border:0;border-bottom:1px solid var(--color-border-light);background:transparent;color:var(--color-text-primary);font:var(--type-compact);text-align:left;cursor:pointer;}
.relation-search__option > * {min-width:0;}
.relation-search__option:last-child {border-bottom:0;}
.relation-search__option:hover {background:var(--color-interaction-hover);}
.relation-search__option--active,.relation-search__option--active:hover {background:var(--color-interaction-selected);color:var(--color-text-on-selected);}
</style>
