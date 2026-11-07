import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, expect, it, vi } from 'vitest';
import { useDataStore } from '@/stores/useDataStore';
import { installSeo } from '../installSeo';
import { appRoutes } from '@/router/routes';
import { SEO_PATHS } from '../metadata';
import { readFileSync } from 'node:fs';
import { config as middlewareConfig } from '../../../middleware';

let stop: (() => void) | undefined;
afterEach(() => { stop?.(); });
it('updates public titles on navigation and never copies a private title into head tags', async () => {
  setActivePinia(createPinia());
  const data = useDataStore();
  data.stories = [
    { id: '22', title: { fr: 'Extinctions', en: '' }, description: { fr: 'Les crises.', en: '' }, isPublic: true, author: '', categories: [] },
    { id: '55', title: { fr: 'SECRET TITLE', en: '' }, description: { fr: 'SECRET DESCRIPTION', en: '' }, isPublic: false, author: '', categories: [] },
  ];
  const routes = ['/timeline', '/contact', '/login'].map(path => ({ path, name: path.slice(1), component: { template: '<div />' } }));
  const router = createRouter({ history: createMemoryHistory(), routes });
  const load = vi.spyOn(data, 'ensureStoriesLoaded');
  await router.push('/timeline?story=22');
  stop = installSeo(router, data, true);
  await nextTick();
  expect(document.title).toContain('Extinctions');
  await router.push('/timeline?story=55');
  await nextTick();
  expect(document.head.innerHTML).not.toContain('SECRET');
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  await router.push('/contact?utm_source=example');
  await nextTick();
  expect(document.title).toContain('Contact');
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://universaltimeline.net/contact');
  expect(load).not.toHaveBeenCalled();
});

it('preserves the server-supplied public title while the first catalogue read is pending', async () => {
  setActivePinia(createPinia());
  const data = useDataStore();
  data.requests.stories = { loading: true, error: null };
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/timeline', name: 'timeline', component: { template: '<div />' } }] });
  await router.push('/timeline?story=22');
  document.title = 'Initial public frise title';
  stop = installSeo(router, data, true);
  await nextTick();
  expect(document.title).toBe('Initial public frise title');
});

it('keeps every declared production route and alias routable through Vercel', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const rules = config.services.app.routes;
  const declared = appRoutes.flatMap(route => route.path.includes(':') || route.path.startsWith('/prototype/') ? [] : [route.path, ...[route.alias ?? []].flat()]);
  for (const path of declared) {
    expect(SEO_PATHS, path).toContain(path);
    if (path !== '/') expect(rules.some((rule: { src?: string; status?: number }) => rule.src && !rule.status && new RegExp(rule.src).test(path)), path).toBe(true);
  }
  const legal = ['mentions-legales', 'confidentialite', 'cookies', 'conditions'];
  for (const name of legal) expect(rules.some((rule: { src?: string; status?: number }) => rule.src && !rule.status && new RegExp(rule.src).test(`/legal/${name}`))).toBe(true);
  expect(rules.at(-1)).toMatchObject({ status: 404, dest: '/404.html' });
  expect(config.rewrites[0]).toMatchObject({ source: '/api/(.*)', destination: { service: 'server' } });
  expect(middlewareConfig.matcher).toContain('/sitemap.xml');
});
