import { ref, computed, watch } from 'vue';
import { useDatabaseDataStore } from './useDatabaseDataStore';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import type { Event, Period, Story, ListPeriod, ListEvent, ListStory } from '@/types/database';

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
  const databaseService = DatabaseViewService.getInstance();
  const queryService = DatabaseQueryService.getInstance();
  const {
    periods,
    events,
    stories,
    loading: sharedLoading,
    error: sharedError,
    loadInitialData: sharedLoadInitialData,
    ensureDataLoaded: sharedEnsureDataLoaded
  } = useDatabaseDataStore();

  // États réactifs propres à la vue
  const state = ref<DatabaseViewState>({
    loading: false,
    error: null,
    loadingDetails: false,
    loadingError: null,
    loadingStoryDetails: false
  });

  const modalState = ref<ModalState>({
    showAddModal: false,
    showEditModal: false,
    currentType: 'period',
    currentItem: null,
    currentMode: 'create'
  });

  const searchState = ref<SearchState>({
    periodSearch: '',
    eventSearch: ''
  });

  const dragDropState = ref<DragDropState>({
    draggedItem: null,
    isDragOver: false
  });

  const fullStories = ref<Map<string, Story>>(new Map());
  const selectedStory = ref<Story | null>(null);

  // Synchroniser state.loading avec sharedLoading
  watch(sharedLoading, (newValue) => {
    state.value.loading = newValue;
  }, { immediate: true });

  // Computed properties pour le filtrage
  const filteredPeriods = computed(() => {
    const searchLower = searchState.value.periodSearch.toLowerCase();
    
    // Transformer les périodes comme dans DatabaseViewService.getPeriods()
    const transformedPeriods = periods.value.map((p: any) => ({
      ...p,
      hasParent: typeof p.hasParent === 'boolean' ? p.hasParent : !!(p.parent_id),
      children: Array.isArray(p.children) ? p.children : [],
    }));
    
    // D'abord filtrer les périodes racines (sans parent)
    const rootPeriods = transformedPeriods.filter(period => !period.hasParent);
    
    // Puis appliquer la recherche textuelle
    return rootPeriods.filter(period => {
      const labelFr = period.label?.fr;
      return typeof labelFr === 'string' ? labelFr.toLowerCase().includes(searchLower) : false;
    });
  });

  const filteredEvents = computed(() => {
    const searchLower = searchState.value.eventSearch.toLowerCase();
    return events.value.filter(event => {
      const labelFr = event.label?.fr;
      return typeof labelFr === 'string' ? labelFr.toLowerCase().includes(searchLower) : false;
    });
  });

  const filteredStories = computed(() => {
    return stories.value;
  });

  // Fonctions pour gérer les modales
  const handleAddPeriod = () => {
    modalState.value.currentType = 'period';
    modalState.value.currentMode = 'create';
    modalState.value.showAddModal = true;
  };

  const handleAddEvent = () => {
    modalState.value.currentType = 'event';
    modalState.value.currentMode = 'create';
    modalState.value.showAddModal = true;
  };

  const handleAddStory = () => {
    modalState.value.currentType = 'story';
    modalState.value.currentMode = 'create';
    modalState.value.showAddModal = true;
  };

  const handleEditPeriod = (period: ListPeriod) => {
    openEditModal('period', period);
  };

  const handleEditEvent = (event: ListEvent) => {
    openEditModal('event', event);
  };

  const handleEditStory = (story: ListStory) => {
    openEditModal('story', story);
  };

  const closeAddModal = () => {
    modalState.value.showAddModal = false;
    modalState.value.currentItem = null;
  };

  const openEditModal = async (type: 'period' | 'event' | 'story', item: any) => {
    // Fermer d'abord la modale d'ajout si elle est ouverte
    if (modalState.value.showAddModal) {
      closeAddModal();
    }
    modalState.value.currentType = type;
    modalState.value.currentMode = 'edit';
    
    try {
      state.value.loadingDetails = true;
      state.value.loadingError = null;
      
      // Utiliser les données du store partagé au lieu de faire des appels API
      if (type === 'period') {
        const period = periods.value.find(p => p.id === item.id);
        if (period) {
          modalState.value.currentItem = {
            ...period,
            description: (period as any).description || { fr: '', en: '' },
            categories: period.categories || []
          };
          state.value.loadingDetails = false;
        } else {
          throw new Error('Période non trouvée dans le store');
        }
      } else if (type === 'event') {
        const event = events.value.find(e => e.id === item.id);
        if (event) {
          modalState.value.currentItem = {
            ...event,
            description: (event as any).description || { fr: '', en: '' },
            categories: event.categories || []
          };
          state.value.loadingDetails = false;
        } else {
          throw new Error('Événement non trouvé dans le store');
        }
      } else if (type === 'story') {
        const story = stories.value.find(s => s.id === item.id);
        if (story) {
          modalState.value.currentItem = {
            ...story,
            description: (story as any).description || { fr: '', en: '' },
            categories: story.categories || []
          };
          state.value.loadingDetails = false;
        } else {
          throw new Error('Story non trouvée dans le store');
        }
      }
      modalState.value.showEditModal = true;
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        state.value.loadingError = 'L\'élément n\'a pas été trouvé dans la base de données';
        window.showToast('L\'élément n\'a pas été trouvé dans la base de données', 'error');
      } else {
        state.value.loadingError = 'Erreur lors du chargement des données';
        window.showToast('Erreur lors du chargement des données', 'error');
      }
      state.value.loadingDetails = false;
    }
  };

  const closeEditModal = () => {
    modalState.value.showEditModal = false;
    modalState.value.currentItem = null;
  };

  // Fonction pour charger les données initiales (utilise le store partagé)
  const loadInitialData = async () => {
    await sharedEnsureDataLoaded();
  };

  // Gestion du drag & drop
  const handleDragStart = (event: DragEvent, type: 'period' | 'event', item: any) => {
    dragDropState.value.draggedItem = { type, data: item };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDrop = async (event: DragEvent) => {
    dragDropState.value.isDragOver = false;
    if (!dragDropState.value.draggedItem) return;

    if (!selectedStory.value) {
      window.showToast('Veuillez sélectionner une story avant de déposer un élément', 'error');
      return;
    }

    try {
      if (dragDropState.value.draggedItem.type === 'period') {
        await queryService.addPeriodToStory(selectedStory.value.id, dragDropState.value.draggedItem.data.id);
        // Mise à jour locale de la story sélectionnée
        const updatedStory = { ...selectedStory.value };
        if (!updatedStory.periods) updatedStory.periods = [];
        const draggedItem = dragDropState.value.draggedItem;
        if (draggedItem && !updatedStory.periods.find(p => p.id === draggedItem.data.id)) {
          updatedStory.periods.push(draggedItem.data);
        }
        selectedStory.value = updatedStory;
        fullStories.value.set(selectedStory.value.id, updatedStory);
        window.showToast('Période ajoutée à la story avec succès', 'success');
      } else if (dragDropState.value.draggedItem.type === 'event') {
        await queryService.addEventToStory(selectedStory.value.id, dragDropState.value.draggedItem.data.id);
        // Mise à jour locale de la story sélectionnée
        const updatedStory = { ...selectedStory.value };
        if (!updatedStory.events) updatedStory.events = [];
        const draggedItem = dragDropState.value.draggedItem;
        if (draggedItem && !updatedStory.events.find(e => e.id === draggedItem.data.id)) {
          updatedStory.events.push(draggedItem.data);
        }
        selectedStory.value = updatedStory;
        fullStories.value.set(selectedStory.value.id, updatedStory);
        window.showToast('Événement ajouté à la story avec succès', 'success');
      }
    } catch (error) {
      window.showToast('Erreur lors de l\'ajout de l\'élément à la story', 'error');
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (dragDropState.value.draggedItem) {
      dragDropState.value.isDragOver = true;
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    dragDropState.value.isDragOver = false;
  };

  // Fonction pour sélectionner une story
  const selectStory = async (story: ListStory) => {
    try {
      state.value.loadingStoryDetails = true;
      const fullStory = await databaseService.loadFullStory(story.id);
      selectedStory.value = fullStory;
    } catch (error) {
      window.showToast('Erreur lors du chargement des détails de la story', 'error');
      selectedStory.value = null;
    } finally {
      state.value.loadingStoryDetails = false;
    }
  };

  // Fonction pour supprimer une période de la story
  const removePeriodFromStory = async (periodId: string) => {
    if (!selectedStory.value) return;

    try {
      await queryService.removePeriodFromStory(selectedStory.value.id, periodId);
      // Mise à jour locale de la story sélectionnée
      const updatedStory = { ...selectedStory.value };
      if (updatedStory.periods) {
        updatedStory.periods = updatedStory.periods.filter(p => p.id !== periodId);
      }
      selectedStory.value = updatedStory;
      fullStories.value.set(selectedStory.value.id, updatedStory);
      window.showToast('Période supprimée de la story avec succès', 'success');
    } catch (error) {
      window.showToast('Erreur lors de la suppression de la période de la story', 'error');
    }
  };

  // Fonction pour supprimer un événement de la story
  const removeEventFromStory = async (eventId: string) => {
    if (!selectedStory.value) return;

    try {
      await queryService.removeEventFromStory(selectedStory.value.id, eventId);
      // Mise à jour locale de la story sélectionnée
      const updatedStory = { ...selectedStory.value };
      if (updatedStory.events) {
        updatedStory.events = updatedStory.events.filter(e => e.id !== eventId);
      }
      selectedStory.value = updatedStory;
      fullStories.value.set(selectedStory.value.id, updatedStory);
      window.showToast('Événement supprimé de la story avec succès', 'success');
    } catch (error) {
      window.showToast('Erreur lors de la suppression de l\'événement de la story', 'error');
    }
  };

  return {
    // États
    state,
    modalState,
    searchState: searchState.value,
    dragDropState: dragDropState.value,
    fullStories,
    selectedStory,
    
    // Computed
    filteredPeriods,
    filteredEvents,
    filteredStories,
    
    // Fonctions modales
    handleAddPeriod,
    handleAddEvent,
    handleAddStory,
    handleEditPeriod,
    handleEditEvent,
    handleEditStory,
    closeAddModal,
    closeEditModal,
    openEditModal,
    
    // Fonctions données
    loadInitialData,
    
    // Fonctions drag & drop
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    
    // Fonctions story
    selectStory,
    
    // Fonctions de suppression
    removePeriodFromStory,
    removeEventFromStory,
    
    // Accès direct au loading et error partagés
    sharedLoading,
    sharedError
  };
} 