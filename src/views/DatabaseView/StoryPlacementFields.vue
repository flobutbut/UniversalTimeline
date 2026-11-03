<template>
  <div class="story-placement">
    <BaseSelect :model-value="modelValue.parentStoryId ?? ''" label="Frise parente" placeholder="Rechercher une frise…"
      :options="parentOptions" searchable no-results-text="Aucune frise modifiable" :disabled="disabled"
      :hint="modelValue.parentStoryId ? undefined : 'Sans frise parente, la frise reste un brouillon privé. Seule la racine de l’arbre n’a pas de parente.'"
      @update:model-value="selectParent" />
    <template v-if="modelValue.parentStoryId">
      <div class="story-placement__dates">
        <Input v-model="subjectStart" label="Début du sujet" placeholder="Ex. 1789, 3000 BCE, M66" size="sm" :disabled="disabled" />
        <Input v-model="subjectEnd" label="Fin du sujet" placeholder="Ex. 1815, TODAY" size="sm" :disabled="disabled" />
      </div>
      <p class="story-placement__hint">Facultatif, non enregistré : ces dates servent à proposer l’ancre.</p>
      <p v-if="loading" role="status" class="story-placement__hint">Chargement des périodes…</p>
      <p v-else-if="loadError" role="alert" class="story-placement__error">
        {{ loadError }} <Button variant="tertiary" size="sm" type="button" @click="loadParent">Réessayer</Button>
      </p>
      <BaseSelect v-else :model-value="modelValue.anchorPeriodId" label="Ancre" placeholder="Choisir une période…"
        :options="anchorOptions" searchable :required="anchorOptions.length > 0" :disabled="disabled"
        no-results-text="Cette frise ne contient aucune période"
        :hint="anchorHint" @update:model-value="selectAnchor" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseSelect from '@/components/base/Select.vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import { useParentStoryDetail } from '@/composables/useParentStoryDetail';
import { subjectRange, suggestAnchorPeriod } from '@/lib/storyArchitecture';
import type { SelectValue } from '@/lib/selectOptions';
import type { StorySummary } from '@/types/database';
import type { StoryPlacementDraft } from '@/types/editForm';

const props = defineProps<{ modelValue: StoryPlacementDraft; candidates: StorySummary[]; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: StoryPlacementDraft] }>();
const parentId = computed(() => props.modelValue.parentStoryId);
const { parent, loading, error: loadError, load: loadParent } = useParentStoryDetail(parentId);
const subjectStart = ref('');
const subjectEnd = ref('');
/** Un choix manuel n’est jamais remplacé par la proposition. */
const anchorChosen = ref(false);
const parentOptions = computed(() => [{ value: '', label: 'Aucune (brouillon privé)' },
  ...props.candidates.map(story => ({ value: story.id, label: story.title.fr || story.title.en }))]);
const suggestedId = computed(() => parent.value ? suggestAnchorPeriod(parent.value.periods, subjectRange(subjectStart.value, subjectEnd.value, Date.now()), Date.now()) : null);
const anchorOptions = computed(() => (parent.value?.periods ?? [])
  .map(period => ({ value: period.id, label: `${period.label.fr || period.label.en}${period.id === suggestedId.value ? ' (proposée)' : ''}` })));
const anchorHint = computed(() => {
  const suggested = parent.value?.periods.find(period => period.id === suggestedId.value);
  if (suggested) return `Proposée : « ${suggested.label.fr || suggested.label.en} », la période la plus précise qui contient les dates du sujet.`;
  if (subjectRange(subjectStart.value, subjectEnd.value, Date.now())) return 'Aucune période de la frise parente ne contient ces dates : choisissez la plus proche du sujet.';
  return 'La période de la frise parente sur laquelle cette frise sera proposée.';
});
const update = (patch: Partial<StoryPlacementDraft>) => {
  const next = { ...props.modelValue, ...patch };
  const ready = !loading.value && !loadError.value && !!parent.value;
  emit('update:modelValue', { ...next, complete: !next.parentStoryId || (ready && (!!next.anchorPeriodId || !parent.value!.periods.length)) });
};
function selectParent(value: SelectValue) {
  anchorChosen.value = false;
  update({ parentStoryId: typeof value === 'string' && value ? value : null, anchorPeriodId: null });
}
function selectAnchor(value: SelectValue) {
  anchorChosen.value = true;
  update({ anchorPeriodId: typeof value === 'string' && value ? value : null });
}
watch([suggestedId, parent, loading, loadError], () => {
  update(!anchorChosen.value && suggestedId.value ? { anchorPeriodId: suggestedId.value } : {});
});
</script>

<style scoped>
.story-placement { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.story-placement__dates { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--spacing-sm); }
.story-placement__hint { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.story-placement__error { margin: 0; color: var(--color-status-error-foreground); font-size: var(--font-size-sm); }
</style>
