import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch, type CSSProperties } from 'vue';
import type { ListPeriod } from '@/types/database';

/** Délai avant l'apparition au survol ; le focus clavier l'affiche tout de suite. */
export const PERIOD_TOOLTIP_DELAY_MS = 400;

/**
 * Une seule infobulle, pilotée par la dernière interaction souris ou clavier.
 * Le survol est suivi immédiatement (agrandissement des cartes) ; l'infobulle n'apparaît
 * qu'après un court délai et disparaît dès que le curseur quitte la période.
 */
export function useTimelinePeriodTooltip(
  periods: () => ListPeriod[],
  anchor: (id: string) => HTMLElement | null,
  enabled: () => boolean,
) {
  const hoveredId = ref<string | null>(null);
  const focusedId = ref<string | null>(null);
  const dismissedId = ref<string | null>(null);
  /** Période survolée assez longtemps pour afficher son infobulle. */
  const revealedId = ref<string | null>(null);
  const input = ref<'pointer' | 'focus'>('pointer');
  const activeId = computed(() => input.value === 'focus'
    ? focusedId.value ?? hoveredId.value : hoveredId.value ?? focusedId.value);
  const visible = computed(() => focusedId.value === activeId.value || revealedId.value === activeId.value);
  const period = computed(() => enabled() && activeId.value && activeId.value !== dismissedId.value && visible.value
    ? periods().find(item => item.id === activeId.value) ?? null : null);
  const tooltipId = `period-details-${useId()}`;
  const tooltipElement = ref<HTMLElement | null>(null);
  const tooltipStyle = ref<CSSProperties>({ visibility: 'hidden' });
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: ResizeObserver | undefined;
  let motionFrame: number | undefined;

  function cancelReveal() { clearTimeout(revealTimer); revealTimer = undefined; }
  function scheduleReveal(id: string) {
    if (revealedId.value === id || revealTimer !== undefined) return;
    revealTimer = setTimeout(() => { revealTimer = undefined; if (hoveredId.value === id) revealedId.value = id; }, PERIOD_TOOLTIP_DELAY_MS);
  }
  function enter(id: string) {
    cancelReveal(); input.value = 'pointer'; hoveredId.value = id; dismissedId.value = null;
    scheduleReveal(id);
  }
  function move(id: string) {
    input.value = 'pointer';
    if (hoveredId.value !== id) { cancelReveal(); hoveredId.value = id; }
    scheduleReveal(id);
  }
  function leave(id: string | null) {
    if (hoveredId.value !== id) return;
    cancelReveal(); hoveredId.value = null; revealedId.value = null;
  }
  function focus(id: string) { input.value = 'focus'; focusedId.value = id; dismissedId.value = null; }
  function blur(id: string) { if (focusedId.value === id) focusedId.value = null; }
  function dismiss() { cancelReveal(); dismissedId.value = activeId.value; }
  function dismissFromKeyboard(event: KeyboardEvent) {
    if (!period.value) return;
    event.preventDefault(); event.stopPropagation(); dismiss();
  }
  function collapseFromKeyboard(event: KeyboardEvent) {
    const id = activeId.value;
    if (!id) return;
    event.preventDefault(); event.stopPropagation();
    reset();
    dismissedId.value = id;
  }
  function reset() {
    cancelReveal(); stopTracking();
    hoveredId.value = null; focusedId.value = null; dismissedId.value = null; revealedId.value = null;
    tooltipStyle.value = { visibility: 'hidden' };
  }
  function position() {
    const target = period.value;
    const trigger = target && anchor(target.id);
    const tip = tooltipElement.value;
    if (!trigger || !tip) return;
    const rect = trigger.getBoundingClientRect();
    const bounds = tip.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - bounds.width - margin);
    const left = Math.max(margin, Math.min(maxLeft, rect.left + rect.width / 2 - bounds.width / 2));
    // Toujours au-dessus de la carte : l’espace sous l’axe est réservé aux événements.
    const top = Math.max(margin, rect.top - bounds.height - 8);
    tooltipStyle.value = { left: `${left}px`, top: `${top}px`, visibility: 'visible' };
  }
  function stopTracking() {
    observer?.disconnect(); observer = undefined;
    if (motionFrame !== undefined) cancelAnimationFrame(motionFrame);
    motionFrame = undefined;
  }
  function trackMotion() {
    if (motionFrame !== undefined) return;
    position();
    const trigger = period.value && anchor(period.value.id);
    if (trigger?.getAnimations?.().some(animation => animation.playState === 'running')) {
      motionFrame = requestAnimationFrame(() => { motionFrame = undefined; trackMotion(); });
    }
  }
  watch(period, async target => {
    stopTracking();
    tooltipStyle.value = { visibility: 'hidden' };
    if (!target) return;
    await nextTick();
    if (period.value !== target) return;
    trackMotion();
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(trackMotion);
      const trigger = anchor(target.id);
      if (trigger) observer.observe(trigger);
      if (tooltipElement.value) observer.observe(tooltipElement.value);
    }
  }, { flush: 'post' });

  function onScroll(event: Event) {
    if (event.target instanceof Node && tooltipElement.value?.contains(event.target)) return;
    dismiss();
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') dismissFromKeyboard(event);
  }
  onMounted(() => {
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKeydown);
  });
  onScopeDispose(() => {
    reset();
    window.removeEventListener('resize', dismiss);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('keydown', onKeydown);
  });
  return {
    activeId, period, tooltipId, tooltipElement, tooltipStyle,
    enter, move, leave, focus, blur, dismiss, collapseFromKeyboard, reset,
  };
}
