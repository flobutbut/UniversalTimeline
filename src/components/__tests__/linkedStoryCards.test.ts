import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import StoryDetailPanel from '@/views/DatabaseView/StoryDetailPanel.vue';
import StoryReadOnlyColumns from '@/views/DatabaseView/StoryReadOnlyColumns.vue';
import MoveStoryLinkModal from '@/views/DatabaseView/MoveStoryLinkModal.vue';
import Tabs from '@/components/base/Tabs.vue';
import Select from '@/components/base/Select.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';
const source = () => storyFixture('1', [{id:'source-root',label_fr:'Source',start_date:'1000',end_date:'2000'}],[],[
  {id:'2',title_fr:'Frise associée',anchors:[{type:'period',id:'source-root'}]},
]);
const linked = () => storyFixture('2',[
  {id:'foreign-root',label_fr:'Racine étrangère',story_parent_id:null,start_date:'1100',end_date:'1900'},
  {id:'foreign-child',label_fr:'Enfant étranger',story_parent_id:'foreign-root',start_date:'1200',end_date:'1800'},
]);
let view: ReturnType<typeof mount>;
const body = () => new DOMWrapper(document.body);
const row = () => view.get('[data-child-story-id="2"]');
async function setup(realPreview = false) {
  const router = createRouter({history:createMemoryHistory(),routes:[{path:'/database',name:'database',component:{template:'<div />'}}]});
  await router.push('/database?story=1');
  view=mount(StoryDetailPanel,{props:{story:source()},attachTo:document.body,global:{plugins:[router],stubs:{StoryTimeline:!realPreview,StoryRelatedPickerModal:true}}});
  view.getComponent(Tabs).vm.$emit('update:modelValue','periods');await flushPromises();
  await view.get('[data-story-period-id="source-root"] .finder-item-content').trigger('click');await flushPromises();
  return router;
}
async function menu() {await row().get('[aria-haspopup="menu"]').trigger('click');await flushPromises();}
const action = (label: string) => body().findAll('[role="menuitem"]').find(item=>item.text()===label)!;
beforeEach(()=>{setActivePinia(createPinia());vi.spyOn(StoryApiService.getInstance(),'getStory').mockResolvedValue(linked());});
afterEach(()=>{view?.unmount();document.body.innerHTML='';vi.restoreAllMocks();});

it.each([false, true])('shows the same shared-event links as exploration and only detaches explicit anchors (explicit: %s)', async explicit => {
  await setup();
  const data = source();
  data.events = storyFixture('1', [], [{ id: 'event', label_fr: 'Repère partagé', date: '1000' }]).events;
  if (explicit) data.childStories![0].anchors.push({ type: 'event', id: 'event' });
  data.relatedStories = [
    { id: '2', title: { fr: 'Frise associée', en: '' }, periodIds: [], eventIds: ['event'] },
    { id: '3', title: { fr: 'Autre frise partagée', en: '' }, periodIds: [], eventIds: ['event'] },
    { id: '4', title: { fr: 'Période partagée seulement', en: '' }, periodIds: ['source-root'], eventIds: [] },
    { id: '1', title: data.title, periodIds: [], eventIds: ['event'] },
  ];
  await view.setProps({ story: data });
  view.getComponent(Tabs).vm.$emit('update:modelValue', 'events'); await flushPromises();
  view.findAllComponents(FinderItem).find(item => item.props('itemId') === 'event')!.vm.$emit('click'); await flushPromises();
  const associations = () => view.get('.event-detail-associations');
  expect(associations().get('.event-detail-count').text()).toBe('2');
  expect(associations().findAll('.anchored-story-row__title').map(item => item.text())).toEqual(['Frise associée', 'Autre frise partagée']);
  expect(associations().findAll('.anchored-story-row__link').map(item => item.attributes('href'))).toEqual(['/database?story=2', '/database?story=3']);
  expect(associations().findAll('.anchored-story-row__remove')).toHaveLength(explicit ? 1 : 0);
  if (explicit) {
    await associations().get('.anchored-story-row__remove').trigger('click');
    expect(view.emitted('remove-event-anchor')).toEqual([['2', 'event']]);
    await view.setProps({ story: { ...data, childStories: source().childStories } });
    expect(associations().get('.event-detail-count').text()).toBe('2');
    expect(associations().find('.anchored-story-row__remove').exists()).toBe(false);
  }
  await view.setProps({ story: { ...data, childStories: source().childStories, relatedStories: [] } });
  expect(associations().get('.event-detail-count').text()).toBe('0');
  expect(associations().text()).toContain('Aucune frise associée à cet événement.');
});

