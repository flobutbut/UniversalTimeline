import { nextTick, onScopeDispose, watch } from 'vue';
import type { ListPeriod } from '@/types/database';

/** Animation réservée à l’entrée effective dans la période cliquée. */
export function usePeriodFlip(
  currentPeriodId: () => string | undefined,
  loading: () => boolean,
  parentElement: () => HTMLElement | null,
) {
  let pending: { id: string; rect: DOMRect; restoreFocus: boolean } | null = null;
  let animatingId: string | undefined;
  let restore: (() => void) | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const cancel = () => {
    pending = null;
    animatingId = undefined;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    restore?.();
    restore = null;
  };

  const prepare = (period: ListPeriod, element: HTMLElement | null) => {
    cancel();
    if (element) pending = {
      id: period.id,
      rect: element.getBoundingClientRect(),
      restoreFocus: element.contains(document.activeElement),
    };
  };

  watch([currentPeriodId, loading], async ([id, isLoading]) => {
    if (restore && (isLoading || id !== animatingId)) cancel();
    if (isLoading) return;
    const from = pending;
    if (!from) return;
    if (id !== from.id) { cancel(); return; }

    await nextTick();
    if (pending !== from || loading() || currentPeriodId() !== from.id) return;
    const element = parentElement();
    const to = element?.getBoundingClientRect();
    if (!element || !to?.width || !from.rect.width) { cancel(); return; }
    if (from.restoreFocus && document.activeElement === document.body) {
      const backControl = element.querySelector<HTMLElement>('.period-card__title-action') ?? element;
      backControl.focus({ preventScroll: true });
    }
    pending = null;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const previous = {
      transition: element.style.transition,
      transformOrigin: element.style.transformOrigin,
      transform: element.style.transform,
    };
    restore = () => Object.assign(element.style, previous);
    animatingId = from.id;
    const dx = from.rect.left - to.left;
    const dy = from.rect.top - to.top;
    const scaleX = from.rect.width / to.width;
    const scaleY = from.rect.height / to.height;
    const phase1 = 260;
    const phase2 = 340;

    element.style.transition = 'none';
    element.style.transformOrigin = 'top left';
    element.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    void element.getBoundingClientRect();
    element.style.transition = `transform ${phase1}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.transform = `translate(${dx}px, 0px) scale(${scaleX}, 1)`;
    timers.add(setTimeout(() => {
      element.style.transition = `transform ${phase2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      element.style.transform = 'none';
    }, phase1));
    timers.add(setTimeout(cancel, phase1 + phase2 + 20));
  }, { flush: 'post' });

  onScopeDispose(cancel);
  return { prepare, cancel };
}
