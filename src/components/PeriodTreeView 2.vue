<template>
  <ul class="period-tree" role="tree">
    <PeriodTreeBranch
      v-for="root in roots"
      :key="root.id"
      :node="root"
      :selected-id="selectedId"
      :depth="0"
      @select="$emit('select', $event)"
      @remove="$emit('remove', $event)"
    />
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PeriodTreeBranch from './PeriodTreeBranch.vue';
import { formatPeriodTreeItemDates } from '@/lib/formatPeriodTreeItemDates';
import { compareStoryPeriodsByLabel } from '@/lib/periodTreeLabelKey';
import type { PeriodTreeNode, StoryPeriodInput } from '@/types/periodTree';

const props = defineProps<{
  periods: StoryPeriodInput[];
  selectedId: string | null;
}>();

defineEmits<{
  (e: 'select', id: string): void;
  (e: 'remove', id: string): void;
}>();

function buildTree(periods: StoryPeriodInput[]): PeriodTreeNode[] {
  const list = periods ?? [];
  if (!list.length) return [];

  const ids = new Set(list.map((p) => p.id));
  const childrenMap = new Map<string, StoryPeriodInput[]>();

  for (const p of list) {
    const pid = p.parentId ?? p.parent_id ?? null;
    if (pid && ids.has(pid)) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(p);
    }
  }

  const roots = list.filter((p) => {
    const pid = p.parentId ?? p.parent_id ?? null;
    return !pid || !ids.has(pid);
  });

  function toNode(p: StoryPeriodInput): PeriodTreeNode {
    const kids = (childrenMap.get(p.id) ?? []).slice().sort(compareStoryPeriodsByLabel).map(toNode);
    return {
      id: p.id,
      period: p,
      datesLabel: formatPeriodTreeItemDates(p),
      children: kids,
    };
  }

  return roots.slice().sort(compareStoryPeriodsByLabel).map(toNode);
}

const roots = computed(() => buildTree(props.periods ?? []));
</script>

<style scoped>
.period-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
