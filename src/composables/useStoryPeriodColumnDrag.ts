import { computed, ref, watch } from 'vue';
import { collectStoryPeriodSubtreeIds } from '@/lib/storyPeriodFinderColumns';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import type { Story } from '@/types/database';

/** A column represents its selected parent, not the row under the pointer. */
export function useStoryPeriodColumnDrag(options: {
  story: () => Story | null | undefined;
  path: () => string[];
  enabled: () => boolean;
  busy: () => boolean | undefined;
  move: (periodId: string, parentId: string | null) => void;
  moveStory: (storyId: string, fromParent: string | null, toParent: string | null) => void;
}) {
  const draggedId = ref<string | null>(null);
  const draggedStory = ref<{ id: string; column: number; parent: string | null } | null>(null);
  const targetColumn = ref<number | null>(null);
  const periods = computed(() => options.story()?.periods ?? []);
  const periodIds = computed(() => new Set(periods.value.map(period => period.id)));
  const excludedParents = computed(() => new Set(draggedId.value
    ? collectStoryPeriodSubtreeIds(periods.value, draggedId.value) : []));

  function end() { draggedId.value = null; draggedStory.value = null; targetColumn.value = null; }
  function canDragStory(id: string, index: number) {
    const child = options.story()?.childStories?.find(story => story.id === id);
    const parent = parentForColumn(index);
    if (!options.enabled() || options.busy() || !child || parent === undefined) return false;
    return parent === null ? !!child.atRoot || !child.anchors.some(anchor => anchor.type === 'period' && periodIds.value.has(anchor.id))
      : child.anchors.some(anchor => anchor.type === 'period' && anchor.id === parent);
  }
  function canDrag(id: string) {
    return options.enabled() && !options.busy() && periodIds.value.has(id) && !id.startsWith('wikidata:');
  }
  function parentForColumn(index: number): string | null | undefined {
    if (!Number.isInteger(index) || index < 0 || index > options.path().length) return undefined;
    if (index === 0) return null;
    const id = options.path()[index - 1];
    return id && periodIds.value.has(id) ? id : undefined;
  }
  function canDrop(index: number) {
    const child = draggedStory.value;
    if (child) {
      const parent = parentForColumn(index);
      return canDragStory(child.id, child.column) && parent !== undefined && parent !== child.parent;
    }
    const id = draggedId.value;
    if (!id || !canDrag(id)) return false;
    const parent = parentForColumn(index);
    if (parent === undefined || (parent !== null && excludedParents.value.has(parent))) return false;
    const previous = getStoryPeriodParentId(periods.value.find(period => period.id === id)!);
    const current = previous && periodIds.value.has(previous) ? previous : null;
    return current !== parent;
  }
  function start(event: DragEvent) {
    end();
    const childRow = event.target instanceof Element ? event.target.closest<HTMLElement>('.anchored-story-row[data-child-story-id]') : null;
    if (childRow) {
      const id = childRow.dataset.childStoryId!;
      const column = Number(childRow.closest<HTMLElement>('.story-period-column')?.dataset.columnIndex);
      if (!canDragStory(id, column)) { event.preventDefault(); return; }
      draggedStory.value = { id, column, parent: parentForColumn(column)! };
      if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }
      return;
    }
    const row = event.target instanceof Element ? event.target.closest<HTMLElement>('.finder-item[data-story-period-id]') : null;
    const id = row?.dataset.storyPeriodId;
    if (!id || !canDrag(id)) { event.preventDefault(); return; }
    draggedId.value = id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }
  function over(event: DragEvent, index: number) {
    if (!draggedId.value && !draggedStory.value) return;
    event.preventDefault();
    const valid = canDrop(index);
    targetColumn.value = valid ? index : null;
    if (event.dataTransfer) event.dataTransfer.dropEffect = valid ? 'move' : 'none';
  }
  function leave(event: DragEvent, index: number) {
    if (event.relatedTarget instanceof Node && (event.currentTarget as HTMLElement).contains(event.relatedTarget)) return;
    if (targetColumn.value === index) targetColumn.value = null;
  }
  function drop(event: DragEvent, index: number) {
    if (!draggedId.value && !draggedStory.value) return;
    event.preventDefault(); event.stopPropagation();
    const id = draggedId.value;
    const child = draggedStory.value;
    const parent = parentForColumn(index);
    const valid = canDrop(index);
    end();
    if (valid && parent !== undefined) {
      if (child) options.moveStory(child.id, child.parent, parent);
      else if (id) options.move(id, parent);
    }
  }
  watch([() => options.story()?.id, options.enabled, options.busy,
    () => periods.value.map(period => `${period.id}:${getStoryPeriodParentId(period)}`).join(','),
    () => options.story()?.childStories?.map(story => `${story.id}:${story.atRoot}:${story.anchors.map(a => `${a.type}:${a.id}`).join(',')}`).join(';')], end, { flush: 'sync' });
  return { draggedId, draggedStory, targetColumn, canDrag, canDragStory, start, over, leave, drop, end };
}
