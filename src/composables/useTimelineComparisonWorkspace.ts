import { computed, effectScope, onScopeDispose, ref, shallowReactive, shallowRef, watch, type Ref } from 'vue';
import { useHomeNavigation } from './useHomeNavigation';
import { useTimelineComparisonLane, type TimelineLaneHandlers, type TimelineLaneKey } from './useTimelineComparisonLane';
import type { ScaleFrame } from '@/lib/timelineComparison';
import type { TimelineTarget } from '@/lib/timelineNavigation';

interface TimelineGrid {
  $el: HTMLElement;
  getScaleFrame(): ScaleFrame | null;
  getFocus(): { start: number; end: number; minimum: number } | null;
  getSlideLayers(): HTMLElement[];
}
export type ComparisonPanel = ReturnType<typeof useTimelineComparisonLane> & {
  collapsed: Ref<boolean>;
  dispose(): void;
};

/** Chaque panneau peut être déplacé ou fermé ; le rôle lié à l’URL est transférable. */
export function useTimelineComparisonWorkspace(options: {
  navigate(target: TimelineTarget): void;
  handlers: Partial<TimelineLaneHandlers>;
  navigatePeriod(key: TimelineLaneKey, direction: 'previous' | 'next'): void;
}) {
  const leader = ref<TimelineLaneKey>('');
  const selected = ref<TimelineLaneKey>('');
  // Une navigation temporelle sélectionne sa frise ; sélectionner seule ne navigue pas.
  watch(leader, key => { selected.value = key; }, { flush: 'sync' });
  const panels = shallowRef<ComparisonPanel[]>([]);
  const primary = shallowRef<ComparisonPanel | null>(null);
  const idleNavigation = useHomeNavigation();
  const grids = shallowReactive(new Map<TimelineLaneKey, TimelineGrid>());
  let sequence = 0;
  let lastFrame: ScaleFrame | null = null;
  const scaleFrame = computed(() => {
    const current = grids.get(leader.value)?.getScaleFrame?.() ?? null;
    if (current) lastFrame = current;
    return current ?? lastFrame;
  });

  function createPanel(): ComparisonPanel {
    const key = sequence++ === 0 ? 'primary' : `comparison-${sequence}`;
    const scope = effectScope(true);
    const lane = scope.run(() => {
      const isPrimary = () => primary.value?.key === key;
      // Le même moteur conserve son état local quand le rôle lié à l’URL change.
      const navigate = computed(() => isPrimary() ? options.navigate : undefined);
      const nav = useHomeNavigation(navigate);
      const interact = <T>(run: () => T): T => { selected.value = key; return run(); };
      return useTimelineComparisonLane({ key, nav, leader, frame: scaleFrame, handlers: {
        periodClick: period => interact(() => isPrimary() && options.handlers.periodClick ? options.handlers.periodClick(period) : nav.handlePeriodClick(period)),
        goBack: () => interact(() => isPrimary() && options.handlers.goBack ? options.handlers.goBack() : nav.goBack()),
        storySelect: (id, anchor, source) => interact(() => isPrimary() && options.handlers.storySelect ? options.handlers.storySelect(id, anchor, source) : nav.selectStory(id, anchor, source)),
        storyCrumb: index => interact(() => isPrimary() && options.handlers.storyCrumb ? options.handlers.storyCrumb(index) : nav.navigateToStoryBreadcrumb(index)),
        periodCrumb: index => interact(() => isPrimary() && options.handlers.periodCrumb ? options.handlers.periodCrumb(index) : nav.navigateToBreadcrumb(index)),
        navigatePeriod: direction => interact(() => options.navigatePeriod(key, direction)),
      } });
    })!;
    return { ...lane, collapsed: ref(false), dispose: () => { lane.storyId.value = null; scope.stop(); } };
  }
  function ensurePrimary(id?: string) {
    if (!primary.value) {
      const panel = createPanel();
      primary.value = panel;
      panels.value = [...panels.value, panel];
      leader.value = panel.key;
    }
    if (id) primary.value.storyId.value = id;
    return primary.value;
  }
  ensurePrimary();
  const comparing = computed(() => panels.value.length > 1);
  const leading = computed(() => panels.value.find(panel => panel.key === leader.value) ?? primary.value);
  const navigation = computed(() => primary.value?.nav ?? idleNavigation);
  const focus = computed(() => panels.value.map(panel => grids.get(panel.key)?.getFocus?.()).find(Boolean) ?? null);

  function select(panel: ComparisonPanel) {
    if (panels.value.includes(panel)) selected.value = panel.key;
  }
  function setGrid(key: TimelineLaneKey, grid: unknown) {
    if (grid) grids.set(key, grid as TimelineGrid);
    else grids.delete(key);
  }
  function toggle(panel: ComparisonPanel) {
    if (!panel.collapsed.value && panel.leads.value) lastFrame = scaleFrame.value;
    panel.collapsed.value = !panel.collapsed.value;
  }
  function add(id: string) {
    if (panels.value.some(panel => panel.storyId.value === id)) return;
    if (!primary.value) return ensurePrimary(id);
    const panel = createPanel();
    panel.storyId.value = id;
    panels.value = [...panels.value, panel];
    return panel;
  }
  function remove(panel: ComparisonPanel, restorePosition = true) {
    if (panels.value.length <= 1) return;
    const index = panels.value.indexOf(panel);
    if (index < 0) return;
    const wasLeading = panel.leads.value, wasPrimary = panel === primary.value;
    const wasSelected = selected.value === panel.key;
    const ancestors = primary.value?.ancestors.value ?? [];
    const level = ancestors[ancestors.length - 1];
    lastFrame = scaleFrame.value;
    const remaining = panels.value.filter(item => item !== panel);
    panels.value = remaining;
    if (wasPrimary) primary.value = remaining.find(item => item.leads.value) ?? remaining[index] ?? remaining[index - 1] ?? null;
    grids.delete(panel.key);
    panel.dispose();
    if (!primary.value) { leader.value = ''; selected.value = ''; lastFrame = null; return; }
    if (remaining.length === 1) primary.value.collapsed.value = false;
    if (wasSelected) selected.value = remaining.find(item => item.leads.value)?.key ?? primary.value.key;
    if (wasLeading) {
      if (!wasPrimary && restorePosition) primary.value.leadAt(level);
      else leader.value = primary.value.key;
    }
  }
  function clear() {
    const previous = panels.value;
    panels.value = []; primary.value = null; leader.value = ''; selected.value = ''; lastFrame = null;
    grids.clear(); previous.forEach(panel => panel.dispose());
  }
  function move(key: TimelineLaneKey, index: number) {
    const from = panels.value.findIndex(panel => panel.key === key);
    if (from < 0 || index < 0 || index >= panels.value.length || from === index) return false;
    const ordered = [...panels.value];
    ordered.splice(index, 0, ordered.splice(from, 1)[0]);
    panels.value = ordered;
    return true;
  }
  function sync(ids: string[], order: string[]) {
    if (!primary.value) return;
    for (const panel of [...panels.value]) if (panel !== primary.value && (!ids.includes(panel.storyId.value ?? '') || panel.storyId.value === primary.value.storyId.value)) remove(panel, false);
    for (const id of ids) add(id);
    const byStory = new Map(panels.value.map(panel => [panel.storyId.value, panel]));
    const ordered = order.flatMap(id => byStory.get(id) ? [byStory.get(id)!] : []);
    panels.value = [...new Set([...ordered, ...panels.value])];
  }
  onScopeDispose(clear);
  return { panels, primary, leader, selected, select, leading, navigation, comparing, scaleFrame, focus, grids, setGrid, toggle, add, remove, move, sync, ensurePrimary, clear };
}
