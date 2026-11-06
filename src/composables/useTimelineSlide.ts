import { nextTick, onScopeDispose, ref, watch } from 'vue';

type Direction = 'previous' | 'next';
type Slide = {
  origin: string;
  periodId: string;
  storyId?: string;
  direction: Direction;
  snapshot: HTMLElement;
  restoreFocus: boolean;
  animations: Animation[];
};

/** Conserve la vue quittée jusqu'au chargement, puis fait glisser les deux vues ensemble. */
export function useTimelineSlide(
  viewport: () => HTMLElement | null,
  layers: () => HTMLElement[],
  position: () => { storyId: string; periodId?: string; contextId?: string | null },
  loading: () => boolean,
  error: () => unknown,
) {
  const phase = ref<'idle' | 'waiting' | 'sliding'>('idle');
  let pending: Slide | null = null;
  const positionKey = () => JSON.stringify(position());

  function cancel() {
    const slide = pending;
    pending = null;
    slide?.animations.forEach(animation => animation.cancel());
    slide?.snapshot.remove();
    phase.value = 'idle';
  }

  function prepare(direction: Direction, periodId: string, storyId?: string) {
    cancel();
    const host = viewport();
    const elements = layers();
    if (!host || !elements.length || !host.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width) return;
    const snapshot = document.createElement('div');
    snapshot.className = 'timeline-slide-snapshot';
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.setAttribute('inert', '');
    Object.assign(snapshot.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '1' });
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const copy = element.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      Object.assign(copy.style, {
        position: 'absolute', margin: '0', left: `${rect.left - bounds.left}px`, top: `${rect.top - bounds.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, flex: 'none',
      });
      snapshot.append(copy);
    }
    host.append(snapshot);
    pending = { origin: positionKey(), periodId, storyId, direction, snapshot,
      restoreFocus: host.contains(document.activeElement), animations: [] };
    phase.value = 'waiting';
  }

  watch([positionKey, loading, error], async () => {
    const slide = pending;
    if (!slide) return;
    if (error()) { cancel(); return; }
    if (loading()) { if (phase.value === 'sliding') cancel(); return; }
    if (slide.storyId ? position().storyId !== slide.storyId : position().periodId !== slide.periodId) {
      if (positionKey() !== slide.origin) cancel();
      return;
    }
    if (phase.value !== 'waiting') return;
    await nextTick();
    if (pending !== slide || loading()) return;
    const host = viewport();
    const incoming = layers();
    const width = host?.getBoundingClientRect().width;
    if (!width || !incoming.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { cancel(); return; }
    const offset = slide.direction === 'next' ? width : -width;
    const options: KeyframeAnimationOptions = { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' };
    // La désactivation reste sur les cartes arrivées. Retirer la classe temporaire
    // du viewport ne doit pas relancer leur animation verticale après la translation.
    for (const layer of incoming) {
      layer.querySelectorAll<HTMLElement>('.timeline-card').forEach(card => { card.style.animation = 'none'; });
    }
    phase.value = 'sliding';
    try {
      const outgoing = slide.snapshot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-offset}px)` }], options);
      slide.animations.push(outgoing);
      for (const element of incoming) slide.animations.push(element.animate([
        { transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' },
      ], options));
      // Un même instant de départ : aucun décalage entre périodes, ligne du temps et événements.
      const startTime = document.timeline?.currentTime;
      if (typeof startTime === 'number') slide.animations.forEach(animation => { animation.startTime = startTime; });
      await Promise.all(slide.animations.map(animation => animation.finished));
      if (pending !== slide) return;
      cancel();
      if (slide.restoreFocus && document.activeElement === document.body) {
        const root = viewport();
        const control = root?.querySelector<HTMLElement>(`[data-period-direction="${slide.direction}"]`)
          ?? root?.querySelector<HTMLElement>('.period-card--parent .period-card__title-action');
        // Le viewport redevient interactif au prochain rendu.
        await nextTick();
        if (!pending && document.activeElement === document.body) control?.focus({ preventScroll: true });
      }
    } catch {
      if (pending === slide) cancel();
    }
  }, { flush: 'post' });

  onScopeDispose(cancel);
  return { phase, prepare, cancel };
}
