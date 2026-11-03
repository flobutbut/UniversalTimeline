import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { EventApiService } from '@/services/EventApiService';
import { PeriodApiService } from '@/services/PeriodApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { withEventImportance } from '@/lib/eventImportance';
import { useToast } from './useToast';
import type { EventImportance, Story, StoryAnchor, ListPeriod, ListEvent, ListStory } from '@/types/database';
import { useLatestRequest } from './useLatestRequest';
import type { EditableItem } from '@/types/editForm';
import { previewStoryFromPeriod, type StoryFromPeriodPreview } from '@/lib/storyFromPeriod';

export interface DatabaseViewState {
  loading: boolean;
  error: string | null;
  loadingDetails: boolean;
  loadingError: string | null;
  loadingStoryDetails: boolean;
  storyError: string | null;
}

export interface ModalState {
  showAddModal: boolean;
  showEditModal: boolean;
  currentType: 'period' | 'event' | 'story';
  currentItem: EditableItem | null;
  currentMode: 'create' | 'edit';
}

export interface SearchState {
  periodSearch: string;
  eventSearch: string;
}

export interface DragDropState {
  draggedItem: { type: 'period' | 'event', data: { id: string } } | null;
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
    storyError: null,
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

  const selectedStoryId = ref<string | null>(null);
  const relationsBusy = ref(false);
  const initialRequests = useLatestRequest();
  const detailRequests = useLatestRequest();
  const retryRequests = useLatestRequest();
  const editRequests = useLatestRequest();

