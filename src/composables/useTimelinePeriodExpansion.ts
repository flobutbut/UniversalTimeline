import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

/** Mesure le texte avant l'agrandissement ; seul le cadre est remesuré pendant celui-ci. */
export function useTimelinePeriodExpansion(
  activeId: () => string | null,
  anchor: (id: string) => HTMLElement | null,
  row: Ref<HTMLElement | null>,
) {
  const requiredPixels = ref(0);
  const rowWidth = ref(0);
  const laneHeight = ref(56);
  const wrapContent = ref(false);
  let observer: ResizeObserver | undefined;

  function measureFrame() {
    rowWidth.value = row.value?.getBoundingClientRect().width ?? 0;
    const id = activeId();
    const card = id && anchor(id);
    // Le texte reste sur une ligne pendant la transition horizontale. Un retour
    // à la ligne n'est utile que si la frise entière ne suffit pas, une fois atteinte.
    wrapContent.value = !!card && rowWidth.value > 0 && requiredPixels.value > rowWidth.value
      && card.getBoundingClientRect().width >= rowWidth.value - 1;
    laneHeight.value = card ? Math.max(56, Math.ceil(card.getBoundingClientRect().height) + 4) : 56;
  }

  watch(activeId, id => {
    const card = id && anchor(id);
    requiredPixels.value = 0;
    laneHeight.value = 56;
    wrapContent.value = false;
    if (!card) return;
    const main = card.querySelector<HTMLElement>('.main-container');
    const lines = card.querySelectorAll<HTMLElement>('.period-title, .period-info');
    const padding = [card, main].reduce((sum, element) => {
      if (!element) return sum;
      const style = getComputedStyle(element);
      return sum + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
        + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
    }, 0);
    // Deux pixels de réserve évitent une ellipse due aux arrondis de scrollWidth.
    requiredPixels.value = Array.from(lines).some(line => line.scrollWidth > line.clientWidth)
      ? Math.ceil(Math.max(0, ...Array.from(lines, line => line.scrollWidth)) + padding + 2) : 0;
    measureFrame();
  }, { flush: 'sync' });

  watch([row, activeId], () => {
    observer?.disconnect();
    measureFrame();
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measureFrame);
      if (row.value) observer.observe(row.value);
      const id = activeId();
      const card = id && anchor(id);
      if (card) observer.observe(card);
    }
  }, { flush: 'post', immediate: true });
  onScopeDispose(() => observer?.disconnect());

  return {
    minimumPct: computed(() => Math.min(100, Math.max(8, rowWidth.value > 0 ? requiredPixels.value / rowWidth.value * 100 : 8))),
    laneHeight,
    wrapContent,
  };
}
