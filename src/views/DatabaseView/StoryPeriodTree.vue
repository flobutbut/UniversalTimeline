<template>
  <div class="story-period-tree">
    <div class="story-period-tree__heading">
      <div class="story-period-tree__heading-title"><h3>Périodes</h3><span>{{ periods.length }}</span></div>
      <slot name="header-actions" />
    </div>
    <div class="story-period-tree__content">
      <ul v-if="rows.length" ref="tree" role="tree" aria-label="Périodes de la frise" class="story-period-tree__list">
        <li v-for="row in rows" :key="row.node.key" role="none">
          <div :ref="el => setRowElement(row.node.key, el)" role="treeitem" class="story-period-tree__row"
            :class="{ 'is-selected': selectedId === row.node.period.id, 'is-additional': !row.node.inStory }"
            :data-period-id="row.node.period.id" :aria-label="label(row.node.period)"
            :aria-level="row.level" :aria-posinset="row.index + 1" :aria-setsize="row.size"
            :aria-selected="selectedId === row.node.period.id" :aria-expanded="canExpand(row.node) ? isOpen(row.node) : undefined"
            :tabindex="focusKey === row.node.key ? 0 : -1" :style="{ '--tree-level': row.level - 1 }"
            @focus.self="focusKey = row.node.key" @click="emit('select', row.node.period.id)" @keydown.self="onKeydown($event, row)">
            <button v-if="canExpand(row.node)" type="button" class="story-period-tree__toggle" tabindex="-1"
              :aria-label="`${isOpen(row.node) ? 'Replier' : 'Déplier'} ${label(row.node.period)}`" @click.stop="toggle(row.node)">
              <Icon :icon="isOpen(row.node) ? 'mdi:chevron-down' : 'mdi:chevron-right'" aria-hidden="true" />
            </button>
            <span v-else class="story-period-tree__toggle" aria-hidden="true"><span class="story-period-tree__leaf" /></span>
            <span class="story-period-tree__text">
              <span class="story-period-tree__label">{{ label(row.node.period) }}</span>
              <span class="story-period-tree__date">{{ formatPeriodDateRange(row.node.period) || 'Dates non déterminées' }}</span>
              <span v-if="!row.node.inStory" class="story-period-tree__additional">{{ row.node.period.id.startsWith('wikidata:') ? 'Wikidata · à importer' : 'Hors de cette frise' }}</span>
            </span>
            <slot name="actions" :period="row.node.period" :in-story="row.node.inStory" />
          </div>
        </li>
      </ul>
      <p v-else class="story-period-tree__empty">{{ filtering ? 'Aucune période ne correspond aux filtres.' : 'Aucune période associée.' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue';
import { Icon } from '@iconify/vue';
import type { ListPeriod } from '@/types/database';
import { buildStoryPeriodTree, filterStoryPeriodTree, findStoryPeriodTreePath, type StoryPeriodTreeNode } from '@/lib/storyPeriodTree';
import { formatPeriodDateRange } from '@/lib/formatTemporalBoundLabel';

const props = withDefaults(defineProps<{
  storyId: string; periods: ListPeriod[]; additionalPeriods?: ListPeriod[]; selectedId?: string | null;
  search?: string; categoryId?: string; showAdditional?: boolean; loadedBranchIds?: string[];
}>(), { additionalPeriods: () => [], search: '', categoryId: '', showAdditional: false, loadedBranchIds: () => [] });
const emit = defineEmits<{ select: [id: string]; 'expanded-change': [ids: string[]] }>();
const nodes = computed(() => buildStoryPeriodTree(props.periods, props.showAdditional ? props.additionalPeriods : []));
const filtered = computed(() => filterStoryPeriodTree(nodes.value, props.search, props.categoryId));
const filtering = computed(() => !!props.search.trim() || !!props.categoryId);
const expanded = ref(new Set<string>());
const filterCollapsed = ref(new Set<string>());
const focusKey = ref<string>();
const tree = ref<HTMLElement | null>(null);
const elements = new Map<string, HTMLElement>();
type Row = { node: StoryPeriodTreeNode; level: number; index: number; size: number; parentKey?: string };
const label = (period: ListPeriod) => period.label.fr?.trim() || period.label.en?.trim() || 'Période sans titre';
const isOpen = (node: StoryPeriodTreeNode) => filtering.value ? !filterCollapsed.value.has(node.key) : expanded.value.has(node.key);
const canExpand = (node: StoryPeriodTreeNode) => node.children.length > 0 || (!filtering.value && props.showAdditional
  && /^Q[1-9]\d*$/.test(node.period.wikidata_id ?? '') && !props.loadedBranchIds.includes(node.period.id));
const rows = computed(() => {
  const result: Row[] = [];
  function visit(items: StoryPeriodTreeNode[], level: number, parentKey?: string) {
    items.forEach((node, index) => {
      result.push({ node, level, index, size: items.length, parentKey });
      if (isOpen(node)) visit(node.children, level + 1, node.key);
    });
  }
  visit(filtered.value, 1); return result;
});
function setRowElement(key: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) elements.set(key, element); else elements.delete(key);
}
function notifyExpanded() {
  const ids: string[] = [];
  function visit(items: StoryPeriodTreeNode[]) {
    for (const node of items) if (expanded.value.has(node.key)) { ids.push(node.period.id); visit(node.children); }
  }
  visit(nodes.value); emit('expanded-change', [...new Set(ids)]);
}
function toggle(node: StoryPeriodTreeNode) {
  if (filtering.value) {
    const next = new Set(filterCollapsed.value);
    if (next.has(node.key)) next.delete(node.key); else next.add(node.key);
    filterCollapsed.value = next; return;
  }
  const next = new Set(expanded.value);
  if (next.has(node.key)) next.delete(node.key); else next.add(node.key);
  expanded.value = next; notifyExpanded();
}
async function focus(key: string | undefined) {
  if (!key) return;
  focusKey.value = key; await nextTick(); elements.get(key)?.focus();
}
function onKeydown(event: KeyboardEvent, row: Row) {
  const index = rows.value.findIndex(item => item.node.key === row.node.key);
  const key = event.key;
  if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(key)) event.preventDefault();
  if (key === 'ArrowDown') void focus(rows.value[Math.min(index + 1, rows.value.length - 1)]?.node.key);
  else if (key === 'ArrowUp') void focus(rows.value[Math.max(index - 1, 0)]?.node.key);
  else if (key === 'Home') void focus(rows.value[0]?.node.key);
  else if (key === 'End') void focus(rows.value[rows.value.length - 1]?.node.key);
  else if (key === 'Enter' || key === ' ') emit('select', row.node.period.id);
  else if (key === 'ArrowRight' && canExpand(row.node)) {
    if (!isOpen(row.node)) toggle(row.node); else void focus(row.node.children[0]?.key);
  } else if (key === 'ArrowLeft') {
    if (canExpand(row.node) && isOpen(row.node)) toggle(row.node); else void focus(row.parentKey);
  } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const next = [...rows.value.slice(index + 1), ...rows.value.slice(0, index + 1)]
      .find(item => label(item.node.period).toLocaleLowerCase('fr').startsWith(key.toLocaleLowerCase('fr')));
    void focus(next?.node.key);
  }
}
watch(() => props.storyId, () => {
  expanded.value = new Set(nodes.value.map(node => node.key));
  filterCollapsed.value = new Set();
  focusKey.value = nodes.value[0]?.key;
  notifyExpanded();
}, { immediate: true });
watch([() => props.selectedId, nodes], async () => {
  if (!props.selectedId) return;
  const path = findStoryPeriodTreePath(nodes.value, props.selectedId);
  const next = new Set(expanded.value);
  for (const node of path.slice(0, -1)) next.add(node.key);
  const revealed = next.size !== expanded.value.size;
  expanded.value = next;
  if (revealed) notifyExpanded();
  if (path.length) focusKey.value = path[path.length - 1]!.key;
  await nextTick();
  if (!tree.value?.contains(document.activeElement)) elements.get(path[path.length - 1]?.key ?? '')?.scrollIntoView?.({ block: 'nearest' });
}, { immediate: true, flush: 'post' });
watch(rows, items => { if (!items.some(row => row.node.key === focusKey.value)) focusKey.value = items[0]?.node.key; });
watch([() => props.search, () => props.categoryId], () => { filterCollapsed.value = new Set(); });
</script>

