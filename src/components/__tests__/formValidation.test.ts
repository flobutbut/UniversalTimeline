import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { CategoryService } from '@/services/CategoryService';
import { EditFormValidator } from '@/validators/editFormValidators';

let view: ReturnType<typeof mount>;
const button = () => view.findAll('button').find(node=>['Créer','Mettre à jour'].includes(node.text()))!;
const period = {wikidata_id:'Q123',label:{fr:'Période',en:''},startDate:'M65',endDate:'NOW',categories:[]};
beforeEach(()=>{setActivePinia(createPinia());vi.spyOn(CategoryService.getInstance(),'getCategories').mockResolvedValue([]);});
afterEach(()=>{if(view?.exists()) view.unmount();vi.restoreAllMocks();});

it('creates a story without author field: the signed-in account signs it',async()=>{
  view=mount(EditModal,{props:{isOpen:true,type:'story',mode:'create',data:{title:{fr:'Brouillon'},author:'  '}}});await flushPromises();
  expect(view.find('input[placeholder="Nom de l\'auteur"]').exists()).toBe(false);
  await button().trigger('click');
  expect(view.emitted('submit')?.[0]?.[0]).toMatchObject({title:{fr:'Brouillon'}});
});
it.each(['title','description'] as const)('links an overlong %s error to the field and prevents submission',async kind=>{
  const data={...period,[kind]:{fr:'x'.repeat(kind==='title'?256:1001),en:''}};
  // Period titles are initialized from label, so use that key for this fixture.
  if(kind==='title') data.label=data.title!;
  view=mount(EditModal,{props:{isOpen:true,type:'period',mode:'edit',data}});await flushPromises();
  const field=view.get(kind==='title'?'input[placeholder="Titre en français"]':'textarea[placeholder="Description en français"]');
  expect(field.attributes('aria-invalid')).toBe('true');
  const errorId=field.attributes('aria-describedby');expect(view.get(`[id="${errorId}"]`).text()).toContain(kind==='title'?'255':'1000');
  await view.get('form').trigger('submit');expect(view.emitted('submit')).toBeUndefined();
});
it('allows a blank period end and preserves an unsupported historical date as entered',async()=>{
  view=mount(EditModal,{props:{isOpen:true,type:'period',mode:'create',data:{...period,startDate:'8. millennium BCE',endDate:''}}});await flushPromises();
  expect(button().attributes('disabled')).toBeUndefined();await button().trigger('click');
  expect(view.emitted('submit')?.[0]?.[0]).toMatchObject({startDate:'8. millennium BCE',endDate:'NOW'});
  const location=view.get('input[placeholder="Ex: Europe, France, Paris..."]');expect(location.attributes('disabled')).toBeDefined();
  expect(view.text()).toContain('non enregistrée');
});
it('revalidates the current form type and keeps the new draft when the same modal changes type',async()=>{
  view=mount(EditModal,{props:{isOpen:true,type:'period',mode:'create',data:period}});await flushPromises();
  await view.setProps({type:'story',data:{title:{fr:''},author:''}});await flushPromises();
  expect(button().attributes('disabled')).toBeDefined();
  await view.get('input[placeholder="Titre en français"]').setValue('Nouvelle frise');
  expect(button().attributes('disabled')).toBeUndefined();
});
it('rejects malformed draft values without throwing or coercing them into text',()=>{
  for(const data of [null,[],{title:1},{title:{fr:1}},{title:{fr:'Valide'},author:[]}]) expect(EditFormValidator.validateForm(data,'story').isValid).toBe(false);
  expect(EditFormValidator.validateForm({title:{fr:'Valide'},author:'Auteur',isPublic:'false'},'story').isValid).toBe(false);
});
it('rejects a reversed geological period and clears the error when the range is corrected',async()=>{
  view=mount(EditModal,{props:{isOpen:true,type:'period',mode:'edit',data:{...period,startDate:'M10',endDate:'M65'}}});await flushPromises();
  expect(button().attributes('disabled')).toBeDefined();expect(view.text()).toContain('antérieure');
  const end=view.findAll('input').find(node=>(node.element as HTMLInputElement).value==='M65')!;
  await end.setValue('NOW');expect(button().attributes('disabled')).toBeUndefined();
});
it('clears a derived date preview as soon as its input is erased without altering the draft',async()=>{
  view=mount(EditModal,{props:{isOpen:true,type:'period',mode:'edit',data:period}});await flushPromises();
  const start=view.findAll('input').find(node=>(node.element as HTMLInputElement).value==='M65')!;
  expect(view.findAll('.date-preview')[0].text()).toContain('Ma');
  await start.setValue('');expect(view.findAll('.date-preview')[0].text()).toBe('');
  expect(button().attributes('disabled')).toBeDefined();
});
