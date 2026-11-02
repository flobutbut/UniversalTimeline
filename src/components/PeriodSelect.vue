<template>
  <SelectShell
    v-bind="$attrs"
    v-model:open="isOpen"
    class="period-select"
    :label="label"
    :error="error"
    :hint="hint"
    :required="required"
    :compact="compact"
    :id="id"
    :dropdown-id="`${id}-panel`"
    dropdown-role="dialog"
    dropdown-label="Choisir une période"
    dropdown-class="base-select__dropdown--tall"
    highlight-open-trigger
    @escape="restoreTriggerFocus"
  >
    <template #trigger>
      <button
        :id="id"
        ref="triggerRef"
        type="button"
        class="base-select__trigger"
        :class="{ 'base-select__trigger--disabled': disabled }"
        :disabled="disabled"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? `${id}-panel` : undefined"
        :aria-invalid="!!error || undefined"
        :aria-describedby="[`${id}-value`, error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ')"
        aria-haspopup="dialog"
        :aria-label="label || 'Choisir une période'"
        @click="togglePanel"
      >
        <span class="base-select__value">
          <span :id="`${id}-value`" class="base-select__selected-text period-select__summary">{{ summary }}</span>
        </span>
        <span class="base-select__indicators">
          <Icon icon="mdi:chevron-down" class="base-select__arrow" :class="{ 'base-select__arrow--open': isOpen }" :width="compact ? 18 : 20" :height="compact ? 18 : 20" aria-hidden="true" />
        </span>
      </button>
    </template>

    <template #dropdown>
      <div class="base-select__search-wrapper period-select__toolbar">
        <input
          ref="searchRef"
          v-model="search"
          type="search"
          class="base-select__search"
          :placeholder="'Rechercher dans le catalogue…'"
          aria-label="Rechercher une période"
        />
        <Button variant="tertiary" size="sm" type="button" @click="clearSelection">Toutes les périodes</Button>
      </div>
      <button v-if="currentParentId" type="button" class="base-select__option period-select__back" @click="goBack">
        <Icon icon="mdi:chevron-left" width="16" height="16" aria-hidden="true" />
        <span class="base-select__option-text">{{ currentParent?.label.fr ?? 'Sous-périodes' }}</span>
      </button>
      <div v-if="loading" role="status" class="base-select__no-results">Chargement…</div>
      <div v-else-if="loadError" role="alert" class="base-select__no-results">
        {{ loadError }} <button type="button" @click="retry">Réessayer</button>
      </div>
      <ul v-else-if="periods.length" class="base-select__options period-select__list" aria-label="Périodes disponibles">
        <li v-for="period in periods" :key="period.id" class="base-select__option" :class="{ 'base-select__option--selected': period.id === modelValue }">
          <button type="button" class="period-select__choose" :aria-pressed="period.id === modelValue" @click="selectPeriod(period.id)">
            <i class="base-select__option-check" :class="{ 'base-select__option-check--hidden': period.id !== modelValue }" aria-hidden="true">✓</i>
            <span class="base-select__option-text">{{ formatSelectListPeriodLine(period) }}</span>
          </button>
          <button v-if="hasChildren(period)" type="button" class="period-select__drill" :aria-label="`Voir les sous-périodes de ${period.label.fr}`" @click="drillDown(period)">
            <Icon icon="mdi:chevron-right" width="18" height="18" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <div v-else class="base-select__no-results">{{ search.trim() ? 'Aucun résultat' : currentParentId ? 'Aucune sous-période' : 'Aucune période' }}</div>
    </template>
  </SelectShell>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import { computed, nextTick, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import SelectShell from './base/SelectShell.vue';
import Button from './base/Button.vue';
import { usePeriodSelect } from '@/composables/usePeriodSelect';
import { formatSelectListPeriodLine } from '@/lib/selectListPeriodHelpers';
import { generateDomUid } from '@/utils/generateDomUid';

const props = withDefaults(defineProps<{
  modelValue: string | null;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  searchRemote?: boolean;
  excludeId?: string | null;
}>(), { disabled: false, required: false, compact: false, id: () => generateDomUid('period-select') });
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();
const isOpen = ref(false);
const triggerRef = ref<HTMLButtonElement>();
const searchRef = ref<HTMLInputElement>();
const {
  periods, selectedPeriod, currentParent, currentParentId, search, loading, error: loadError,
  rememberSelection, initialize, drillDown, goBack, hasChildren, cancel, resetNavigation, retry,
} = usePeriodSelect(() => props.modelValue, { remote: () => props.searchRemote ?? false, excludeId: () => props.excludeId ?? null });
const summary = computed(() => selectedPeriod.value ? formatSelectListPeriodLine(selectedPeriod.value) : props.placeholder ?? 'Toutes les périodes');

function restoreTriggerFocus() { void nextTick(() => triggerRef.value?.focus()); }
async function openPanel() {
  if (props.disabled) return;
  isOpen.value = true;
  const loaded = await initialize();
  await nextTick();
  if (loaded && isOpen.value) searchRef.value?.focus();
}
function togglePanel() {
  if (props.disabled) return;
  if (isOpen.value) isOpen.value = false;
  else void openPanel();
}
function updateSelection(value: string) {
  emit('update:modelValue', value);
  emit('change', value);
  isOpen.value = false;
  restoreTriggerFocus();
}
function selectPeriod(id: string) { rememberSelection(id); updateSelection(id === props.modelValue ? '' : id); }
function clearSelection() { resetNavigation(); updateSelection(''); }
watch(isOpen, open => { if (!open) { cancel(); search.value = ''; } }, { flush: 'sync' });
watch(() => props.disabled, disabled => { if (disabled) isOpen.value = false; });
watch(() => props.modelValue, () => { if (isOpen.value) void initialize(); });
</script>

<style src="./period-select.css"></style>
