import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import PublicStoryCard from '@/components/catalogue/PublicStoryCard.vue';
import { fetchWikipediaThumbnail } from '@/services/wikipediaImages';

vi.mock('@/services/wikipediaImages', () => ({ fetchWikipediaThumbnail: vi.fn() }));
let view: ReturnType<typeof mount>;
let router: ReturnType<typeof createRouter>;
afterEach(() => { view?.unmount(); router?.options.history.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function start() {
  router = createRouter({ history: createMemoryHistory(), routes: ['timeline', 'database'].map(name => ({ path: `/${name}`, name, component: { template: '<div />' } })) });
  await router.push('/timeline');
  view = mount(PublicStoryCard, { props: { story: { id: '1', title: { fr: 'Marie Curie', en: 'Marie Curie' }, categories: [], author: 'Alice', isPublic: true } }, global: { plugins: [router] } });
}
it('requests the existing Wikipedia thumbnail only near the viewport and keeps the fallback on failure', async () => {
  let intersect!: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect = disconnect; });
  vi.mocked(fetchWikipediaThumbnail).mockRejectedValue(new Error('Unavailable'));
  await start();
  expect(fetchWikipediaThumbnail).not.toHaveBeenCalled();
  intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver); await flushPromises();
  expect(fetchWikipediaThumbnail).toHaveBeenCalledWith({ fr: 'Marie Curie', en: 'Marie Curie' }, { signal: expect.any(AbortSignal) });
  expect(view.find('.public-story-card__fallback').exists()).toBe(true);
  expect(view.find('img').exists()).toBe(false);
  expect(view.get('.public-story-card__open').attributes('href')).toBe('/timeline?story=1&entry=universe');
  expect(disconnect).toHaveBeenCalled();
});
it('renders a Wikimedia image and returns to the fallback if the image cannot load', async () => {
  vi.mocked(fetchWikipediaThumbnail).mockResolvedValue({ src: 'https://upload.wikimedia.org/portrait.jpg', width: 640, height: 800 });
  await start(); await flushPromises();
  expect(view.get('img').attributes('src')).toBe('https://upload.wikimedia.org/portrait.jpg');
  await view.get('img').trigger('load');
  expect(view.find('.wikipedia-image.is-loaded').exists()).toBe(true);
  await view.get('img').trigger('error');
  expect(view.find('img').exists()).toBe(false);
  expect(view.find('.public-story-card__fallback').exists()).toBe(true);
});
