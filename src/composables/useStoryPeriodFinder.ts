import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import { computed, onScopeDispose, ref, watch } from 'vue';
import type { Story, ListPeriod } from '@/types/database';
import { useDataStore } from '@/stores/useDataStore';
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { normalizeWikidataQId, mapWikidataGeologicalChildToListPeriod } from '@/lib/wikidataPeriodSuggestions';
import { PeriodApiService } from '@/services/PeriodApiService';
import { buildStoryFinderPathFromSelectedPeriodId, getStoryPeriodRoots } from '@/lib/storyPeriodFinderColumns';
import { useLatestRequest } from './useLatestRequest';

/** Additional periods stay below the frise's own periods, never its global ancestors. */
export function useStoryPeriodFinder(story: () => Story | null | undefined) {
  const store = useDataStore();
  const requests = useLatestRequest();
  const selectedId = ref<string | null>(null);
  const path = ref<string[]>([]);
  const showExternal = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const suggestionsByParent = ref<Record<string, ListPeriod[]>>({});
  let controller: AbortController | null = null;
  const savedPeriods = () => [...(story()?.periods ?? []), ...store.periods.filter(p => !p.id.startsWith('wikidata:'))];
  const resolveId = (id: string) => id.startsWith('wikidata:')
    ? story()?.periods.find(p => normalizeWikidataQId(p.wikidata_id) === normalizeWikidataQId(id))?.id ?? id : id;
  const additionalPeriods = computed(() => {
    const associatedQids = new Set(story()?.periods.map(p => normalizeWikidataQId(p.wikidata_id)).filter(Boolean));
    const rows = new Map<string, ListPeriod>();
    for (const period of Object.values(suggestionsByParent.value).flat()) {
      const parentId = resolveId(period.parentId!);
      if (associatedQids.has(period.wikidata_id!) || savedPeriods().some(p => p.parentId === parentId && normalizeWikidataQId(p.wikidata_id) === period.wikidata_id)) continue;
      rows.set(`${parentId}:${period.id}`, { ...period, parentId });
    }
    return [...rows.values()];
  });
  let retryTask: (() => Promise<void>) | null = null;
  const inStory = (id: string) => story()?.periods.some(p => p.id === id) ?? false;
  const storyPath = (id: string) => buildStoryFinderPathFromSelectedPeriodId(story()?.periods ?? [], id);
  function cancel() { controller?.abort(); requests.cancel(); loading.value = false; error.value = null; retryTask = null; }
  function clear() { cancel(); selectedId.value = null; path.value = []; }
  async function run(action: (isCurrent: () => boolean, signal: AbortSignal, force: boolean) => Promise<void>, force = false) {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const isCurrent = requests.begin();
    retryTask = () => run(action, true);
    loading.value = true; error.value = null;
    try { await action(isCurrent, signal, force); }
    catch (cause) { if (isCurrent()) error.value = cause instanceof Error ? cause.message : 'Impossible de charger les sous-périodes.'; }
    finally { if (isCurrent()) loading.value = false; }
  }
  const retry = () => retryTask?.();

  async function loadChildren(target: string[], isCurrent: () => boolean, signal: AbortSignal, force: boolean, extra: ListPeriod[] = []) {
    for (const originalId of new Set(target)) {
      if (!isCurrent()) return;
      const id = resolveId(originalId);
      // Virtual suggestions have no database ID. Their descendants come only from Wikidata.
      if (!id.startsWith('wikidata:')) await store.ensureChildrenLoaded(id);
      if (!isCurrent()) return;
      const parent = savedPeriods().find(p => p.id === id) ?? extra.find(p => p.id === id)
        ?? Object.values(suggestionsByParent.value).flat().find(p => p.id === id);
      const qid = normalizeWikidataQId(parent?.wikidata_id);
      if (!qid) continue;
      const children = await WikidataQueryService.getInstance().loadPeriodChildrenByWikidataId(qid, { signal, force });
      if (!isCurrent()) return;
      suggestionsByParent.value = { ...suggestionsByParent.value,
        [id]: children.filter(child => normalizeWikidataQId(child.id) !== qid)
          .map(child => mapWikidataGeologicalChildToListPeriod(child, id)),
      };
    }
  }

  async function scopedSearchPath(id: string, isCurrent: () => boolean, signal: AbortSignal, force: boolean): Promise<string[] | null> {
    const outsideMessage = 'Cette période est hors de la frise. Choisissez une sous-période de ses périodes ou utilisez « Changer la racine ».';
    if (!story()?.periods.length) throw new Error(outsideMessage);
    const suffix: string[] = [];
    const seen = new Set<string>();
    const fetched: ListPeriod[] = [];
    let current: string | null = id;
    for (let depth = 0; current && depth < 100; depth++) {
      if (!isCurrent()) return null;
      if (seen.has(current)) throw new Error('Le chemin de cette période contient un cycle.');
      seen.add(current);
      if (inStory(current)) {
        const target = [...storyPath(current), ...suffix];
        await loadChildren(target, isCurrent, signal, force, fetched);
        if (!isCurrent()) return null;
        for (const period of fetched) store.cachePeriod(period);
        return target;
      }
      const period: ListPeriod = store.periodById(current) ?? await PeriodApiService.getInstance().getPeriod(current);
      if (!isCurrent()) return null;
      fetched.push(period);
      suffix.unshift(current);
      current = getStoryPeriodParentId(period);
    }
    throw new Error(outsideMessage);
  }

  const pick = (period: ListPeriod) => run(async (isCurrent, signal, force) => {
    if (inStory(period.id)) {
      const existingIndex = showExternal.value ? path.value.indexOf(period.id) : -1;
      const target = existingIndex >= 0 ? path.value.slice(0, existingIndex + 1) : storyPath(period.id);
      if (showExternal.value) await loadChildren(target, isCurrent, signal, force);
      if (!isCurrent()) return;
      path.value = target; selectedId.value = period.id;
      return;
    }
    const target = await scopedSearchPath(period.id, isCurrent, signal, force);
    if (!target || !isCurrent()) return;
    showExternal.value = true; path.value = target; selectedId.value = period.id;
  });

  const selectRow = (id: string, column: number) => {
    const target = !showExternal.value && inStory(id) ? storyPath(id) : [...path.value.slice(0, column), id];
    return run(async (isCurrent, signal, force) => {
      if (showExternal.value) { await loadChildren([id], isCurrent, signal, force); if (!isCurrent()) return; }
      path.value = target; selectedId.value = id;
    });
  };

  const toggleExternal = (enabled: boolean) => {
    if (!enabled) {
      cancel(); showExternal.value = false;
      if (selectedId.value && inStory(selectedId.value)) path.value = storyPath(selectedId.value);
      else clear();
      return Promise.resolve();
    }
    showExternal.value = true;
    const target = path.value.length ? [...path.value] : getStoryPeriodRoots(story()?.periods ?? []).map(p => p.id);
    return run(async (isCurrent, signal, force) => {
      await loadChildren(target, isCurrent, signal, force);
      if (!isCurrent()) return;
      showExternal.value = true;
    });
  };

  watch(() => story()?.id, () => { clear(); showExternal.value = false; suggestionsByParent.value = {}; }, { flush: 'sync' });
  watch(() => story()?.periods.map(p => `${p.id}:${getStoryPeriodParentId(p) ?? ''}`).sort().join(','), () => {
    cancel();
    path.value = path.value.map(resolveId);
    if (selectedId.value) selectedId.value = resolveId(selectedId.value);
    const id = selectedId.value;
    // Reusing an existing catalogue entity must respect its saved hierarchy.
    const disconnected = path.value.some((periodId, index) => index > 0 && inStory(periodId)
      && getStoryPeriodParentId(story()?.periods.find(p => p.id === periodId) ?? {}) !== path.value[index - 1]);
    if (id && inStory(id) && disconnected) path.value = storyPath(id);
    if (id && !showExternal.value && inStory(id)) path.value = storyPath(id);
    else if (id && (!showExternal.value || !inStory(path.value[0]))) clear();
  }, { flush: 'sync' });
  onScopeDispose(cancel);
  return { additionalPeriods, selectedId, path, showExternal, loading, error, pick, selectRow, toggleExternal, clear, cancel, retry };
}
