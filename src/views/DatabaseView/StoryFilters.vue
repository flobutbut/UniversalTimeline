<template>
  <div ref="root" class="story-filters" @keydown.esc.stop="close">
    <Button ref="trigger" variant="tertiary" size="sm" icon-only :pressed="open || modelValue !== 'all'" aria-label="Filtrer les frises" :aria-expanded="open" @click="open = !open"><template #icon><DesignIcon name="filter" /></template></Button>
    <div v-if="open" class="story-filters__panel" role="group" aria-label="Visibilité des frises">
      <label v-for="option in options" :key="option.value"><input type="radio" :name="id" :value="option.value" :checked="modelValue === option.value" @change="$emit('update:modelValue', option.value)" />{{ option.label }}</label>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import { generateDomUid } from '@/utils/generateDomUid';
defineProps<{ modelValue: 'all' | 'public' | 'private' }>();
defineEmits<{ 'update:modelValue': [value: 'all' | 'public' | 'private'] }>();
const id = generateDomUid('story-filter');
const root = ref<HTMLElement>();
const trigger = ref<{ $el: HTMLButtonElement }>();
const open = ref(false);
const options = [{ value: 'all', label: 'Toutes les frises' }, { value: 'public', label: 'Frises publiques' }, { value: 'private', label: 'Frises privées' }] as const;
function close() { open.value = false; trigger.value?.$el.focus(); }
function onPointer(event: PointerEvent) { if (event.target instanceof Node && !root.value?.contains(event.target)) open.value = false; }
onMounted(() => document.addEventListener('pointerdown', onPointer));
onUnmounted(() => document.removeEventListener('pointerdown', onPointer));
</script>
<style scoped>
.story-filters { position: relative; flex-shrink: 0; }
.story-filters__panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: var(--z-index-dropdown); min-width: 190px; background: var(--color-surface-raised); padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); }
.story-filters__panel label { display: flex; align-items: center; gap: 8px; padding: 8px; font-size: var(--font-size-sm); cursor: pointer; white-space: nowrap; }
.story-filters__panel input { accent-color: var(--color-text-link); }
</style>
