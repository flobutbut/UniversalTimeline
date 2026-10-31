import { afterEach, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';

const items = [
  { id: 'story:1', title: 'Univers Moderne' },
  { id: 'period:1', title: 'Système solaire' },
  { id: 'period:2', title: 'Terre' },
];
let view: VueWrapper;
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; });
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
