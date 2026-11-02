<template>
  <ModalShell title="Ajouter un point d’entrée" height="auto" :busy="busy" @close="$emit('close')">
    <p class="parent-picker__hint">Choisissez une frise et la période depuis laquelle celle-ci sera accessible.</p>
    <p v-if="error" role="alert" class="parent-picker__error">{{ error }}</p>
    <BaseSelect v-model="parentId" label="Frise source" placeholder="Rechercher une frise…"
      :options="options" searchable no-results-text="Aucune autre frise disponible" :disabled="busy" />
    <p v-if="loading" role="status" class="parent-picker__hint">Chargement des périodes…</p>
    <p v-else-if="loadError" role="alert" class="parent-picker__error">
      {{ loadError }} <Button variant="tertiary" size="sm" type="button" @click="loadParent">Réessayer</Button>
    </p>
    <BaseSelect v-if="parentId" v-model="periodId" label="Période de rattachement"
      placeholder="Choisir une période…" :options="periodOptions" searchable
      :no-results-text="parent?.periods.length ? 'Toutes les périodes sont déjà liées à cette frise' : 'Cette frise ne contient aucune période'" :disabled="busy || loading || !!loadError" />
    <template #footer-right>
      <Button :disabled="busy || loading || !!loadError || !parentId || !periodId" @click="submit">Ajouter</Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import BaseSelect from '@/components/base/Select.vue';
import Button from '@/components/base/Button.vue';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story, StorySummary, ParentStorySummary } from '@/types/database';

const props = defineProps<{ candidates: StorySummary[]; existingParents?: ParentStorySummary[]; busy?: boolean; error?: string | null }>();
const emit = defineEmits<{ close: []; confirm: [parentId: string, periodId: string] }>();
const parentId = ref<string | null>(null);
const periodId = ref<string | null>(null);
const parent = ref<Story | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
let controller: AbortController | null = null;
onScopeDispose(() => controller?.abort());
const options = computed(() => props.candidates.map(story => ({ value: story.id, label: story.title.fr || story.title.en })));
const periodOptions = computed(() => {
  const linked = new Set(props.existingParents?.find(story => story.id === parentId.value)?.anchors.filter(anchor => anchor.type === 'period').map(anchor => anchor.id));
  return (parent.value?.periods ?? []).filter(period => !linked.has(period.id)).map(period => ({ value: period.id, label: period.label.fr || period.label.en }));
});

async function loadParent() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  const id = parentId.value;
  parent.value = null;
  periodId.value = null;
  loadError.value = null;
  loading.value = !!id;
  if (!id) return;
  try {
    const detail = await StoryApiService.getInstance().getStory(id, { signal });
    if (!signal.aborted) parent.value = detail;
  } catch {
    if (!signal.aborted) loadError.value = 'Impossible de charger les périodes de cette frise.';
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}
watch(parentId, loadParent);
function submit() {
  if (props.busy || loading.value || loadError.value || !parentId.value || !periodId.value) return;
  if (!props.candidates.some(story => story.id === parentId.value) || !periodOptions.value.some(period => period.value === periodId.value)) return;
  emit('confirm', parentId.value, periodId.value);
}
</script>

<style scoped>
.parent-picker__hint { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); }
.parent-picker__error { color: var(--color-status-error-foreground); }
.parent-picker__error button { margin-left: var(--spacing-sm); }
</style>
