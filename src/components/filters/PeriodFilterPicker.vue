<template>
  <div>
    <p v-if="selectionError" role="alert" class="period-filter-error">{{ selectionError }} <Button variant="tertiary" size="sm" type="button" @click="$emit('retry')">Réessayer</Button></p>
    <FilterValueList :model-value="modelValue ? [modelValue] : ['']" :options="options" label="Périodes" searchable :filter-locally="false"
    v-model:search="search" search-placeholder="Rechercher une période…" :loading="loading || pending" :error="error"
    @retry="retry" @update:model-value="values => choose(values[0] ?? '')" />
  </div>
</template>
<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import { computed, onMounted } from 'vue';
import FilterValueList from './FilterValueList.vue';
import { usePeriodSelect } from '@/composables/usePeriodSelect';
import { formatSelectListPeriodLine } from '@/lib/selectListPeriodHelpers';
const props = defineProps<{ modelValue: string | null; pending?: boolean; selectionError?: string | null }>();
const emit = defineEmits<{ 'update:modelValue': [id: string]; retry: [] }>();
const { periods, search, loading, error, initialize, rememberSelection, retry } = usePeriodSelect(() => props.modelValue, { remote: () => true });
const options = computed(() => [{ value: '', label: 'Toutes les périodes' }, ...periods.value.map(period => ({ value: period.id, label: formatSelectListPeriodLine(period) }))]);
function choose(id: string) { if (id) rememberSelection(id); emit('update:modelValue', id); }
onMounted(initialize);
</script>
<style scoped>
.period-filter-error { margin: 0; padding: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-status-error-foreground); white-space: normal; }
</style>
