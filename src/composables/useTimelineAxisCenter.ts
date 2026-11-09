import { nextTick, onScopeDispose, ref, watch, type CSSProperties, type Ref, type WatchSource } from 'vue';

/** Vue seule : la ligne réelle est le repère de cadrage, même si les périodes dépassent l’écran. */
export function useTimelineAxisCenter(options: {
  viewport(): HTMLElement | null;
  grid: Ref<HTMLElement | null>;
  axis: Ref<HTMLElement | null>;
  ready(): boolean;
  resetOn: WatchSource[];
}) {
  const style = ref<CSSProperties>({});
  let frame = 0;
  let version = 0;
  let observer: ResizeObserver | undefined;

  async function center(token: number) {
    const viewport = options.viewport(), grid = options.grid.value, axis = options.axis.value;
    if (!viewport) { style.value = {}; return; }
    if (!grid || !axis || !options.ready() || !viewport.clientHeight) return;
    const hostBox = viewport.getBoundingClientRect(), gridBox = grid.getBoundingClientRect();
    const gridStyle = getComputedStyle(grid), axisStyle = getComputedStyle(axis);
    const halfAxis = axis.getBoundingClientRect().height / 2;
    const number = (value: string) => parseFloat(value) || 0;
    const gridOffset = gridBox.top - hostBox.top - viewport.clientTop + viewport.scrollTop;
    const next = {
      '--timeline-before-axis': `${Math.max(0, viewport.clientHeight / 2 - gridOffset - number(gridStyle.paddingTop) - number(axisStyle.marginTop) - halfAxis)}px`,
      '--timeline-after-axis': `${Math.max(0, viewport.clientHeight / 2 - halfAxis - number(axisStyle.marginBottom) - number(gridStyle.paddingBottom))}px`,
    };
    if (JSON.stringify(next) !== JSON.stringify(style.value)) style.value = next;
    await nextTick();
    if (token !== version || options.viewport() !== viewport || options.axis.value !== axis || !options.ready()) return;
    // Les périodes peuvent dépasser la demi-hauteur : conserver leur hauteur naturelle,
    // puis cadrer le scroll global sur l’axe, sans couper leurs cartes.
    const line = axis.getBoundingClientRect();
    const target = viewport.getBoundingClientRect().top + viewport.clientTop + viewport.clientHeight / 2;
    const delta = line.top + line.height / 2 - target;
    if (Math.abs(delta) > 0.5) viewport.scrollTop += delta;
  }
  function schedule() {
    const token = ++version;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { void center(token); });
  }
  watch([options.viewport, options.grid], ([viewport, grid]) => {
    observer?.disconnect();
    if (viewport && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(viewport);
      if (grid) observer.observe(grid);
    }
    schedule();
  }, { immediate: true, flush: 'post' });
  watch([options.axis, options.ready, ...options.resetOn], schedule, { flush: 'post' });
  onScopeDispose(() => { version++; cancelAnimationFrame(frame); observer?.disconnect(); });
  return style;
}
