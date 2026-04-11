import { reactive, computed, watch } from 'vue';
import { CategoryService, type Category } from '@/services/CategoryService';

export interface EditFormData {
  qid: string;
  title: {
    fr: string;
    en: string;
  };
  description: {
    fr: string;
    en: string;
  };
  startDate: string;
  endDate: string;
  date: string;
  location: string;
  author: string;
  isPublic: boolean;
  parentId: string | null;
  categories: string[]; // IDs des catégories sélectionnées
}

export interface EditModalState {
  loading: boolean;
  error: string | null;
  isValid: boolean;
  qidError: string;
  qidExistsInBase: boolean;
  existingItem: any;
  directChildrenCount: string;
  categories: Category[];
  categoriesLoading: boolean;
}

export function useEditModal(
  type: 'period' | 'event' | 'story',
  mode: 'create' | 'edit',
  initialData?: any
) {
  const categoryService = CategoryService.getInstance();

  const form = reactive<EditFormData>({
    qid: initialData?.wikidata_id || initialData?.qid || '',
    title: {
      fr: initialData?.label?.fr || initialData?.title?.fr || '',
      en: initialData?.label?.en || initialData?.title?.en || ''
    },
    description: {
      fr: initialData?.description?.fr || '',
      en: initialData?.description?.en || ''
    },
    startDate: initialData?.start_date || initialData?.startDate || '',
    endDate: initialData?.end_date || initialData?.endDate || '',
    date: initialData?.date || '',
    location: initialData?.location || '',
    author: initialData?.author || '',
    isPublic: initialData?.isPublic || false,
    parentId: initialData?.parent_id || null,
    categories: initialData?.categories?.map((cat: any) => cat.id) || []
  });

  const state = reactive<EditModalState>({
    loading: false,
    error: null,
    isValid: false,
    qidError: '',
    qidExistsInBase: false,
    existingItem: null,
    directChildrenCount: '0',
    categories: [],
    categoriesLoading: false
  });

  // Charger les catégories disponibles
  const loadCategories = async () => {
    try {
      state.categoriesLoading = true;
      state.categories = await categoryService.getCategories();
    } catch (error) {
      console.error('[useEditModal] Erreur lors du chargement des catégories:', error);
    } finally {
      state.categoriesLoading = false;
    }
  };

  // Charger les catégories au montage
  loadCategories();

  // Validation du formulaire
  const isValid = computed(() => {
    if (type !== 'story' && !form.qid) return false;
    if (!form.title.fr) return false;
    if (type === 'period') {
      if (!form.startDate || !form.endDate) return false;
    } else if (type === 'event') {
      if (!form.date) return false;
    }
    return true;
  });

  // Mise à jour de l'état de validation
  watch(isValid, (newValue) => {
    state.isValid = newValue;
  }, { immediate: true });

  // Réinitialisation du formulaire
  const resetForm = () => {
    form.qid = '';
    form.title.fr = '';
    form.title.en = '';
    form.description.fr = '';
    form.description.en = '';
    form.date = '';
    form.startDate = '';
    form.endDate = '';
    form.location = '';
    form.author = '';
    form.isPublic = false;
    form.parentId = null;
    form.categories = [];
    
    state.qidError = '';
    state.qidExistsInBase = false;
    state.existingItem = null;
    state.directChildrenCount = '0';
  };

  function applyDataToForm(data: any) {
    form.qid = data.wikidata_id || data.qid || '';
    form.title.fr = data.label?.fr || data.title?.fr || '';
    form.title.en = data.label?.en || data.title?.en || '';
    form.description.fr = data.description?.fr || '';
    form.description.en = data.description?.en || '';
    form.date = data.date || '';
    form.startDate = data.start_date || data.startDate || '';
    form.endDate = data.end_date || data.endDate || '';
    form.location = data.location || data.temporalLocation || '';
    form.author = data.author || '';
    form.isPublic = data.isPublic || false;
    form.parentId = data.parent_id || data.parentId || null;
    form.categories = data.categories?.map((cat: any) => cat.id) || [];
  }

  // Mise à jour du formulaire avec de nouvelles données
  const updateForm = (data: any) => {
    if (!data) {
      if (mode === 'create') resetForm();
      return;
    }
    if (mode === 'edit') {
      applyDataToForm(data);
      state.qidExistsInBase = false;
      state.existingItem = data;
    } else if (mode === 'create') {
      applyDataToForm(data);
      state.qidExistsInBase = false;
      state.existingItem = null;
    }
  };

  // Préparation des données pour soumission
  const prepareSubmitData = () => {
    return {
      qid: form.qid,
      title: {
        fr: form.title.fr,
        en: form.title.en || form.title.fr,
      },
      description: {
        fr: form.description.fr || null,
        en: form.description.en || form.description.fr || null,
      },
      startDate: form.startDate,
      endDate: form.endDate,
      date: form.date,
      location: form.location || null,
      author: form.author,
      isPublic: form.isPublic,
      parentId: form.parentId,
      categories: form.categories
        .filter(Boolean)
        .map((id: string) => ({ id })),
    };
  };

  // Gestion des états de chargement
  const setLoading = (loading: boolean) => {
    state.loading = loading;
  };

  const setError = (error: string | null) => {
    state.error = error;
  };

  // Gestion des erreurs de Q-id
  const setQidError = (error: string) => {
    state.qidError = error;
  };

  const setQidExists = (exists: boolean, item?: any) => {
    state.qidExistsInBase = exists;
    state.existingItem = item || null;
  };

  // Mise à jour du compteur d'enfants
  const setChildrenCount = (count: string) => {
    state.directChildrenCount = count;
  };

  return {
    form,
    state,
    isValid,
    resetForm,
    updateForm,
    prepareSubmitData,
    setLoading,
    setError,
    setQidError,
    setQidExists,
    setChildrenCount,
    loadCategories
  };
} 