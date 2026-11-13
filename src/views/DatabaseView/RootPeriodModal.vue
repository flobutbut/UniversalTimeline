<template>
  <ModalShell :title="uiText('Changer la racine')" height="auto" :busy="busy" @close="$emit('close')">
    <p class="root-period-hint">{{ uiText("Choisissez la période racine de cette frise. Les sous-périodes déjà associées sous cette racine sont conservées ; les autres périodes sont retirées de la frise. Les événements sont conservés.") }}</p>
    <p v-if="error" role="alert" class="root-period-error">{{ uiText(error) }}</p>
    <PeriodSelect v-model="periodId" :placeholder="uiText(periodId === currentRootId ? currentRootLabel : 'Choisir une période')" :label="uiText('Période racine')" search-remote :disabled="busy" />
    <template #footer-right>
      <Button :disabled="busy || !periodId || periodId === currentRootId" @click="periodId && $emit('confirm', periodId)">{{ uiText("Choisir cette racine") }}</Button>
    </template>
  </ModalShell>
</template>
<script setup lang="ts">
import { uiText } from "@/i18n";
import { ref } from 'vue';
import ModalShell from '@/components/base/ModalShell.vue';
import Button from '@/components/base/Button.vue';
import PeriodSelect from '@/components/PeriodSelect.vue';
const props = defineProps<{ currentRootId: string | null; currentRootLabel?: string; busy?: boolean; error?: string | null }>();
defineEmits<{ close: []; confirm: [id: string] }>();
const periodId = ref(props.currentRootId);
</script>
<style scoped>
.root-period-hint { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); margin-bottom: var(--spacing-lg); }
.root-period-error { color: var(--color-status-error-foreground); font-size: var(--font-size-sm); }
</style>
