import {afterEach,expect,it} from 'vitest';
import {flushPromises,mount} from '@vue/test-utils';
import RelationGraphSearch from '../RelationGraphSearch.vue';
import {buildRelationGraph,graphKey} from '../relationGraph';
import {network} from './networkFixture';

let view:ReturnType<typeof mount>;
function start(){view=mount(RelationGraphSearch,{attachTo:document.body,props:{nodes:buildRelationGraph(network).nodes}});}
afterEach(()=>view?.unmount());
async function search(value:string){const input=view.get('input');(input.element as HTMLInputElement).focus();await input.setValue(value);await flushPromises();return input;}

it('offers matching objects while typing, ignores accents and keeps input focus while choosing with the keyboard',async()=>{
  start();const input=await search('periode');
  expect(input.attributes('role')).toBe('combobox');expect(input.attributes('aria-expanded')).toBe('true');
  expect(view.get('[role="option"]').text()).toContain('Période partagée');
  expect(view.get('[role="option"]').text()).toContain('Période · Dans 2 frise(s)');
  await input.trigger('keydown',{key:'ArrowDown'});
  expect(input.attributes('aria-activedescendant')).toBe(view.get('[role="option"]').attributes('id'));
  await input.trigger('keydown',{key:'Enter'});
  expect(view.emitted('select')?.[0]).toEqual([graphKey('period','p')]);
  expect(input.element.value).toBe('Période partagée');expect(document.activeElement).toBe(input.element);
  expect(view.find('[role="listbox"]').exists()).toBe(false);
});

it('selects the first suggestion with Enter and supports pointer selection without losing input focus',async()=>{
  start();const input=await search('Commun');await input.trigger('keydown',{key:'Enter'});
  expect(view.emitted('select')?.[0]).toEqual([graphKey('event','e')]);
  await input.setValue('Privée');await flushPromises();
  const option=view.get('[role="option"]');await option.trigger('pointerdown');await option.trigger('click');
  expect(view.emitted('select')?.[1]).toEqual([graphKey('story','2')]);expect(document.activeElement).toBe(input.element);
  expect(input.attributes('aria-expanded')).toBe('false');
});

it('closes on Escape, Tab and outside interaction without selecting or erasing the query',async()=>{
  start();const input=await search('Période');
  await input.trigger('keydown',{key:'Escape'});expect(view.find('[role="listbox"]').exists()).toBe(false);expect(input.element.value).toBe('Période');
  await input.trigger('keydown',{key:'ArrowDown'});expect(view.find('[role="listbox"]').exists()).toBe(true);
  await input.trigger('keydown',{key:'Tab'});expect(view.find('[role="listbox"]').exists()).toBe(false);
  await input.trigger('click');expect(view.find('[role="listbox"]').exists()).toBe(true);
  document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await flushPromises();
  expect(view.find('[role="listbox"]').exists()).toBe(false);expect(view.emitted('select')).toBeUndefined();
});

it('updates suggestions and resets the active option when graph filters change, and distinguishes no match from an empty input',async()=>{
  start();const input=await search('Période');await input.trigger('keydown',{key:'ArrowDown'});
  await view.setProps({nodes:buildRelationGraph(network,['story','event']).nodes});
  expect(view.findAll('[role="option"]')).toHaveLength(0);expect(input.attributes('aria-activedescendant')).toBeUndefined();
  expect(view.text()).toContain('Aucun objet ne correspond.');
  await view.get('[aria-label="Effacer la recherche"]').trigger('click');
  expect(view.find('[role="listbox"]').exists()).toBe(false);expect(document.activeElement).toBe(input.element);
});