<style scoped>
.story-period-tree { display: flex; flex-direction: column; min-height: 0; min-width: 0; background: var(--color-surface-default); }
.story-period-tree__heading { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--color-border-default); }
.story-period-tree__heading-title { display: flex; flex: 1; align-items: center; gap: var(--spacing-sm); }
.story-period-tree__heading h3 { margin: 0; font: var(--type-label); color: var(--color-text-primary); }
.story-period-tree__heading-title > span { color: var(--color-text-secondary); font: var(--type-meta); }
.story-period-tree__list { list-style: none; padding: var(--spacing-sm) 0; margin: 0; }
.story-period-tree__row { display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) calc(var(--spacing-sm) + var(--tree-level) * 18px); color: var(--color-text-primary); min-height: 52px; cursor: pointer; border-radius: var(--radius-sm); }
.story-period-tree__row:hover { background: var(--color-interaction-hover); }
.story-period-tree__row.is-selected { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.story-period-tree__row:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.story-period-tree__toggle { flex: 0 0 24px; display: inline-flex; justify-content: center; align-items: center; width: 24px; height: var(--field-height-md); padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: inherit; font-size: var(--font-size-xl); }
button.story-period-tree__toggle { cursor: pointer; }
button.story-period-tree__toggle:hover { background: var(--color-interaction-hover); }
button.story-period-tree__toggle:focus-visible { outline: 2px solid var(--color-border-focus); }
.story-period-tree__leaf { width: 4px; height: 4px; background: var(--color-border-strong); border-radius: 50%; }
.story-period-tree__text { display: flex; flex: 1; flex-direction: column; min-width: 100px; font: var(--type-body); }
.story-period-tree__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-period-tree__date, .story-period-tree__additional { color: var(--color-text-secondary); font: var(--type-meta); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.is-selected :is(.story-period-tree__date, .story-period-tree__additional) { color: inherit; }
.is-additional:not(.is-selected) .story-period-tree__label { color: var(--color-text-secondary); }
.story-period-tree__empty { margin: 0; padding: var(--spacing-xl); color: var(--color-text-secondary); font: var(--type-body); }
</style>
