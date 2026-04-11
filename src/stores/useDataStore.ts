import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ListPeriod, ListEvent, ListStory } from '@/types/database';
import { PeriodApiService } from '@/services/PeriodApiService';
import { EventApiService } from '@/services/EventApiService';
import { StoryApiService } from '@/services/StoryApiService';

export const useDataStore = defineStore('data', () => {
  const periods = ref<ListPeriod[]>([]);
  const events = ref<ListEvent[]>([]);
  const stories = ref<ListStory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Suivi des parents dont les enfants sont déjà chargés
  const loadedParents = new Set<string>();
  // Suivi des stories dont les périodes sont déjà chargées + cache des résultats
  const loadedStories = new Set<string>();
  const storyPeriodsCache = new Map<string, ListPeriod[]>();
  let rootsLoaded = false;

  // ─── Getters ────────────────────────────────────────────────────────────────

  const rootPeriods = computed(() =>
    periods.value.filter((p: any) => !p.hasParent && !p.parentId)
  );

  function periodById(id: string) {
    return periods.value.find(p => p.id === id) ?? null;
  }

  function eventById(id: string) {
    return events.value.find(e => e.id === id) ?? null;
  }

  function storyById(id: string) {
    return stories.value.find(s => s.id === id) ?? null;
  }

  function childrenOf(parentId: string): ListPeriod[] {
    return periods.value.filter(p => p.parentId === parentId);
  }

  // ─── Chargement des racines ─────────────────────────────────────────────────

  async function ensureRootsLoaded(): Promise<void> {
    if (rootsLoaded && periods.value.length > 0) return;
    loading.value = true;
    error.value = null;
    try {
      const data = await PeriodApiService.getInstance().getListPeriods();
      // Fusionner en évitant les doublons (peut déjà avoir des enfants en mémoire)
      const existingIds = new Set(periods.value.map(p => p.id));
      const toAdd = data.filter(p => !existingIds.has(p.id));
      periods.value = [...periods.value, ...toAdd];
      rootsLoaded = true;
    } catch (e: any) {
      error.value = e?.message || 'Erreur lors du chargement des périodes';
    } finally {
      loading.value = false;
    }
  }

  // ─── Chargement des enfants à la demande ────────────────────────────────────

  async function ensureChildrenLoaded(parentId: string): Promise<ListPeriod[]> {
    if (!loadedParents.has(parentId)) {
      try {
        const children = await PeriodApiService.getInstance().loadChildren(parentId);
        const existingIds = new Set(periods.value.map(p => p.id));
        const existingQids = new Set(periods.value.map(p => p.wikidata_id).filter(Boolean));
        const toAdd = children.filter(
          c => !existingIds.has(c.id) && !existingQids.has(c.wikidata_id ?? '')
        );
        if (toAdd.length > 0) {
          periods.value = [...periods.value, ...toAdd];
        }
        loadedParents.add(parentId);
      } catch (e: any) {
        console.error(`[store] Erreur chargement enfants de ${parentId}:`, e);
      }
    }
    return periods.value.filter(p => p.parentId === parentId);
  }

  // ─── Chargement des périodes d'une story ────────────────────────────────────

  async function ensureStoryPeriodsLoaded(storyId: string): Promise<ListPeriod[]> {
    if (!loadedStories.has(storyId)) {
      try {
        const raw = await StoryApiService.getInstance().getStoryPeriods(storyId);
        const mapped = raw.map((p: any) => PeriodApiService.mapPeriod(p));
        const existingIds = new Set(periods.value.map(p => p.id));
        const toAdd = mapped.filter((p: ListPeriod) => !existingIds.has(p.id));
        if (toAdd.length > 0) {
          periods.value = [...periods.value, ...toAdd];
        }
        storyPeriodsCache.set(storyId, mapped);
        loadedStories.add(storyId);
      } catch (e: any) {
        console.error(`[store] Erreur chargement story ${storyId}:`, e);
      }
    }
    return storyPeriodsCache.get(storyId) ?? [];
  }

  // ─── Chargement des événements ──────────────────────────────────────────────

  async function ensureEventsLoaded(): Promise<void> {
    if (events.value.length > 0) return;
    try {
      events.value = await EventApiService.getInstance().getListEvents();
    } catch (e: any) {
      console.error('[store] Erreur chargement événements:', e);
    }
  }

  /** `force: true` recharge toujours (ex. liste avec bornes temporelles agrégées). */
  async function ensureStoriesLoaded(force = false): Promise<void> {
    if (!force && stories.value.length > 0) return;
    try {
      stories.value = await StoryApiService.getInstance().getListStories();
    } catch (e: any) {
      console.error('[store] Erreur chargement stories:', e);
    }
  }

  // ─── Compat. ascendante ─────────────────────────────────────────────────────

  /** @deprecated Préférer ensureRootsLoaded() + ensureChildrenLoaded() */
  async function ensureDataLoaded(): Promise<void> {
    await ensureRootsLoaded();
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  function updatePeriods(newPeriods: ListPeriod[]) {
    periods.value = newPeriods;
  }

  function updateEvents(newEvents: ListEvent[]) {
    events.value = newEvents;
  }

  function updateStories(newStories: ListStory[]) {
    stories.value = newStories;
  }

  function resetData() {
    periods.value = [];
    events.value = [];
    stories.value = [];
    loadedParents.clear();
    loadedStories.clear();
    storyPeriodsCache.clear();
    rootsLoaded = false;
  }

  return {
    // State
    periods,
    events,
    stories,
    loading,
    error,
    // Getters
    rootPeriods,
    periodById,
    eventById,
    storyById,
    childrenOf,
    // Actions
    ensureRootsLoaded,
    ensureChildrenLoaded,
    ensureStoryPeriodsLoaded,
    ensureEventsLoaded,
    ensureStoriesLoaded,
    ensureDataLoaded,
    updatePeriods,
    updateEvents,
    updateStories,
    resetData,
  };
});
