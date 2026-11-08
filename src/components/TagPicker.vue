<template>
  <fieldset class="tag-picker" :disabled="disabled || loading">
    <legend class="tag-picker__legend">{{ label }} <span class="tag-picker__hint">{{ MAX_TAGS }} au maximum, le premier est le principal</span></legend>
    <ol v-if="selected.length" class="tag-picker__selected" aria-label="Tags choisis">
      <li v-for="(tag, index) in selected" :key="tag.id" class="tag-picker__item">
        <Tag :label="tagLabel(tag)" removable :variant="index === 0 ? 'accent' : 'neutral'" :disabled="disabled" @remove="toggle(tag.id)" />
        <span v-if="index === 0" class="tag-picker__hint">Principal</span>
        <button v-else type="button" class="tag-picker__make-primary" :disabled="disabled" :aria-label="`Définir ${tagLabel(tag)} comme tag principal`" @click="makePrimary(tag.id)">Rendre principal</button>
      </li>
    </ol>
    <p v-if="loading" class="tag-picker__hint" role="status">Chargement des tags…</p>
    <div v-for="family in families" v-else :key="family.id" class="tag-picker__family" role="group" :aria-label="family.label">
      <p class="tag-picker__family-label" aria-hidden="true">{{ family.label }}</p>
      <div class="tag-picker__options">
        <button v-for="tag in family.tags" :key="tag.id" type="button" class="tag-picker__option" :aria-pressed="modelValue.includes(tag.id)"
          :disabled="disabled || (!modelValue.includes(tag.id) && modelValue.length >= MAX_TAGS)" :title="tag.description" @click="toggle(tag.id)">{{ tagLabel(tag) }}</button>
      </div>
    </div>
    <p v-if="error" class="tag-picker__error" role="alert">{{ error }}</p>
  </fieldset>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import Tag from '@/components/base/Tag.vue';
import { groupTagsByFamily, MAX_TAGS, tagLabel } from '@/lib/tags';
import type { GridTag } from '@/services/TagService';
const props = withDefaults(defineProps<{ modelValue: string[]; options: readonly GridTag[]; label?: string; loading?: boolean; disabled?: boolean; error?: string }>(), { label: 'Tags' });
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const families = computed(() => groupTagsByFamily(props.options.filter(tag => tag.parentId === null)));
const selected = computed(() => props.modelValue.flatMap(id => props.options.find(tag => tag.id === id) ?? []));
function toggle(id: string) {
  if (props.modelValue.includes(id)) emit('update:modelValue', props.modelValue.filter(value => value !== id));
  else if (props.modelValue.length < MAX_TAGS) emit('update:modelValue', [...props.modelValue, id]);
}
function makePrimary(id: string) { emit('update:modelValue', [id, ...props.modelValue.filter(value => value !== id)]); }
</script>
<style scoped>
.tag-picker { display: flex; flex-direction: column; gap: var(--spacing-sm); min-width: 0; margin: 0; padding: 0; border: 0; }
.tag-picker__legend { padding: 0; font-size: var(--font-size-sm); font-weight: 500; }
.tag-picker__hint { color: var(--color-text-secondary); font-size: var(--font-size-xs); font-weight: 400; }
.tag-picker__selected { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin: 0; padding: 0; list-style: none; }
.tag-picker__item { display: inline-flex; align-items: center; gap: var(--spacing-xs); min-width: 0; max-width: 100%; }
.tag-picker__make-primary { padding: 0; border: 0; background: transparent; color: var(--color-text-link); font: inherit; font-size: var(--font-size-xs); text-decoration: underline; cursor: pointer; }
.tag-picker__make-primary:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 1px; }
.tag-picker__family { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.tag-picker__family-label { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.tag-picker__options { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.tag-picker__option { min-height: 28px; padding: 2px var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: transparent; color: var(--color-text-primary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; }
.tag-picker__option:hover:not(:disabled) { background: var(--color-interaction-hover); }
.tag-picker__option[aria-pressed="true"] { background: var(--color-interaction-selected); border-color: transparent; color: var(--color-text-on-selected); }
.tag-picker__option:disabled { opacity: .5; cursor: not-allowed; }
.tag-picker__option:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 1px; }
.tag-picker__error { margin: 0; color: var(--color-status-error-foreground); font-size: var(--font-size-sm); }
</style>
