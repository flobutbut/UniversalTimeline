<template>
  <li class="period-tree-branch" role="none">
    <div
      class="period-tree-row"
      :class="{ 'period-tree-row--selected': selectedId === node.id }"
      role="treeitem"
      :aria-expanded="hasChildren ? expanded : undefined"
      :style="{ paddingLeft: `calc(var(--spacing-md) + ${depth} * 14px)` }"
      tabindex="0"
      @click="onRowClick"
      @keydown.enter.prevent="onRowClick"
      @keydown.space.prevent="onRowClick"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="period-tree-toggle"
        :aria-label="expanded ? 'Réduire' : 'Développer'"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="16" class="period-tree-chevron" :class="{ 'is-open': expanded }" stroke-width="2" />
      </button>
      <span v-else class="period-tree-toggle-placeholder" aria-hidden="true" />

      <PeriodTreeRowBody :label="title" :dates-label="node.datesLabel" />

      <div class="period-tree-row__actions">
        <button
          class="period-tree-row__remove"
          type="button"
          aria-label="Retirer"
          @click.stop="emit('remove', node.id)"
        >
          <X :size="14" stroke-width="2" />
        </button>
      </div>
    </div>

    <ul
      v-show="expanded && hasChildren"
      class="period-tree-children"
      role="group"
    >
      <PeriodTreeBranch
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
        @select="emit('select', $event)"
        @remove="emit('remove', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, X } from 'lucide-vue-next';
import PeriodTreeRowBody from './PeriodTreeRowBody.vue';
import type { PeriodTreeNode } from '@/types/periodTree';

const props = defineProps<{
  node: PeriodTreeNode;
  selectedId: string | null;
  depth: number;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'remove', id: string): void;
}>();

const expanded = ref(true);

const hasChildren = computed(() => props.node.children.length > 0);

const title = computed(() => {
  const l = props.node.period.label;
  if (l && typeof l === 'object' && 'fr' in l) return (l as { fr?: string }).fr ?? '';
  return typeof l === 'string' ? l : props.node.id;
});

function onRowClick() {
  emit('select', props.node.id);
}
</script>

<style scoped>
.period-tree-branch {
  list-style: none;
  margin: 0;
  padding: 0;
}

.period-tree-row {
  display: flex;
  align-items: center;
  padding-top: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  padding-right: var(--spacing-md);
  cursor: pointer;
  color: var(--color-text);
  font-size: var(--font-size-base);
  background: var(--color-surface);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: background var(--transition-fast);
  border-top: 1px solid var(--color-border-light);
}

.period-tree > .period-tree-branch:first-child > .period-tree-row {
  border-top: none;
}

.period-tree-children .period-tree-branch:first-child > .period-tree-row {
  border-top: 1px solid var(--color-border-light);
}

.period-tree-row:hover {
  background: var(--color-surface-hover);
}

.period-tree-row--selected {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.period-tree-toggle,
.period-tree-toggle-placeholder {
  flex-shrink: 0;
  width: calc(var(--spacing-xl) + var(--spacing-xs));
  height: calc(var(--spacing-xl) + var(--spacing-xs));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: calc(var(--spacing-xs) / 2);
}

.period-tree-toggle {
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.period-tree-toggle:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.period-tree-row--selected .period-tree-toggle {
  color: color-mix(in srgb, var(--color-text-white) 85%, transparent);
}

.period-tree-row--selected .period-tree-toggle:hover {
  color: var(--color-text-white);
  background: var(--color-on-primary-shade);
}

.period-tree-chevron {
  transition: transform var(--transition-fast);
}

.period-tree-chevron.is-open {
  transform: rotate(90deg);
}

.period-tree-row--selected :deep(.period-tree-row__dates) {
  color: color-mix(in srgb, var(--color-text-white) 80%, transparent);
}

.period-tree-row__actions {
  flex-shrink: 0;
}

.period-tree-row__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--spacing-xl);
  height: var(--spacing-xl);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-light);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.period-tree-row:hover .period-tree-row__remove {
  opacity: 1;
}

.period-tree-row__remove:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.period-tree-row--selected .period-tree-row__remove {
  opacity: 1;
  color: color-mix(in srgb, var(--color-text-white) 70%, transparent);
}

.period-tree-row--selected .period-tree-row__remove:hover {
  color: var(--color-text-white);
  background: var(--color-on-primary-shade-strong);
}

.period-tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
