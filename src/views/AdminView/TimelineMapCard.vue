<template>
  <div ref="root" class="timeline-map-card" :class="{'timeline-map-card--selected':selectedHere,'timeline-map-card--end-title':alignTitleEnd}" :data-story-id="story.id" :aria-label="`Frise : ${story.title}`">
    <button type="button" class="timeline-map-card__title" :aria-expanded="childCount?!collapsed:undefined"
      @click="childCount?emit('toggle',story.id):emit('select',graphKey('story',story.id))">
      {{ story.title }}
    </button>
    <div class="timeline-map-card__preview">
      <StoryTimeline v-if="content && (periods.length || events.length)" compact proportional :time-bounds="bounds??undefined" :layout-bounds="fullBounds??undefined" :reference-time="referenceTime" :periods="periods" :events="events"
        :selected-period-id="selected?.kind==='period'?selected.entityId:null" :selected-event-id="selected?.kind==='event'?selected.entityId:null" />
      <span v-else class="timeline-map-card__empty" :class="{'timeline-map-card__empty--error':!content}" :role="!content?'status':undefined">{{ content?'Frise vide':'Aperçu indisponible' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import type { RelationStory, RelationsContent } from '@/types/adminRelations';
import { graphKey, type GraphNode } from './relationGraph';
import type { TimelineBounds } from './temporalTimelineMap';

const props=defineProps<{
  story:RelationStory; content?:RelationsContent; showEvents:boolean; selected?:GraphNode;
  childCount:number; collapsed:boolean; bounds?:TimelineBounds|null; fullBounds?:TimelineBounds|null; referenceTime?:number; alignTitleEnd?:boolean;
}>();
const emit=defineEmits<{select:[id:string];toggle:[id:string];resize:[height:number]}>();
const root=ref<HTMLElement>();
let observer:ResizeObserver|undefined;
function reportHeight(height:number) {if(height>0)emit('resize',height);}
onMounted(()=>{
  if (!root.value) return;
  reportHeight(root.value.offsetHeight);
  observer=new ResizeObserver(entries=>{
    const entry=entries.find(item=>item.target===root.value);
    if (entry) reportHeight(entry.borderBoxSize?.[0]?.blockSize??entry.contentRect.height);
  });
  observer.observe(root.value);
});
onBeforeUnmount(()=>observer?.disconnect());
const periods=computed(()=>(props.content?.periods??[]).map(period=>({
  id:period.id,label:{fr:period.title,en:period.title},startDate:period.startDate,endDate:period.endDate,storyParentId:period.parentId,
})));
const events=computed(()=>props.showEvents?(props.content?.events??[]).map(event=>({
  id:event.id,label:event.title,date:event.date,importance:event.importance,
})):[]);
const selectedHere=computed(()=>props.selected && (props.selected.kind==='story'
  ?props.selected.entityId===props.story.id
  :props.selected.kind==='period'?periods.value.some(period=>period.id===props.selected!.entityId)
    :(props.content?.events??[]).some(event=>event.id===props.selected!.entityId)));
</script>

<style scoped>
.timeline-map-card {flex-shrink:0;color:var(--color-text-primary);}
.timeline-map-card__title {display:block;max-width:400px;width:max-content;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 var(--spacing-sm);padding:0;border:0;background:transparent;text-align:left;font:var(--type-compact);color:inherit;cursor:pointer;}
.timeline-map-card--end-title .timeline-map-card__title {margin-left:100%;transform:translateX(-100%);}
.timeline-map-card__title:hover,.timeline-map-card--selected .timeline-map-card__title {color:var(--color-text-link);}
.timeline-map-card__title:focus-visible {outline:2px solid var(--color-border-focus);outline-offset:2px;}
.timeline-map-card__preview {padding-block:var(--spacing-xs);background:var(--color-surface-default);border-radius:var(--radius-sm);outline:1px solid var(--color-border-light);outline-offset:-1px;}
.timeline-map-card__empty {display:block;color:var(--color-text-secondary);font:var(--type-meta);}
.timeline-map-card__empty--error {color:var(--color-status-error-foreground);}
</style>
