<template>
  <ModalShell :title="uiText('Déplacer la frise associée')" height="auto" :busy="busy" @close="$emit('close')">
    <p>{{ uiText(label) }}</p>
    <Select v-model="parentId" :label="uiText('Période parente')" :options="options" :disabled="busy" searchable />
    <p v-if="error" role="alert">{{ uiText(error) }}</p>
    <template #footer-right><Button :disabled="busy || parentId === (fromParentId ?? '')" @click="$emit('confirm', parentId || null)">{{ uiText("Déplacer") }}</Button></template>
  </ModalShell>
</template>
<script setup lang="ts">
import { localizedText, uiText } from '@/i18n';
import { computed, ref } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Select from '@/components/base/Select.vue';
import Button from '@/components/base/Button.vue';
import type { Period } from '@/types/database';
const props = defineProps<{ label: string; fromParentId: string | null; periods: Period[]; busy?: boolean; error?: string | null }>();
defineEmits<{ close: []; confirm: [parentId: string | null] }>();
const parentId = ref(props.fromParentId ?? '');
const options = computed(() => [{ value: '', label: 'Racine de la frise' }, ...props.periods.map(period => ({ value: period.id, label: localizedText(period.label) }))]);
</script>
