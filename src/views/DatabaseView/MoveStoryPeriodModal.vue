<template>
  <ModalShell title="Déplacer la période" height="auto" :busy="busy" @close="$emit('close')">
    <p>Choisissez sa place dans cette frise.</p>
    <Select v-model="parentId" label="Période parente" :options="options" :disabled="busy" searchable />
    <p v-if="error" role="alert">{{ error }}</p>
    <template #footer-right><Button :disabled="busy || parentId === initialParent" @click="$emit('confirm', parentId || null)">Déplacer</Button></template>
  </ModalShell>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import { collectStoryPeriodSubtreeIds } from '@/lib/storyPeriodFinderColumns';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import type { Period } from '@/types/database';
const props = defineProps<{ periodId: string; periods: Period[]; busy?: boolean; error?: string | null }>();
defineEmits<{ close: []; confirm: [parentId: string | null] }>();
const initialParent = getStoryPeriodParentId(props.periods.find(p => p.id === props.periodId) ?? {}) ?? '';
const parentId = ref(initialParent);
const options = computed(() => {
  const excluded = new Set(collectStoryPeriodSubtreeIds(props.periods, props.periodId));
  return [{ value: '', label: 'Racine de la frise' }, ...props.periods.filter(p => !excluded.has(p.id))
    .sort((a,b) => a.label.fr.localeCompare(b.label.fr, 'fr'))
    .map(p => ({ value: p.id, label: p.label.fr || p.label.en }))];
});
</script>
