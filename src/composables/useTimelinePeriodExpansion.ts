import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { measureTextWidth } from '@/lib/measureTextWidth';

/** Mesure le texte avant l'agrandissement et réserve aussi la place des actions. */
export function useTimelinePeriodExpansion(
  activeId: () => string | null,
  anchor: (id: string) => HTMLElement | null,
  row: Ref<HTMLElement | null>,
) {
  const requiredPixels = ref(0);
  const rowWidth = ref(0);
  const laneHeight = ref(56);
  const wrapContent = ref(false);
  let textPixels = 0;
  let paddingPixels = 0;
  let observer: ResizeObserver | undefined;

  function measureFrame() {
    rowWidth.value = row.value?.getBoundingClientRect().width ?? 0;
    const id = activeId();
    const card = id && anchor(id);
    if (card) {
      const main = card.querySelector<HTMLElement>('.main-container');
      const controls = Array.from(card.querySelectorAll<HTMLElement>('.period-card__actions, .period-card__drill'))
        .map(element => element.offsetWidth).filter(width => width > 0);
      const gap = main ? parseFloat(getComputedStyle(main).columnGap) || 0 : 0;
      requiredPixels.value = Math.ceil(textPixels + paddingPixels
        + controls.reduce((sum, width) => sum + width, 0) + gap * controls.length + 2);
    }
    // Le texte reste sur une ligne pendant la transition horizontale. Un retour
    // à la ligne n'est utile que si la frise entière ne suffit pas, une fois atteinte.
    wrapContent.value = !!card && rowWidth.value > 0 && requiredPixels.value > rowWidth.value
      && card.getBoundingClientRect().width >= rowWidth.value - 1;
    laneHeight.value = card ? Math.max(56, Math.ceil(card.getBoundingClientRect().height) + 4) : 56;
  }

  watch(activeId, id => {
    const card = id && anchor(id);
    requiredPixels.value = 0;
    textPixels = paddingPixels = 0;
    laneHeight.value = 56;
    wrapContent.value = false;
    if (!card) return;
    const main = card.querySelector<HTMLElement>('.main-container');
    paddingPixels = [card, main].reduce((sum, element) => {
      if (!element) return sum;
      const style = getComputedStyle(element);
      return sum + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
        + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
    }, 0);
    // Mesurer le texte lui-même : le h3 peut être étroit sans déborder, car son
    // bouton/span enfant masque déjà le texte. Cela vaut aussi sans badge ni flèche.
    const widths = Array.from(card.querySelectorAll<HTMLElement>('.period-card__title-action, .period-info'), measureTextWidth);
    textPixels = Math.max(0, ...widths);
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
      if (card) {
        observer.observe(card);
        card.querySelectorAll('.period-card__actions, .period-card__drill').forEach(element => observer!.observe(element));
      }
    }
  }, { flush: 'post', immediate: true });
  onScopeDispose(() => observer?.disconnect());

  return {
    minimumPct: computed(() => Math.min(100, Math.max(8, rowWidth.value > 0 ? requiredPixels.value / rowWidth.value * 100 : 8))),
    laneHeight,
    wrapContent,
  };
}
