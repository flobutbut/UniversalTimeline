import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { journeyChapters, journeyFrame } from '@/lib/scrollJourney';

export function useScrollJourney() {
  const root = ref<HTMLElement>();
  const runway = ref<HTMLElement>();
  const stage = ref<HTMLElement>();
  const progress = ref(0);
  const reducedMotion = ref(false);
  const frame = computed(() => journeyFrame(progress.value, reducedMotion.value));
  let raf = 0;
  let media: MediaQueryList | undefined;
  let observer: ResizeObserver | undefined;
  let lastTravel: number | null = null;
  // Reserve one final screen of scroll to stay with the one-second frame.
  const travel = () => Math.max(0, (runway.value?.clientHeight ?? 0) - (stage.value?.clientHeight ?? 0)) * (journeyChapters.length - 1) / journeyChapters.length;
  function readScroll() {
    raf = 0;
    const distance = travel();
    lastTravel = distance;
    progress.value = distance ? Math.min(1, Math.max(0, (root.value?.scrollTop ?? 0) / distance)) : 0;
  }
  function schedule() { if (!raf) raf = window.requestAnimationFrame(readScroll); }
  function updateMotion() { reducedMotion.value = media?.matches ?? false; }
  function handleResize() {
    const distance = travel();
    if (lastTravel !== null && distance > 0 && distance !== lastTravel && root.value && root.value.scrollTop <= lastTravel + 1) {
      root.value.scrollTop = progress.value * distance;
    }
    lastTravel = distance;
    schedule();
  }
  function goTo(index: number) {
    const target = Math.min(journeyChapters.length - 1, Math.max(0, index));
    root.value?.scrollTo({ top: target / (journeyChapters.length - 1) * travel(), behavior: reducedMotion.value ? 'auto' : 'smooth' });
  }
  onMounted(() => {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
    updateMotion();
    media.addEventListener('change', updateMotion);
    window.addEventListener('resize', handleResize);
    if (typeof ResizeObserver !== 'undefined' && runway.value) {
      observer = new ResizeObserver(handleResize);
      observer.observe(runway.value);
    }
    schedule();
  });
  onBeforeUnmount(() => {
    if (raf) window.cancelAnimationFrame(raf);
    observer?.disconnect();
    media?.removeEventListener('change', updateMotion);
    window.removeEventListener('resize', handleResize);
  });
  return { root, runway, stage, frame, reducedMotion, schedule, goTo };
}