it('offers the four requested actions and only deletes the selected link',async()=>{
  await setup();await menu();
  expect(body().findAll('[role="menuitem"]').map(item=>item.text())).toEqual(['Voir la frise','Déplacer','Afficher comme une période','Supprimer']);
  expect(action('Voir la frise').attributes('href')).toBe('/database?story=2');
  expect(action('Supprimer').attributes('title')).toBe('Supprimer uniquement ce lien');
  await action('Supprimer').trigger('click');
  expect(view.emitted('remove-child-story')).toEqual([['2',{type:'period',id:'source-root'}]]);
  expect(view.emitted('delete-story')).toBeUndefined();
});

it('opens a move dialog, saves the selected parent, and retains a refused move for retry',async()=>{
  await setup();await menu();await action('Déplacer').trigger('click');
  const modal=view.getComponent(MoveStoryLinkModal);
  modal.getComponent(Select).vm.$emit('update:modelValue','');await flushPromises();
  await modal.findAll('button').find(button=>button.text()==='Déplacer')!.trigger('click');
  expect(view.emitted('move-child-story')).toEqual([['2',{type:'period',id:'source-root'},null]]);
  await view.setProps({error:'Déplacement refusé'});expect(view.getComponent(MoveStoryLinkModal).text()).toContain('Déplacement refusé');
});

it('toggles the representation of this location without editing a catalogue period',async()=>{
  await setup();await menu();await action('Afficher comme une période').trigger('click');
  expect(view.emitted('display-child-story')).toEqual([['2',{type:'period',id:'source-root'},true]]);
  expect(view.emitted('edit-period')).toBeUndefined();expect(view.emitted('add-periods')).toBeUndefined();
  const updated=source();updated.childStories![0].anchors[0].displayAsPeriod=true;
  await view.setProps({story:updated});await menu();await action('Afficher dans le badge').trigger('click');
  expect(view.emitted('display-child-story')?.at(-1)).toEqual(['2',{type:'period',id:'source-root'},false]);
});

it('explores dimmed sub-periods in adjacent columns without navigation, drag or editing controls',async()=>{
  const router=await setup();const before=JSON.stringify(view.props('story'));
  await row().get('[aria-label="Explorer Frise associée en lecture seule"]').trigger('click');await flushPromises();
  const preview=view.getComponent(StoryReadOnlyColumns);
  expect(preview.text()).toContain('Lecture seule');expect(preview.findAll('[draggable="true"]')).toHaveLength(0);
  expect(preview.find('[aria-haspopup="menu"]').exists()).toBe(false);
  expect(preview.find('.story-column-header__actions').exists()).toBe(false);
  const foreign=preview.get('[data-readonly-period-id="foreign-root"]');
  expect(foreign.classes()).toContain('finder-item--external-catalog');
  await foreign.get('.finder-item-content').trigger('click');await flushPromises();
  expect(preview.find('[data-readonly-period-id="foreign-child"]').exists()).toBe(true);
  expect(router.currentRoute.value.query.story).toBe('1');
  expect(JSON.stringify(view.props('story'))).toBe(before);
  expect(view.findAll('[data-story-period-id]').map(row=>row.attributes('data-story-period-id'))).toEqual(['source-root']);
  expect(view.emitted('add-periods')).toBeUndefined();expect(view.emitted('move-child-story')).toBeUndefined();
  await view.get('[data-story-period-id="source-root"] .finder-item-content').trigger('click');await flushPromises();
  expect(view.findComponent(StoryReadOnlyColumns).exists()).toBe(false);
});

