import { expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';

const router = () => createRouter({ history: createMemoryHistory(), routes: [
  { path: '/', component: { template: '<p>Accueil</p>' } },
  { path: '/timeline', name: 'timeline', component: { template: '<p>Timeline</p>' } },
] });

it('renders a real link with the button styles when given a destination', async () => {
  const r = router(); await r.push('/'); await r.isReady();
  const view = mount(Button, { props: { variant: 'tertiary', size: 'sm', to: { path: '/timeline', query: { story: '14' } } }, slots: { default: 'Voir dans la timeline' }, global: { plugins: [r] } });
  const link = view.get('a');
  expect(link.attributes('href')).toBe('/timeline?story=14');
  expect(link.classes()).toEqual(expect.arrayContaining(['base-button', 'base-button--tertiary', 'base-button--sm']));
  expect(link.attributes('type')).toBeUndefined(); expect(link.attributes('disabled')).toBeUndefined();
  await link.trigger('click'); await flushPromises();
  expect(r.currentRoute.value.fullPath).toBe('/timeline?story=14');
});

it('stays an inert button when disabled, and a plain button without destination', () => {
  const disabled = mount(Button, { props: { to: '/timeline', disabled: true }, slots: { default: 'Voir' } });
  expect(disabled.find('a').exists()).toBe(false);
  expect(disabled.get('button').attributes('disabled')).toBeDefined();
  const plain = mount(Button, { props: { pressed: true }, slots: { default: 'Public' } });
  expect(plain.get('button').attributes()).toMatchObject({ type: 'button', 'aria-pressed': 'true' });
});

it('falls back to an ordinary link outside a router', () => {
  const view = mount(Button, { props: { to: { path: '/timeline', query: { story: '14' } } }, slots: { default: 'Voir' } });
  expect(view.get('a').attributes('href')).toBe('/timeline?story=14');
});
