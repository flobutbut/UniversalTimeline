<template>
  <div class="navigation-prototype">
    <div class="navigation-prototype__tools">
      <strong>{{ uiText("Prototype de navigation") }}</strong>
      <Select compact :label="uiText('Cas à tester')" :model-value="caseId" :options="caseOptions" @update:model-value="selectCase" />
      <Button variant="ghost" size="sm" @click="reset(caseId)">{{ uiText("Recommencer ce cas") }}</Button>
      <Button variant="tertiary" size="sm" :to="{ name: 'timeline', query: {story:currentStory.id,view:'overview'} }">{{ uiText("Voir la frise actuelle") }}</Button>
    </div>
    <p class="navigation-prototype__hint">{{ currentCase.hint }}</p>
    <div v-if="caseId === 'origines'" class="navigation-prototype__origins">
      <Button variant="tertiary" size="sm" @click="enterClimate('earth')">{{ uiText("Depuis Terre") }}</Button>
      <Button variant="tertiary" size="sm" @click="enterClimate('geology')">{{ uiText("Depuis la racine de Géologie") }}</Button>
    </div>
    <div class="navigation-prototype__header">
      <div class="navigation-prototype__breadcrumbs">
        <StoryBreadcrumb :items="storyBreadcrumb" :label="uiText('Fil d’Ariane des frises')" @navigate="returnToStory" />
        <StoryBreadcrumb :items="periodBreadcrumb" @navigate="index => openPeriod(currentStory.periods.find(p => p.id === periodBreadcrumb[index]?.id)!)" />
      </div>
      <AssociatedStoriesBadge v-if="visibleRootStories.length" :story-id="currentStory.id" period-id="prototype-root" :period-label="localizedText(currentStory.title)" :stories="visibleRootStories" @select="id => enterStory(id)" />
    </div>
    <div ref="viewport" class="navigation-prototype__viewport"
      :class="{ 'navigation-prototype__viewport--waiting': phase === 'waiting' }" :inert="phase !== 'idle' || undefined">
      <PeriodGrid ref="grid" :key="currentStory.id" :periods="displayedPeriods" :events="events" :loading="false"
        :current-period="currentPeriod" :parent-period="parentPeriod" :previous-period="previousPeriod" :next-period="nextPeriod"
        :overview-navigation="!!contextBar" :story-bounds="bounds" :current-story-id="currentStory.id" :load-story-details="loadStory" period-tooltips
        @period-click="openPeriod" @go-back="goBack" @navigate-period="move" @story-select="enterStory">
        <template v-if="contextBar" #overview-context>
          <PeriodCard variant="parent" :period="contextBar" :is-selected="false" @back="goBack">
            <template #title-actions>
              <span class="navigation-prototype__context-label">{{ uiText(!returns.length ? 'Période de référence' : 'Retour') }}</span>
              <AssociatedStoriesBadge :story-id="currentStory.id" :period-id="contextBar.id" :period-label="localizedText(contextBar.label)" :stories="contextStories"
                @select="id => enterStory(id, reference?.anchor ?? undefined)" />
            </template>
          </PeriodCard>
        </template>
      </PeriodGrid>
    </div>
    <div class="navigation-prototype__footer">{{ uiText("Copie locale des données du 4 novembre · les périodes de référence sont retirées des récits cibles · aucune écriture en base.") }}</div>
  </div>
</template>

<script setup lang="ts">
import { localizedText, uiText } from '@/i18n';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import PeriodCard from '@/views/HomeView/PeriodCard.vue';
import AssociatedStoriesBadge from '@/views/HomeView/AssociatedStoriesBadge.vue';
import { useTimelineSlide } from '@/composables/useTimelineSlide';
import { prototypeCases, useNavigationPrototype, type PrototypeCaseId } from './model';

const { caseId,position,returns,currentStory,currentPeriod,parentPeriod,displayedPeriods,events,bounds,rootStories,contextBar,contextStories,reference,
  previousPeriod,nextPeriod,storyBreadcrumb,periodBreadcrumb,reset,openPeriod,enterStory,goBack,adjacent,returnToStory,enterClimate,loadStory }=useNavigationPrototype();
const route=useRoute(),router=useRouter();
const currentCase=computed(()=>prototypeCases.find(c=>c.id===caseId.value)!);
const visibleRootStories=computed(()=>rootStories.value.filter(story=>!contextBar.value||!contextStories.value.some(other=>other.id===story.id)));
const caseOptions=prototypeCases.map(c=>({value:c.id,label:c.label}));
function selectCase(value:unknown) {if(typeof value==='string'&&prototypeCases.some(c=>c.id===value))void router.replace({query:{cas:value}});}
watch(()=>route.query.cas,value=>reset(prototypeCases.some(c=>c.id===value)?value as PrototypeCaseId:'terre'),{immediate:true});
const viewport=ref<HTMLElement|null>(null),grid=ref<InstanceType<typeof PeriodGrid>|null>(null);
const {phase,prepare}=useTimelineSlide(()=>viewport.value,()=>grid.value?.getSlideLayers()??[],
  ()=>({storyId:position.value.storyId,periodId:position.value.periodId??position.value.context?.periodId}),()=>false,()=>null);
function move(direction:'previous'|'next') {
  const next=direction==='previous'?previousPeriod.value:nextPeriod.value;if(!next)return;
  prepare(direction,next.id);adjacent(direction);
}
</script>

<style scoped>
.navigation-prototype { display:flex; flex-direction:column; min-height:0; height:100%; }
.navigation-prototype__tools { display:flex; flex-wrap:wrap; align-items:center; gap:var(--spacing-sm); padding:var(--spacing-sm) var(--spacing-md); border-bottom:1px solid var(--color-border-default); }
.navigation-prototype__tools :deep(.base-select) { width:260px; flex:0 1 260px; min-width:200px; max-width:100%; }
.navigation-prototype__hint { margin:0; padding:var(--spacing-xs) var(--spacing-md); font-size:var(--font-size-sm); color:var(--color-text-secondary); }
.navigation-prototype__header { display:flex; align-items:center; gap:var(--spacing-sm); padding-right:var(--spacing-md); flex-shrink:0; }
.navigation-prototype__breadcrumbs { flex:1; min-width:0; }
.navigation-prototype__breadcrumbs > .story-breadcrumb + .story-breadcrumb { padding-top:0; }
.navigation-prototype__origins { display:flex; flex-wrap:wrap; gap:var(--spacing-sm); padding:var(--spacing-xs) var(--spacing-md); }
.navigation-prototype__viewport { flex:1; min-height:0; overflow:hidden; position:relative; }
.navigation-prototype__viewport > .period-grid { height:100%; }
.navigation-prototype__viewport--waiting > .period-grid { visibility:hidden; }
.navigation-prototype__context-label { font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-right:var(--spacing-sm); }
.navigation-prototype__footer { flex-shrink:0; padding:var(--spacing-xs) var(--spacing-md); font-size:var(--font-size-xs); color:var(--color-text-secondary); }
</style>