it('updates the real preview on display changes, preserves each occurrence and folds it with its local parent',async()=>{
  const summary={...linked(),startDate:'1100',endDate:'1900'};
  const store=useDataStore();store.updateStories([summary]);
  await setup(true);
  const timeline=view.getComponent(StoryTimeline);
  const ids=()=>timeline.findAll('[data-period-id]').map(bar=>bar.attributes('data-period-id'));
  expect(ids()).toEqual(['source-root']);
  const shown=source();shown.childStories![0].anchors[0].displayAsPeriod=true;
  await view.setProps({story:shown});
  const nested='linked-story:2:period:source-root',root='linked-story:2:root';
  expect(ids()).toContain(nested);
  expect(timeline.get(`[data-period-id="${nested}"]`).text()).toContain('Frise associée');
  expect(timeline.props('periods')?.find(period=>period.id===nested)).toMatchObject({storyParentId:'source-root',startDate:'1100',endDate:'1900'});
  expect(view.props('story')!.periods.map(period=>period.id)).toEqual(['source-root']);
  const both=source();both.childStories![0]={...shown.childStories![0],atRoot:true,rootDisplayAsPeriod:true};
  await view.setProps({story:both});expect(ids()).toEqual(expect.arrayContaining(['source-root',nested,root]));
  expect(new Set(ids()).size).toBe(3);
  await timeline.get('[data-period-id="source-root"] .story-timeline__period-toggle').trigger('click');
  expect(ids()).toContain(root);expect(ids()).not.toContain(nested);
  await timeline.get('[data-period-id="source-root"] .story-timeline__period-toggle').trigger('click');
  store.updateStories([{...summary,endDate:'1950'}]);await flushPromises();
  expect(timeline.get(`[data-period-id="${nested}"]`).text()).toContain('1950');
  await view.setProps({story:source()});
  expect(ids()).toEqual(['source-root']);
});

it('opens the linked story read-only from its preview bar instead of selecting a fictitious catalogue period',async()=>{
  useDataStore().updateStories([{...linked(),startDate:'1100',endDate:'1900'}]);
  await setup(true);
  const shown=source();shown.childStories![0].anchors[0].displayAsPeriod=true;
  await view.setProps({story:shown});
  const timeline=view.getComponent(StoryTimeline),id='linked-story:2:period:source-root';
  await timeline.get(`[data-period-id="${id}"] .story-timeline__period-bar`).trigger('click');await flushPromises();
  expect(view.getComponent(StoryReadOnlyColumns).props('storyId')).toBe('2');
  expect(timeline.get(`[data-period-id="${id}"] .story-timeline__period-bar`).attributes('aria-pressed')).toBe('true');
  expect(view.findAll('[data-story-period-id]').map(row=>row.attributes('data-story-period-id'))).toEqual(['source-root']);
  expect(view.emitted('edit-period')).toBeUndefined();expect(view.emitted('add-periods')).toBeUndefined();
  await timeline.get('[data-period-id="source-root"] .story-timeline__period-bar').trigger('click');await flushPromises();
  expect(view.findComponent(StoryReadOnlyColumns).exists()).toBe(false);
});

it('shows root story cards even in a preview without catalogue periods and clears their selection on deselect',async()=>{
  useDataStore().updateStories([{...linked(),startDate:'1100',endDate:'1900'}]);
  await setup(true);
  const shown=source();shown.periods=[];shown.childStories![0]={...shown.childStories![0],anchors:[],atRoot:true,rootDisplayAsPeriod:true};
  await view.setProps({story:shown});
  const timeline=view.getComponent(StoryTimeline);
  await timeline.get('[data-period-id="linked-story:2:root"] .story-timeline__period-bar').trigger('click');await flushPromises();
  expect(view.getComponent(StoryReadOnlyColumns).props('storyId')).toBe('2');
  expect(view.findAll('.story-period-column')).toHaveLength(1);
  await timeline.get('.story-timeline').trigger('click');await flushPromises();
  expect(view.findComponent(StoryReadOnlyColumns).exists()).toBe(false);
});
