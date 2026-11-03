import { computed,onBeforeUnmount,ref,shallowRef,watch } from 'vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { adminApi } from '@/services/AdminApiService';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import type { RelationEntity,RelationsContent,RelationsNetwork,RelationEntityKind } from '@/types/adminRelations';

export function useAdminRelations() {
  const auth=useAuthStore();const overview=shallowRef<RelationsNetwork|null>(null);
  const content=shallowRef<RelationsContent|null>(null);const entity=shallowRef<RelationEntity|null>(null);
  const selectedStoryId=ref<string|null>(null);
  const overviewLoading=ref(false);const overviewError=ref('');const detailLoading=ref(false);const detailError=ref('');
  let overviewRequest=0;let detailRequest=0;let overviewController:AbortController|undefined;let detailController:AbortController|undefined;
  let retryDetail:(()=>Promise<void>)|undefined;
  function clearDetail(){detailRequest++;detailController?.abort();content.value=null;entity.value=null;selectedStoryId.value=null;
    detailLoading.value=false;detailError.value='';retryDetail=undefined;}
  async function readDetail<T>(read:(signal:AbortSignal)=>Promise<T>,apply:(value:T)=>void){
    detailController?.abort();detailController=new AbortController();const signal=detailController.signal;
    const current=++detailRequest;detailLoading.value=true;detailError.value='';
    try{const result=await read(signal);if(current===detailRequest&&!signal.aborted)apply(result);}
    catch(error){if(current===detailRequest&&!signal.aborted)detailError.value=mutationErrorMessage(error,'Lecture des relations impossible.');}
    finally{if(current===detailRequest)detailLoading.value=false;}
  }
  async function selectStory(id:string){
    clearDetail();selectedStoryId.value=id;
    const read=async()=>{await readDetail(signal=>adminApi.relationStory(id,signal),value=>{content.value=value;});};
    retryDetail=read;await read();
  }
  async function selectEntity(kind:RelationEntityKind,id:string){
    clearDetail();const read=async()=>{await readDetail(signal=>adminApi.relationEntity(kind,id,signal),value=>{entity.value=value;});};
    retryDetail=read;await read();
  }
  async function load(){
    overviewController?.abort();overviewController=new AbortController();const signal=overviewController.signal;
    const current=++overviewRequest;overviewLoading.value=true;overviewError.value='';overview.value=null;clearDetail();
    if(!auth.isAdmin){overviewLoading.value=false;return;}
    try{const result=await adminApi.relations(signal);if(current===overviewRequest&&!signal.aborted)overview.value=result;}
    catch(error){if(current===overviewRequest&&!signal.aborted)overviewError.value=mutationErrorMessage(error,'Lecture du réseau impossible.');}
    finally{if(current===overviewRequest)overviewLoading.value=false;}
  }
  function dispose(){overviewRequest++;overviewController?.abort();clearDetail();overview.value=null;}
  watch(()=>auth.identityVersion,()=>{dispose();void load();});onBeforeUnmount(dispose);
  return {overview,content,entity,selectedStoryId,overviewLoading,overviewError,detailLoading,detailError,
    selectedStory:computed(()=>overview.value?.stories.find(s=>s.id===selectedStoryId.value)??null),
    selectStory,selectEntity,clearDetail,load,retryDetail:()=>retryDetail?.()};
}
