import { reactive, computed, watch } from 'vue';
import { useLatestRequest } from './useLatestRequest';
import { TagService, type GridTag } from '@/services/TagService';
import { EditFormValidator } from '@/validators/editFormValidators';
import type { EditFormData, EditInitialData, EditFormSubmission, EditFormType, EditFormMode } from '@/types/editForm';
import { wikipediaTitleFromInput } from '@/lib/wikipedia';
export type { EditFormData } from '@/types/editForm';

export interface EditModalState {
  loading: boolean; error: string | null; isValid: boolean; qidError: string;
  qidExistsInBase: boolean; existingItem: EditInitialData | null;
  directChildrenCount: string | null; tags: GridTag[];
  tagsLoading: boolean; tagsError: string | null;
}

function draft(data: EditInitialData = {}): EditFormData {
  return {
    sourceKey: data.sourceKey,
    qid: data.wikidata_id ?? data.qid ?? '',
    title: { fr: data.label?.fr ?? data.title?.fr ?? '', en: data.label?.en ?? data.title?.en ?? '' },
    description: { fr: data.description?.fr ?? '', en: data.description?.en ?? '' },
    startDate: data.start_date ?? data.startDate ?? '', endDate: data.end_date ?? data.endDate ?? '', date: data.date ?? '',
    location: data.location ?? data.temporalLocation ?? '', author: data.author ?? '', isPublic: data.isPublic ?? false,
    parentId: Object.prototype.hasOwnProperty.call(data,'parent_id') ? data.parent_id ?? null : data.parentId ?? null,
    tags: data.tags?.map(tag => tag.id) ?? [],
    tagsLoaded: data.tags !== undefined,
    nonThematic: data.nonThematic ?? false,
    wikipedia: { fr: data.wikipedia?.fr ?? '', en: data.wikipedia?.en ?? '' },
    wikipediaLoaded: data.wikipedia !== undefined,
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
    tags:[], tagsLoading:false, tagsError:null,
  });
  const tagRequests = useLatestRequest();
  const loadTags = async () => {
    const isCurrent = tagRequests.begin(); state.tagsLoading = true; state.tagsError = null;
    try { const tags = await TagService.getInstance().getTags(); if (isCurrent()) state.tags = tags; }
    catch { if (isCurrent()) state.tagsError = 'Impossible de charger les tags. Réessayez avant de sauvegarder.'; }
    finally { if (isCurrent()) state.tagsLoading = false; }
  };
  void loadTags();
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
    ...(form.sourceKey ? { sourceKey: form.sourceKey } : {}),
    qid:form.qid.trim().toUpperCase(), title:{fr:form.title.fr.trim(),en:form.title.en.trim() || form.title.fr.trim()},
    description:{fr:form.description.fr || null,en:form.description.en || form.description.fr || null},
    startDate:form.startDate.trim(), endDate:form.endDate.trim() || 'NOW', date:form.date.trim(),
    location:form.location || null, author:form.author.trim(), isPublic:form.isPublic, parentId:form.parentId,
    ...submittedTagging(),
    ...submittedWikipedia(),
  });
  function submittedTagging(): Pick<EditFormSubmission, 'tags' | 'nonThematic'> {
    if (currentMode() === 'edit' && !form.tagsLoaded && !form.tags.length && !form.nonThematic) return {};
    const nonThematic = currentType() === 'period' && form.nonThematic;
    return { tags: nonThematic ? [] : [...new Set(form.tags)], ...(currentType() === 'period' ? { nonThematic } : {}) };
  }
  /** Le validateur a déjà refusé un titre invalide : seule une valeur vide devient null ici. */
  function submittedWikipedia(): Pick<EditFormSubmission, 'wikipedia'> {
    const touched = !!(form.wikipedia.fr.trim() || form.wikipedia.en.trim());
    if (currentMode() === 'edit' && !form.wikipediaLoaded && !touched) return {};
    return { wikipedia: { fr: wikipediaTitleFromInput(form.wikipedia.fr, 'fr') ?? null, en: wikipediaTitleFromInput(form.wikipedia.en, 'en') ?? null } };
  }
  return {
    form,state,isValid,validation,resetForm,updateForm,prepareSubmitData,loadTags,
    setLoading:(value:boolean) => {state.loading=value;}, setError:(value:string|null) => {state.error=value;},
    setQidError:(value:string) => {state.qidError=value;},
    setQidExists:(exists:boolean,item?:EditInitialData|null) => {state.qidExistsInBase=exists;state.existingItem=item ?? null;},
    setChildrenCount:(value:string | null) => {state.directChildrenCount=value;},
  };
}
