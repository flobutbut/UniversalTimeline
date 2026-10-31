import { computed, nextTick, ref, watch } from 'vue';
import { generateDomUid } from '@/utils/generateDomUid';
import { moveListCursor } from '@/lib/searchHitDisplay';

/** The input keeps focus; aria-activedescendant follows the highlighted suggestion. */
export function useSuggestionNavigation<T>(items: () => readonly T[], visible: () => boolean) {
  const listId = generateDomUid('suggestions');
  const cursor = ref(-1);
  const optionId = (index: number) => `${listId}-${index}`;
  const activeId = computed(() => visible() && items()[cursor.value] !== undefined ? optionId(cursor.value) : undefined);
  const reset = () => { cursor.value = -1; };
  watch(items, reset, { flush: 'sync' });
  watch(visible, open => { if (!open) reset(); }, { flush: 'sync' });
  function move(direction: 1 | -1) {
    if (!visible()) return;
    cursor.value = moveListCursor(cursor.value, direction, items().length);
    void nextTick(() => {
      if (activeId.value) document.getElementById(activeId.value)?.scrollIntoView?.({ block: 'nearest' });
    });
  }
  return { listId, optionId, cursor, activeId, move, reset, current: () => activeId.value ? items()[cursor.value] : undefined };
}
