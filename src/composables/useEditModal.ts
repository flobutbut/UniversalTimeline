import { reactive, computed, watch } from 'vue';
import { useLatestRequest } from './useLatestRequest';
import { CategoryService, type Category } from '@/services/CategoryService';
import { EditFormValidator } from '@/validators/editFormValidators';
import type { EditFormData, EditInitialData, EditFormSubmission, EditFormType, EditFormMode } from '@/types/editForm';
export type { EditFormData } from '@/types/editForm';

export interface EditModalState {
  loading: boolean; error: string | null; isValid: boolean; qidError: string;
  qidExistsInBase: boolean; existingItem: EditInitialData | null;
  directChildrenCount: string | null; categories: Category[];
  categoriesLoading: boolean; categoriesError: string | null;
}

function draft(data: EditInitialData = {}): EditFormData {
  return {
    qid: data.wikidata_id ?? data.qid ?? '',
    title: { fr: data.label?.fr ?? data.title?.fr ?? '', en: data.label?.en ?? data.title?.en ?? '' },
    description: { fr: data.description?.fr ?? '', en: data.description?.en ?? '' },
    startDate: data.start_date ?? data.startDate ?? '', endDate: data.end_date ?? data.endDate ?? '', date: data.date ?? '',
    location: data.location ?? data.temporalLocation ?? '', author: data.author ?? '', isPublic: data.isPublic ?? false,
    parentId: Object.prototype.hasOwnProperty.call(data,'parent_id') ? data.parent_id ?? null : data.parentId ?? null,
    categories: data.categories?.map(category => category.id) ?? [],
  };
}

export function useEditModal(type: EditFormType | (() => EditFormType), mode: EditFormMode | (() => EditFormMode), initialData?: EditInitialData | null) {
  const currentType = () => typeof type === 'function' ? type() : type;
  const currentMode = () => typeof mode === 'function' ? mode() : mode;
  const initialChildrenCount = (data?: EditInitialData | null) => data?.hasChildren === false
    || (currentMode() === 'create' && !(data?.wikidata_id || data?.qid)) ? '0' : null;
  const form = reactive<EditFormData>(draft(initialData ?? undefined));
  const state = reactive<EditModalState>({
    loading:false, error:null, isValid:false, qidError:'', qidExistsInBase:false, existingItem:null,
    directChildrenCount:initialChildrenCount(initialData),
    categories:[], categoriesLoading:false, categoriesError:null,
  });
  const categoryRequests = useLatestRequest();
  const loadCategories = async () => {
    const isCurrent = categoryRequests.begin(); state.categoriesLoading = true; state.categoriesError = null;
    try { const categories = await CategoryService.getInstance().getCategories(); if (isCurrent()) state.categories = categories; }
    catch { if (isCurrent()) state.categoriesError = 'Impossible de charger les catégories. Réessayez avant de sauvegarder.'; }
    finally { if (isCurrent()) state.categoriesLoading = false; }
  };
  void loadCategories();
  const validation = computed(() => EditFormValidator.validateForm(form, currentType()));
  const isValid = computed(() => validation.value.isValid);
  watch(isValid, value => { state.isValid = value; }, {immediate:true});

  const resetForm = () => {
    Object.assign(form,draft());
    state.qidError=''; state.qidExistsInBase=false; state.existingItem=null; state.directChildrenCount='0';
  };
  const updateForm = (data?: EditInitialData | null) => {
    if (!data) { if (currentMode()==='create') resetForm(); return; }
    Object.assign(form,draft(data));
    state.directChildrenCount=initialChildrenCount(data);
    state.qidError=''; state.qidExistsInBase=false; state.existingItem=currentMode()==='edit' ? data : null;
  };
  const prepareSubmitData = (): EditFormSubmission => ({
    qid:form.qid.trim().toUpperCase(), title:{fr:form.title.fr.trim(),en:form.title.en.trim() || form.title.fr.trim()},
    description:{fr:form.description.fr || null,en:form.description.en || form.description.fr || null},
    startDate:form.startDate.trim(), endDate:form.endDate.trim() || 'NOW', date:form.date.trim(),
    location:form.location || null, author:form.author.trim(), isPublic:form.isPublic, parentId:form.parentId,
    categories:[...new Set(form.categories)].map(id => ({id})),
  });
  return {
    form,state,isValid,validation,resetForm,updateForm,prepareSubmitData,loadCategories,
    setLoading:(value:boolean) => {state.loading=value;}, setError:(value:string|null) => {state.error=value;},
    setQidError:(value:string) => {state.qidError=value;},
    setQidExists:(exists:boolean,item?:EditInitialData|null) => {state.qidExistsInBase=exists;state.existingItem=item ?? null;},
    setChildrenCount:(value:string | null) => {state.directChildrenCount=value;},
  };
}
