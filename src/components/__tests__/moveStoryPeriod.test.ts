import { afterEach, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MoveStoryPeriodModal from '@/views/DatabaseView/MoveStoryPeriodModal.vue';
import Select from '@/components/base/Select.vue';
import type { Period } from '@/types/database';
const period = (id: string, parent: string | null): Period => ({id,storyParentId:parent,label:{fr:id,en:''},startDate:'M65',endDate:'NOW',categories:[],hasParent:false,children:[],temporalLocation:''});
let view: ReturnType<typeof mount>;
afterEach(()=>view?.unmount());
it('offers only this frise’s periods, excluding the moved branch and all its descendants',()=>{
  view=mount(MoveStoryPeriodModal,{props:{periodId:'child',periods:[period('root',null),period('child','root'),period('leaf','child'),period('other',null)]}});
  expect(view.getComponent(Select).props('options')).toEqual([{value:'',label:'Racine de la frise'},{value:'other',label:'other'},{value:'root',label:'root'}]);
});
it('emits an explicit root placement and never writes shared catalogue metadata',async()=>{
  view=mount(MoveStoryPeriodModal,{props:{periodId:'child',periods:[period('root',null),period('child','root')]}});
  view.getComponent(Select).vm.$emit('update:modelValue',''); await view.vm.$nextTick();
  await view.findAll('button').find(b=>b.text()==='Déplacer')!.trigger('click');
  expect(view.emitted('confirm')).toEqual([[null]]);
});
it('keeps a rejected placement editable and disables confirmation during the write',async()=>{
  view=mount(MoveStoryPeriodModal,{props:{periodId:'child',periods:[period('root',null),period('child','root')],error:'Déplacement refusé'}});
  expect(view.get('[role="alert"]').text()).toBe('Déplacement refusé');
  view.getComponent(Select).vm.$emit('update:modelValue',''); await view.vm.$nextTick();
  await view.setProps({busy:true});
  expect(view.findAll('button').find(b=>b.text()==='Déplacer')!.attributes('disabled')).toBeDefined();
});
