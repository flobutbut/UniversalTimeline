import { afterEach, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';

const items = [
  { id: 'story:1', title: 'Univers Moderne' },
  { id: 'period:1', title: 'Système solaire' },
  { id: 'period:2', title: 'Terre' },
];
let view: VueWrapper;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
function render() { view = mount(StoryBreadcrumb, { props: { items }, attachTo: document.body }); return view; }
async function settled() { await nextTick(); await nextTick(); }

it('exposes an ordered path, ancestor actions and a noninteractive current location', async () => {
  render();
  expect(view.get('nav').attributes('aria-label')).toBe('Fil d’Ariane de la timeline');
  expect(view.findAll('ol > li')).toHaveLength(3);
  expect(view.findAll('button').map(item => item.text())).toEqual(['Univers Moderne', 'Système solaire']);
  expect(view.get('[aria-current="location"]').text()).toBe('Terre');
  expect(view.findAll('[aria-hidden="true"]')).toHaveLength(2);
  await view.findAll('button')[1].trigger('click');
  expect(view.emitted('navigate')).toEqual([[1]]);
});

it('shows a single current item without a useless button or leading separator', async () => {
  render(); await view.setProps({ items: items.slice(0, 1) });
  expect(view.find('button').exists()).toBe(false);
  expect(view.find('[aria-hidden="true"]').exists()).toBe(false);
  expect(view.get('[aria-current="location"]').text()).toBe('Univers Moderne');
  await view.setProps({ items: [] }); expect(view.find('nav').exists()).toBe(false);
});

it('keeps the current frise selectable to reset its exploration and blocks it while loading', async () => {
  view = mount(StoryBreadcrumb, { props: { items: [{ id: 'story:1', title: 'Univers moderne', kind: 'story' }], currentNavigable: true } });
  const current = view.get('button[aria-current="location"]');
  await current.trigger('click');
  expect(view.emitted('navigate')).toEqual([[0]]);
  await view.setProps({ loading: true });
  expect(current.attributes('disabled')).toBeDefined();
  await current.trigger('click');
  expect(view.emitted('navigate')).toEqual([[0]]);
});

it('keeps full labels in the document and handles a story and period with identical raw IDs', async () => {
  render();
  const title = 'Une période avec un intitulé très long qui doit rester lisible';
  await view.setProps({ items: [items[0], { id: 'period:1', title }] });
  expect(view.findAll('li')).toHaveLength(2);
  expect(view.get('[aria-current="location"]').text()).toBe(title);
});

it('transfers keyboard focus to the destination after the ancestor button becomes current', async () => {
  render(); const button = view.findAll('button')[1];
  (button.element as HTMLElement).focus(); await button.trigger('click');
  await view.setProps({ items: items.slice(0, 2) }); await settled();
  expect(document.activeElement).toBe(view.get('[aria-current="location"]').element);
});

it('waits for a story to load before restoring focus, and does not steal another control’s focus', async () => {
  render(); const button = view.get('button');
  (button.element as HTMLElement).focus(); await button.trigger('click');
  await view.setProps({ loading: true, items: items.slice(0, 1) }); await settled();
  expect(view.get('nav').attributes('aria-busy')).toBe('true');
  expect(document.activeElement).not.toBe(view.get('[aria-current="location"]').element);
  await view.setProps({ loading: false }); await settled();
  expect(document.activeElement).toBe(view.get('[aria-current="location"]').element);
  await view.setProps({ items });
  (view.get('button').element as HTMLElement).focus(); await view.get('button').trigger('click');
  await view.setProps({ loading: true, items: items.slice(0, 1) });
  const other = document.createElement('button'); document.body.append(other); other.focus();
  await view.setProps({ loading: false }); await settled(); expect(document.activeElement).toBe(other);
});

it('keeps the last three steps visible and navigates using their original indices', async () => {
  const path = [...items, {id:'extra:1',title:'Genre Homo'}, {id:'extra:2',title:'Époque moderne'}];
  view=mount(StoryBreadcrumb,{props:{items:path,maxVisible:3},attachTo:document.body});
  expect(view.findAll('.story-breadcrumb__step button').map(button=>button.text())).toEqual(['Terre','Genre Homo']);
  expect(view.get('[aria-current="location"]').text()).toBe('Époque moderne');
  await view.get('[aria-haspopup="menu"]').trigger('click');await settled();
  expect(view.get('[role="menu"]').classes()).toContain('popover-surface');
  expect(view.findAll('[role="menuitem"]').map(item=>item.text())).toEqual(['Univers Moderne','Système solaire']);
  await view.findAll('.story-breadcrumb__step button')[0].trigger('click');expect(view.emitted('navigate')).toEqual([[2]]);
});

it('selects an earlier step, closes the menu and restores focus to its destination',async()=>{
  view=mount(StoryBreadcrumb,{props:{items:[...items,{id:'extra',title:'Genre Homo'}],maxVisible:1},attachTo:document.body});
  await view.get('[aria-haspopup="menu"]').trigger('click');await settled();
  await view.findAll('[role="menuitem"]')[1].trigger('click');expect(view.emitted('navigate')).toEqual([[1]]);
  expect(view.find('[role="menu"]').exists()).toBe(false);
  await view.setProps({items:items.slice(0,2),loading:true});await settled();
  await view.setProps({loading:false});await settled();
  expect(document.activeElement).toBe(view.get('[aria-current="location"]').element);
});

it('does not add an overflow control for short paths and disables it while loading',async()=>{
  render();await view.setProps({maxVisible:3});expect(view.find('[aria-haspopup="menu"]').exists()).toBe(false);
  await view.setProps({maxVisible:1,loading:true});expect(view.get('[aria-haspopup="menu"]').attributes('disabled')).toBeDefined();
  expect(view.findAll('.story-breadcrumb__step button')).toHaveLength(0);
});

it('keeps the current step visible on a narrow container and restores recent steps when it grows',async()=>{
  let resize!:(width:number)=>void;
  vi.stubGlobal('ResizeObserver',class {
    constructor(callback:ResizeObserverCallback){resize=width=>callback([{contentRect:{width}}] as ResizeObserverEntry[],this as unknown as ResizeObserver);}
    observe(){} disconnect(){}
  });
  const path=[...items,{id:'extra:1',title:'Genre Homo'},{id:'extra:2',title:'Époque moderne'}];
  view=mount(StoryBreadcrumb,{props:{items:path,maxVisible:3},attachTo:document.body});await settled();
  resize(280);await settled();
  expect(view.findAll('.story-breadcrumb__step button')).toHaveLength(0);
  await view.get('[aria-haspopup="menu"]').trigger('click');await settled();expect(view.findAll('[role="menuitem"]')).toHaveLength(4);
  expect(view.get('[aria-current="location"]').text()).toBe('Époque moderne');
  resize(800);await settled();expect(view.findAll('.story-breadcrumb__step button').map(button=>button.text())).toEqual(['Terre','Genre Homo']);
  expect(view.find('[role="menu"]').exists()).toBe(false);
  await view.get('[aria-haspopup="menu"]').trigger('click');await settled();expect(view.findAll('[role="menuitem"]')).toHaveLength(2);
});


it('uses the design-system icon button and supports menu arrows, Escape and outside dismissal',async()=>{
  view=mount(StoryBreadcrumb,{props:{items,maxVisible:1},attachTo:document.body});
  const trigger=view.get('[aria-haspopup="menu"]');
  expect(trigger.classes()).toContain('base-button--icon-only');
  (trigger.element as HTMLElement).focus();await trigger.trigger('keydown',{key:'ArrowDown'});await settled();
  const options=view.findAll('[role="menuitem"]');expect(document.activeElement).toBe(options[0].element);
  await options[0].trigger('keydown',{key:'ArrowDown'});expect(document.activeElement).toBe(options[1].element);
  await options[1].trigger('keydown',{key:'Home'});expect(document.activeElement).toBe(options[0].element);
  await options[0].trigger('keydown',{key:'Escape'});await settled();
  expect(view.find('[role="menu"]').exists()).toBe(false);expect(document.activeElement).toBe(trigger.element);
  await trigger.trigger('click');await settled();expect(view.find('[role="menu"]').exists()).toBe(true);
  document.body.click();await settled();expect(view.find('[role="menu"]').exists()).toBe(false);
});

it('marks a custom current selector as the current location and restores focus after ancestor navigation', async () => {
  view = mount(StoryBreadcrumb, {
    props: { items, currentNavigable: true },
    slots: { current: '<button>Choisir une frise associée</button>' },
    attachTo: document.body,
  });
  const current = view.get('[aria-current="location"]');
  expect(current.text()).toBe('Choisir une frise associée');
  expect(current.classes()).toContain('story-breadcrumb__item');
  const ancestor = view.get('.story-breadcrumb__item--link');
  (ancestor.element as HTMLElement).focus(); await ancestor.trigger('click');
  await view.setProps({ items: items.slice(0, 1) }); await settled();
  expect(document.activeElement).toBe(view.get('[aria-current="location"]').element);
});
