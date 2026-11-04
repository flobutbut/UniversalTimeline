<template>
  <ModalShell :title="mode === 'parent' ? 'Choisir la frise parente' : 'Ajouter un point d’entrée'" height="auto" :busy="busy" @close="$emit('close')">
    <p class="parent-picker__hint">{{ mode === 'parent'
      ? 'Choisissez la frise parente et un emplacement : période ou racine de la frise.'
      : 'Choisissez une frise et la période ou la racine depuis laquelle celle-ci sera accessible.' }}</p>
    <p v-if="error" role="alert" class="parent-picker__error">{{ error }}</p>
    <BaseSelect v-model="parentId" :label="mode === 'parent' ? 'Frise parente' : 'Frise source'" placeholder="Rechercher une frise…"
      :options="options" searchable no-results-text="Aucune autre frise disponible" :disabled="busy" />
    <p v-if="loading" role="status" class="parent-picker__hint">Chargement des périodes…</p>
    <p v-else-if="loadError" role="alert" class="parent-picker__error">
      {{ loadError }} <Button variant="tertiary" size="sm" type="button" @click="loadParent">Réessayer</Button>
    </p>
    <BaseSelect v-if="parentId" v-model="periodId" :label="mode === 'parent' ? 'Ancre' : 'Période de rattachement'"
      placeholder="Choisir une période…" :options="periodOptions" searchable
      :no-results-text="parent?.periods.length ? 'Toutes les périodes sont déjà liées à cette frise' : 'Cette frise ne contient aucune période'" :disabled="busy || loading || !!loadError"
      :hint="suggestedLabel ? `Proposée : « ${suggestedLabel} », qui contient les dates de cette frise.` : undefined" />
    <template #footer-right>
      <Button :disabled="busy || loading || !!loadError || !parentId || !periodId" @click="submit">{{ mode === 'parent' ? 'Rattacher' : 'Ajouter' }}</Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import BaseSelect from '@/components/base/Select.vue';
import Button from '@/components/base/Button.vue';
import { useParentStoryDetail } from '@/composables/useParentStoryDetail';
import { suggestAnchorPeriod, type YearsRange } from '@/lib/storyArchitecture';
import type { StorySummary, ParentStorySummary } from '@/types/database';

const props = withDefaults(defineProps<{
  candidates: StorySummary[]; existingParents?: ParentStorySummary[]; busy?: boolean; error?: string | null;
  /** Rattachement à la frise parente plutôt qu’un point d’entrée. */ mode?: 'entry' | 'parent';
  /** Bornes du contenu de la frise : la période qui les contient est proposée. */ subject?: YearsRange | null;
}>(), { mode: 'entry', subject: null });
const emit = defineEmits<{ close: []; confirm: [parentId: string, periodId: string | null] }>();
const parentId = ref<string | null>(null);
const periodId = ref<string | null>(null);
const { parent, loading, error: loadError, load: loadParent } = useParentStoryDetail(parentId);
const options = computed(() => props.candidates.map(story => ({ value: story.id, label: story.title.fr || story.title.en })));
const suggestedId = computed(() => parent.value ? suggestAnchorPeriod(parent.value.periods, props.subject, Date.now()) : null);
const periodOptions = computed(() => {
  if(!parent.value || parent.value.id!==parentId.value || loading.value)return [];
  const linked = new Set(props.mode === 'entry' ? props.existingParents?.find(story => story.id === parentId.value)?.anchors.filter(anchor => anchor.type === 'period').map(anchor => anchor.id) : []);
  const rootLinked=props.mode==='entry'&&props.existingParents?.find(story=>story.id===parentId.value)?.atRoot;
  return [...(!rootLinked?[{value:'__story_root__',label:'Racine de la frise'}]:[]),...(parent.value?.periods ?? []).filter(period => !linked.has(period.id))
    .map(period => ({ value: period.id, label: `${period.label.fr || period.label.en}${period.id === suggestedId.value ? ' (proposée)' : ''}` }))];
});
const suggestedLabel = computed(() => periodOptions.value.find(option => option.value === suggestedId.value)?.label.replace(/ \(proposée\)$/, ''));
watch(suggestedId, id => { if (id && !periodId.value && periodOptions.value.some(option => option.value === id)) periodId.value = id; });
watch(parentId, () => { periodId.value = null; });
function submit() {
  if (props.busy || loading.value || loadError.value || !parentId.value || !periodId.value) return;
  if (!props.candidates.some(story => story.id === parentId.value) || !periodOptions.value.some(period => period.value === periodId.value)) return;
  emit('confirm', parentId.value, periodId.value==='__story_root__'?null:periodId.value);
}
</script>

<style scoped>
.parent-picker__hint { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); }
.parent-picker__error { color: var(--color-status-error-foreground); }
.parent-picker__error button { margin-left: var(--spacing-sm); }
</style>
