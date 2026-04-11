import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { useToast } from './useToast';
import type { Event, Story, ListPeriod, ListEvent, ListStory } from '@/types/database';
import { temporalBoundsFromStoryDetail } from '@/utils/storyTemporalBounds';

export interface DatabaseViewState {
  loading: boolean;
  error: string | null;
  loadingDetails: boolean;
  loadingError: string | null;
  loadingStoryDetails: boolean;
}

export interface ModalState {
  showAddModal: boolean;
  showEditModal: boolean;
  currentType: 'period' | 'event' | 'story';
  currentItem: any;
  currentMode: 'create' | 'edit';
}

export interface SearchState {
  periodSearch: string;
  eventSearch: string;
}

export interface DragDropState {
  draggedItem: { type: 'period' | 'event', data: any } | null;
  isDragOver: boolean;
}

export function useDatabaseView() {
  const dataStore = useDataStore();
  const { periods, events, stories, loading: sharedLoading, error: sharedError } = storeToRefs(dataStore);
  const toast = useToast();

  const state = ref<DatabaseViewState>({
    loading: false,
    error: null,
    loadingDetails: false,
    loadingError: null,
    loadingStoryDetails: false,
  });

  const modalState = ref<ModalState>({
    showAddModal: false,
    showEditModal: false,
    currentType: 'period',
    currentItem: null,
    currentMode: 'create',
  });

  const searchState = ref<SearchState>({ periodSearch: '', eventSearch: '' });
  const dragDropState = ref<DragDropState>({ draggedItem: null, isDragOver: false });
  const selectedStory = ref<Story | null>(null);

  watch(sharedLoading, v => { state.value.loading = v; }, { immediate: true });

  // Computed
  const filteredPeriods = computed(() => {
    const searchLower = searchState.value.periodSearch.toLowerCase();
    const transformed = periods.value.map((p: any) => ({
      ...p,
      hasParent: typeof p.hasParent === 'boolean' ? p.hasParent : !!(p.parent_id),
      children: Array.isArray(p.children) ? p.children : [],
    }));
    return transformed
      .filter(p => !p.hasParent)
      .filter(p => {
        const label = p.label?.fr;
        return typeof label === 'string' ? label.toLowerCase().includes(searchLower) : false;
      });
  });

  const filteredEvents = computed(() => {
    const searchLower = searchState.value.eventSearch.toLowerCase();
    return events.value.filter(e => {
      const label = e.label?.fr;
      return typeof label === 'string' ? label.toLowerCase().includes(searchLower) : false;
    });
  });

  const filteredStories = computed(() => stories.value);

  // Modales
  const handleAddPeriod = () => { modalState.value = { ...modalState.value, currentType: 'period', currentMode: 'create', showAddModal: true }; };
  const handleAddEvent = () => { modalState.value = { ...modalState.value, currentType: 'event', currentMode: 'create', showAddModal: true }; };
  const handleAddStory = () => { modalState.value = { ...modalState.value, currentType: 'story', currentMode: 'create', showAddModal: true }; };
  const handleEditPeriod = (period: ListPeriod) => openEditModal('period', period);
  const handleEditEvent = (event: ListEvent) => openEditModal('event', event);
  const handleEditStory = (story: ListStory) => openEditModal('story', story);
  const closeAddModal = () => { modalState.value.showAddModal = false; modalState.value.currentItem = null; };
  const closeEditModal = () => { modalState.value.showEditModal = false; modalState.value.currentItem = null; };

  const openEditModal = async (type: 'period' | 'event' | 'story', item: any) => {
    if (modalState.value.showAddModal) closeAddModal();
    modalState.value.currentType = type;
    modalState.value.currentMode = 'edit';

    try {
      state.value.loadingDetails = true;
      state.value.loadingError = null;

      if (type === 'period') {
        const period = periods.value.find(p => p.id === item.id);
        if (!period) throw new Error('Période non trouvée dans le store');
        modalState.value.currentItem = { ...period, description: (period as any).description || { fr: '', en: '' }, categories: period.categories || [] };
      } else if (type === 'event') {
        const event = events.value.find(e => e.id === item.id);
        if (!event) throw new Error('Événement non trouvé dans le store');
        modalState.value.currentItem = { ...event, description: (event as any).description || { fr: '', en: '' }, categories: event.categories || [] };
      } else if (type === 'story') {
        const story = stories.value.find(s => s.id === item.id);
        if (!story) throw new Error('Story non trouvée dans le store');
        modalState.value.currentItem = { ...story, description: (story as any).description || { fr: '', en: '' }, categories: story.categories || [] };
      }

      state.value.loadingDetails = false;
      modalState.value.showEditModal = true;
    } catch (error: any) {
      state.value.loadingError = 'Erreur lors du chargement des données';
      state.value.loadingDetails = false;
      toast.show(error.message?.includes('404') ? 'L\'élément n\'a pas été trouvé' : 'Erreur lors du chargement des données', 'error');
    }
  };

  function patchStoryBoundsInList(storyId: string, bounds: { start?: string; end?: string }) {
    const list = stories.value;
    const idx = list.findIndex((s) => s.id === storyId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = {
      ...list[idx],
      startDate: bounds.start,
      endDate: bounds.end,
    };
    dataStore.updateStories(next);
  }

  async function mergeStoriesTemporalBoundsFromApi() {
    const rows = await StoryApiService.getInstance().getStoriesTemporalBounds();
    if (!rows.length) return;
    const byId = new Map(rows.map((r) => [r.story_id, r]));
    dataStore.updateStories(
      stories.value.map((s) => {
        const r = byId.get(s.id);
        if (!r) return s;
        const sd = r.start_date != null && String(r.start_date).trim() !== '' ? String(r.start_date).trim() : s.startDate;
        const ed = r.end_date != null && String(r.end_date).trim() !== '' ? String(r.end_date).trim() : s.endDate;
        return { ...s, startDate: sd, endDate: ed };
      })
    );
  }

  const loadInitialData = async () => {
    await dataStore.ensureDataLoaded();
    await dataStore.ensureEventsLoaded();
    await dataStore.ensureStoriesLoaded(true);
    try {
      await mergeStoriesTemporalBoundsFromApi();
    } catch (e) {
      console.warn('[useDatabaseView] mergeStoriesTemporalBoundsFromApi', e);
    }
  };

  watch(
    selectedStory,
    (s) => {
      if (!s?.id) return;
      patchStoryBoundsInList(s.id, temporalBoundsFromStoryDetail(s));
    },
    { deep: true }
  );

  // Drag & Drop
  const handleDragStart = (event: DragEvent, type: 'period' | 'event', item: any) => {
    dragDropState.value.draggedItem = { type, data: item };
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (_event: DragEvent) => {
    dragDropState.value.isDragOver = false;
    if (!dragDropState.value.draggedItem) return;
    if (!selectedStory.value) {
      toast.show('Veuillez sélectionner une story avant de déposer un élément', 'error');
      return;
    }

    const storyService = StoryApiService.getInstance();
    const draggedItem = dragDropState.value.draggedItem;

    try {
      if (draggedItem.type === 'period') {
        await storyService.addPeriodToStory(selectedStory.value.id, draggedItem.data.id);
        const updated = { ...selectedStory.value, periods: [...(selectedStory.value.periods || [])] };
        if (!updated.periods.find((p: any) => p.id === draggedItem.data.id)) updated.periods.push(draggedItem.data);
        selectedStory.value = updated;
        toast.show('Période ajoutée à la story avec succès', 'success');
      } else {
        await storyService.addEventToStory(selectedStory.value.id, draggedItem.data.id);
        const updated = { ...selectedStory.value, events: [...(selectedStory.value.events || [])] };
        if (!updated.events.find((e: any) => e.id === draggedItem.data.id)) updated.events.push(draggedItem.data);
        selectedStory.value = updated;
        toast.show('Événement ajouté à la story avec succès', 'success');
      }
    } catch {
      toast.show('Erreur lors de l\'ajout de l\'élément à la story', 'error');
    }
  };

  const handleDragOver = (_event: DragEvent) => { if (dragDropState.value.draggedItem) dragDropState.value.isDragOver = true; };
  const handleDragLeave = (_event: DragEvent) => { dragDropState.value.isDragOver = false; };

  const selectStory = async (story: ListStory) => {
    try {
      state.value.loadingStoryDetails = true;
      selectedStory.value = await StoryApiService.getInstance().getStory(story.id);
    } catch {
      toast.show('Erreur lors du chargement des détails de la story', 'error');
      selectedStory.value = null;
    } finally {
      state.value.loadingStoryDetails = false;
    }
  };

  const removePeriodFromStory = async (periodId: string) => {
    if (!selectedStory.value) return;
    try {
      await StoryApiService.getInstance().removePeriodFromStory(selectedStory.value.id, periodId);
      selectedStory.value = { ...selectedStory.value, periods: selectedStory.value.periods?.filter((p: any) => p.id !== periodId) };
      toast.show('Période supprimée de la story', 'success');
    } catch {
      toast.show('Erreur lors de la suppression de la période', 'error');
    }
  };

  const removeEventFromStory = async (eventId: string) => {
    if (!selectedStory.value) return;
    try {
      await StoryApiService.getInstance().removeEventFromStory(selectedStory.value.id, eventId);
      selectedStory.value = { ...selectedStory.value, events: selectedStory.value.events?.filter((e: any) => e.id !== eventId) };
      toast.show('Événement supprimé de la story', 'success');
    } catch {
      toast.show('Erreur lors de la suppression de l\'événement', 'error');
    }
  };

  const addPeriodsToStory = async (periodIds: string[]) => {
    const story = selectedStory.value;
    if (!story) return;
    const storyService = StoryApiService.getInstance();
    let added = 0;
    for (const id of periodIds) {
      try {
        await storyService.addPeriodToStory(story.id, id);
        added++;
      } catch {
        // continue les autres
      }
    }
    if (added > 0) {
      selectedStory.value = await storyService.getStory(story.id);
      toast.show(`${added} période(s) ajoutée(s) à la story`, 'success');
    } else {
      toast.show('Erreur lors de l\'ajout des périodes', 'error');
    }
  };

  const addEventsToStory = async (eventIds: string[]) => {
    let story = selectedStory.value;
    if (!story) return;
    const storyService = StoryApiService.getInstance();
    let added = 0;
    for (const id of eventIds) {
      try {
        await storyService.addEventToStory(story.id, id);
        const event = events.value.find(e => e.id === id);
        if (event && !story.events?.find((e: any) => e.id === id)) {
          story = { ...story, events: [...(story.events || []), event as Event] };
          selectedStory.value = story;
        }
        added++;
      } catch {
        // continue les autres
      }
    }
    if (added > 0) toast.show(`${added} événement(s) ajouté(s) à la story`, 'success');
    else toast.show('Erreur lors de l\'ajout des événements', 'error');
  };

  return {
    state, modalState, searchState: searchState.value, dragDropState: dragDropState.value, selectedStory,
    filteredPeriods, filteredEvents, filteredStories,
    handleAddPeriod, handleAddEvent, handleAddStory,
    handleEditPeriod, handleEditEvent, handleEditStory,
    closeAddModal, closeEditModal, openEditModal,
    loadInitialData,
    handleDragStart, handleDrop, handleDragOver, handleDragLeave,
    selectStory, removePeriodFromStory, removeEventFromStory, addPeriodsToStory, addEventsToStory,
    sharedLoading, sharedError,
  };
}