  // Computed
  const filteredPeriods = computed(() => {
    const searchLower = searchState.value.periodSearch.toLowerCase();
    const transformed = periods.value.map(p => ({
      ...p,
      hasParent: typeof p.hasParent === 'boolean' ? p.hasParent : !!p.parentId,
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

  const auth = useAuthStore();
  const filteredStories = computed(() => stories.value.filter(auth.canEditStory));

  // Modales
  const handleAddPeriod = () => { closeEditModal(); modalState.value = { ...modalState.value, currentType: 'period', currentMode: 'create', showAddModal: true }; };
  const handleAddEvent = () => { closeEditModal(); modalState.value = { ...modalState.value, currentType: 'event', currentMode: 'create', showAddModal: true }; };
  const handleAddStory = () => { closeEditModal(); modalState.value = { ...modalState.value, currentType: 'story', currentMode: 'create', showAddModal: true }; };
  const handleEditPeriod = (period: ListPeriod) => openEditModal('period', period);
  const handleEditEvent = (event: ListEvent) => openEditModal('event', event);
  const handleEditStory = (story: ListStory) => openEditModal('story', story);
  const closeAddModal = () => { modalState.value.showAddModal = false; modalState.value.currentItem = null; };
  const closeEditModal = () => { editRequests.cancel(); state.value.loadingDetails = false; modalState.value.showEditModal = false; modalState.value.currentItem = null; };

  const openEditModal = async (type: 'period' | 'event' | 'story', item: { id: string }) => {
    const isCurrent = editRequests.begin();
    if (modalState.value.showAddModal) closeAddModal();
    modalState.value.currentType = type;
    modalState.value.currentMode = 'edit';

    try {
      state.value.loadingDetails = true;
      state.value.loadingError = null;

      if (type === 'period') {
        const period = await PeriodApiService.getInstance().getPeriod(item.id);
        if (!isCurrent()) return;
        modalState.value.currentItem = { ...period, description: period.description || { fr: '', en: '' }, categories: period.categories || [] };
      } else if (type === 'event') {
        const event = events.value.find(e => e.id === item.id) ?? (await EventApiService.getInstance().getListEvents()).find(event => event.id === item.id);
        if (!isCurrent()) return;
        if (!event) throw new Error('Événement non trouvé dans le store');
        modalState.value.currentItem = { ...event, description: event.description || { fr: '', en: '' }, categories: event.categories || [] };
      } else if (type === 'story') {
        const story = stories.value.find(s => s.id === item.id);
        if (!story) throw new Error('Frise non trouvée dans le store');
        modalState.value.currentItem = { ...story, description: story.description || { fr: '', en: '' }, categories: story.categories || [] };
      }

      state.value.loadingDetails = false;
      modalState.value.showEditModal = true;
    } catch (error: unknown) {
      if (!isCurrent()) return;
      state.value.loadingError = 'Erreur lors du chargement des données';
      state.value.loadingDetails = false;
      toast.show(error instanceof Error && error.message.includes('404') ? 'L\'élément n\'a pas été trouvé' : 'Erreur lors du chargement des données', 'error');
    }
  };

  const loadInitialData = async () => {
    const isCurrent = initialRequests.begin();
    state.value.loading = true;
    state.value.error = null;
    try {
      await Promise.all([dataStore.ensureRootsLoaded(), dataStore.ensureEventsLoaded(), dataStore.ensureStoriesLoaded()]);
    } catch (cause) {
      if (isCurrent()) state.value.error = cause instanceof Error ? cause.message : 'Erreur lors du chargement des données';
    } finally {
      if (isCurrent()) state.value.loading = false;
    }
  };

  const selectStory = async (story: ListStory) => {
    closeEditModal();
    const isCurrent = detailRequests.begin();
    selectedStoryId.value = story.id;
    selectedStory.value = null;
    state.value.storyError = null;
    state.value.loadingStoryDetails = true;
    try {
      const detail = await dataStore.ensureStoryLoaded(story.id);
      if (isCurrent()) selectedStory.value = detail;
    } catch (cause) {
      if (isCurrent()) state.value.storyError = cause instanceof Error ? cause.message : 'Erreur lors du chargement de la frise';
    } finally {
      if (isCurrent()) state.value.loadingStoryDetails = false;
    }
  };

  const retryStory = async () => {
    const story = stories.value.find(s => s.id === selectedStoryId.value);
    if (!story) return;
    const isCurrent = retryRequests.begin();
    try {
      await Promise.all([
        selectedStory.value?.id === story.id ? refreshSelectedStory(story.id) : selectStory(story),
        dataStore.ensureStoriesLoaded(),
      ]);
    } catch {
      if (isCurrent() && selectedStoryId.value === story.id) state.value.storyError = 'Impossible de recharger les données de la frise. Réessayez le chargement.';
    }
  };

  // Refresh the selected record without clearing the panel's navigation state.
  const refreshSelectedStory = async (storyId: string) => {
    if (selectedStoryId.value !== storyId) return;
    const isCurrent = detailRequests.begin();
    state.value.storyError = null;
    try {
      const detail = await dataStore.ensureStoryLoaded(storyId);
      if (isCurrent() && selectedStoryId.value === storyId) selectedStory.value = detail;
    } finally {
      if (isCurrent()) state.value.loadingStoryDetails = false;
    }
  };

  const clearStorySelection = () => {
    closeEditModal();
    detailRequests.cancel();
    retryRequests.cancel();
    selectedStoryId.value = null;
    selectedStory.value = null;
    state.value.loadingStoryDetails = false;
    state.value.storyError = null;
  };

  // Capture the target before awaiting: changing tabs must never mutate another story.
  const mutateAssociations = async (kind: 'period' | 'event', ids: string[], remove = false, parentPeriodId?: string | null) => {
    const storyId = selectedStory.value?.id;
    if (!storyId || relationsBusy.value || !ids.length) return;
    const service = StoryApiService.getInstance();
    relationsBusy.value = true;
    let committed = false;
    try {
      await service.changeAssociations(storyId, kind, ids, remove, ...(parentPeriodId !== undefined ? [parentPeriodId] : []));
      committed = true;
      dataStore.invalidateStory(storyId);
      await Promise.all([
        dataStore.ensureStoriesLoaded(),
        refreshSelectedStory(storyId),
      ]);
      const total = new Set(ids).size;
      toast.show(`${total} association(s) ${remove ? 'retirée(s)' : 'ajoutée(s)'}`, 'success');
    } catch (cause) {
      dataStore.invalidateStory(storyId);
      const message = committed
        ? 'Associations enregistrées ; impossible de recharger les données. Réessayez le chargement.'
        : mutationErrorMessage(cause, 'Impossible de modifier les associations de la frise.');
      toast.show(message, 'error');
      if (selectedStoryId.value === storyId) state.value.storyError = message;
    } finally {
      relationsBusy.value = false;
    }
  };

  const handleDragStart = (event: DragEvent, type: 'period' | 'event', item: { id: string }) => {
    dragDropState.value.draggedItem = { type, data: item };
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };
  const handleDrop = async (_event: DragEvent) => {
    dragDropState.value.isDragOver = false;
    const item = dragDropState.value.draggedItem;
    dragDropState.value.draggedItem = null;
    if (!item) return;
    if (!selectedStory.value) {
      toast.show('Veuillez sélectionner une frise avant de déposer un élément', 'error');
      return;
    }
    await mutateAssociations(item.type, [item.data.id]);
  };
  const handleDragOver = (_event: DragEvent) => { if (dragDropState.value.draggedItem) dragDropState.value.isDragOver = true; };
  const handleDragLeave = (_event: DragEvent) => { dragDropState.value.isDragOver = false; };
  const removePeriodFromStory = (id: string) => mutateAssociations('period', [id], true);
  // ─── Frise créée depuis une période : copie, la frise d'origine reste intacte ───
  const storyFromPeriod = ref<{ storyId: string; preview: StoryFromPeriodPreview; busy: boolean; error: string | null } | null>(null);
  const openStoryFromPeriod = (periodId: string) => {
    const story = selectedStory.value;
    const preview = story && previewStoryFromPeriod(story.periods, story.events, periodId);
    if (!story || !preview || relationsBusy.value) return;
    storyFromPeriod.value = { storyId: story.id, preview, busy: false, error: null };
  };
  const closeStoryFromPeriod = () => { if (!storyFromPeriod.value?.busy) storyFromPeriod.value = null; };
  // Another frise selected: the pending dialog no longer describes it (a running request still completes).
  watch(selectedStoryId, id => { if (storyFromPeriod.value && !storyFromPeriod.value.busy && storyFromPeriod.value.storyId !== id) storyFromPeriod.value = null; });
  /** One request, never resent: a lost response asks for a reload before retrying. */
  const confirmStoryFromPeriod = async (title: string) => {
    const pending = storyFromPeriod.value;
    if (!pending || pending.busy || relationsBusy.value) return;
    pending.busy = true; pending.error = null; relationsBusy.value = true;
    let created: Awaited<ReturnType<StoryApiService['createStoryFromPeriod']>> | null = null;
    try {
      created = await StoryApiService.getInstance().createStoryFromPeriod(pending.storyId, pending.preview.periodId, title);
      storyFromPeriod.value = null;
      dataStore.invalidateStory(pending.storyId);
      const events = created.eventCount ? ` et ${created.eventCount} événement${created.eventCount > 1 ? 's' : ''}` : '';
      toast.show(`Frise « ${title} » créée avec ${created.periodCount} période${created.periodCount > 1 ? 's' : ''}${events}.`, 'success');
      await Promise.all([dataStore.ensureStoriesLoaded(true), refreshSelectedStory(pending.storyId)]);
    } catch (cause) {
      if (created) toast.show('Frise créée ; impossible de recharger les données. Réessayez le chargement.', 'error');
      else pending.error = mutationErrorMessage(cause, 'Impossible de créer la frise depuis cette période.');
    } finally {
      pending.busy = false; relationsBusy.value = false;
    }
  };
  const changeRootPeriod = async (periodId: string) => {
    const storyId = selectedStory.value?.id;
    if (!storyId || relationsBusy.value) return;
    relationsBusy.value = true;
    let committed = false;
    try {
      await StoryApiService.getInstance().changeRootPeriod(storyId, periodId);
      committed = true;
      dataStore.invalidateStory(storyId);
      await Promise.all([dataStore.ensureStoriesLoaded(), refreshSelectedStory(storyId)]);
      toast.show('Racine de la frise modifiée', 'success');
    } catch (cause) {
      dataStore.invalidateStory(storyId);
      const message = committed ? 'Racine enregistrée ; impossible de recharger la frise. Réessayez le chargement.'
        : mutationErrorMessage(cause, 'Impossible de changer la racine de la frise.');
      if (selectedStoryId.value === storyId) state.value.storyError = message;
      toast.show(message, 'error');
    } finally { relationsBusy.value = false; }
  };
  const removeEventFromStory = (id: string) => mutateAssociations('event', [id], true);
  const addPeriodsToStory = (ids: string[], parentPeriodId?: string | null) => mutateAssociations('period', ids, false, parentPeriodId);
  const addEventsToStory = (ids: string[]) => mutateAssociations('event', ids);

  // Related-story actions share the same captured target and refresh rules as period/event links.
  const mutateRelatedStories = async (operation: (parentId: string) => Promise<string>) => {
    const parentId = selectedStory.value?.id;
    if (!parentId || relationsBusy.value) return;
    relationsBusy.value = true;
    let committed = false;
    try {
      const message = await operation(parentId);
      committed = true;
      dataStore.invalidateStories();
      await Promise.all([
        dataStore.ensureStoriesLoaded(),
        refreshSelectedStory(parentId),
      ]);
      toast.show(message, 'success');
    } catch (cause) {
      dataStore.invalidateStories();
      const message = committed ? 'Relations enregistrées ; impossible de recharger les données. Réessayez le chargement.'
        : mutationErrorMessage(cause, 'Impossible de modifier les relations de la frise.');
      toast.show(message, 'error');
      if (selectedStoryId.value === parentId) state.value.storyError = message;
    } finally {
      relationsBusy.value = false;
    }
  };

  const addChildStoriesToStory = (childIds: string[], anchor?: StoryAnchor) => mutateRelatedStories(async parentId => {
    const ids = [...new Set(childIds)];
    const service = StoryApiService.getInstance();
    await service.changeEntryPoints(parentId, ids, anchor);
    return `${ids.length} frise(s) rattachée(s)`;
  });
  const removeChildStoryFromStory = (childId: string, anchor?: StoryAnchor) => mutateRelatedStories(async parentId => {
    await StoryApiService.getInstance().changeEntryPoints(parentId, [childId], anchor, true);
    return 'Frise détachée';
  });
  const addEventAnchorToStory = (childId: string, eventId: string) => mutateRelatedStories(async parentId => {
    await StoryApiService.getInstance().changeEntryPoints(parentId, [childId], { type: 'event', id: eventId });
    return 'Ancre ajoutée';
  });
  const removeEventAnchorFromStory = (childId: string, eventId: string) => mutateRelatedStories(async parentId => {
    await StoryApiService.getInstance().changeEntryPoints(parentId, [childId], { type: 'event', id: eventId }, true);
    return 'Ancre retirée';
  });
  // L'importance ne change ni la liste des frises ni leurs relations : affichage immédiat, une seule
  // écriture, cache corrigé sur place. Les écritures restent dans l'ordre des clics.
  let importanceWrites: Promise<void> = Promise.resolve();
  const changeEventImportance = (eventId: string, importance: EventImportance) => {
    const storyId = selectedStory.value?.id;
    if (!storyId) return importanceWrites;
    selectedStory.value = withEventImportance(selectedStory.value!, eventId, importance);
    importanceWrites = importanceWrites.then(async () => {
      try {
        await StoryApiService.getInstance().setEventImportance(storyId, eventId, importance);
        dataStore.patchStoryEventImportance(storyId, eventId, importance);
      } catch (cause) {
        // Pas de nouvel envoi automatique : la frise est relue pour afficher l'état enregistré.
        toast.show(mutationErrorMessage(cause, 'Impossible d’enregistrer l’importance de l’événement.'), 'error');
        dataStore.invalidateStory(storyId);
        await refreshSelectedStory(storyId).catch(() => undefined);
      }
    });
    return importanceWrites;
  };
  const addParentEntryToStory = (sourceId: string, periodId: string) => mutateRelatedStories(async targetId => {
    await StoryApiService.getInstance().changeEntryPoints(sourceId, [targetId], { type: 'period', id: periodId });
    return 'Point d’entrée ajouté';
  });
  const removeParentEntryFromStory = (sourceId: string, anchor?: StoryAnchor) => mutateRelatedStories(async targetId => {
    await StoryApiService.getInstance().changeEntryPoints(sourceId, [targetId], anchor, true);
    return 'Point d’entrée retiré';
  });

  return {
    state, modalState, searchState: searchState.value, dragDropState: dragDropState.value, selectedStory,
    filteredPeriods, filteredEvents, filteredStories, selectedStoryId, relationsBusy, retryStory, clearStorySelection,
    handleAddPeriod, handleAddEvent, handleAddStory,
    handleEditPeriod, handleEditEvent, handleEditStory,
    closeAddModal, closeEditModal, openEditModal,
    loadInitialData,
    handleDragStart, handleDrop, handleDragOver, handleDragLeave,
    selectStory,
    removePeriodFromStory,
    storyFromPeriod, openStoryFromPeriod, closeStoryFromPeriod, confirmStoryFromPeriod,
    changeRootPeriod,
    removeEventFromStory,
    addPeriodsToStory,
    addEventsToStory,
    addChildStoriesToStory,
    removeChildStoryFromStory,
    addEventAnchorToStory,
    removeEventAnchorFromStory,
    changeEventImportance,
    addParentEntryToStory,
    removeParentEntryFromStory,
    sharedLoading, sharedError,
  };
}
