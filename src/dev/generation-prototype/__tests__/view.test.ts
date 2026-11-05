import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import View from '../GenerationPrototypeView.vue';
import { loadExample, readLive } from '../transport';
import picasso from '../fixtures/Q5593.json';
import apollo from '../fixtures/Q43653.json';
import type { LabSnapshot } from '../model';

vi.mock('../transport', () => ({ loadExample: vi.fn(), readLive: vi.fn() }));
vi.mock('@/services/SearchApiService', () => ({ SearchApiService: { getInstance: () => ({ searchWikidataEntityLabels: vi.fn().mockResolvedValue([]) }) } }));
let view: ReturnType<typeof mount>, router: Router;
const button = (name: string) => view.findAll('button').find(b => b.text() === name)!;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(loadExample).mockImplementation(async qid => structuredClone(qid === 'Q5593' ? picasso : apollo) as LabSnapshot);
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/prototype/generation', name: 'generation-prototype', component: View },
    { path: '/generate', name: 'wikidata-generation', component: { template: '<p>Current generator</p>' } },
  ] });
  await router.push('/prototype/generation?wikidata=Q5593');
  view = mount(View, { global: { plugins: [router] } });
  await flushPromises();
});
afterEach(() => { view?.unmount(); router?.options.history.destroy(); });

it('opens the recorded Picasso data and updates selection without writing a timeline', async () => {
  expect(view.text()).toContain('Pablo Picasso');
  expect(button('Exporter 18 faits en JSON')).toBeDefined();
  await view.get('input[aria-label="Inclure Naissance de Pablo Picasso"]').setValue(false);
  expect(button('Exporter 17 faits en JSON')).toBeDefined();
  await button('Tout retirer').trigger('click');
  expect(button('Exporter 0 faits en JSON').attributes('disabled')).toBeDefined();
  expect(readLive).not.toHaveBeenCalled();
});
it('compares the empty old engine against sourced factual proposals', async () => {
  await button('Comparer les moteurs').trigger('click');
  expect(view.get('[aria-label="Comparaison des moteurs"]').text()).toContain('0 éléments valides / 0 proposés');
  expect(view.get('[aria-label="Comparaison des moteurs"]').text()).toContain('18 proposés');
});
it('lets the reader inspect a timeline fact back in its source declaration', async () => {
  await button('Aperçu de la frise').trigger('click');
  await view.get('button[aria-label="Voir la source : Naissance de Pablo Picasso"]').trigger('click');
  const detail = view.find('details[open]');
  expect(detail.text()).toContain('Déclaration d’origine');
  expect(detail.find('a').attributes('href')).toContain('https://www.wikidata.org/wiki/Q5593#');
});
it('keeps the last successful example visible when a live read fails', async () => {
  vi.mocked(readLive).mockRejectedValue(new Error('Wikidata est indisponible.'));
  await button('Actualiser depuis Wikidata').trigger('click'); await flushPromises();
  expect(view.get('[role="alert"]').text()).toContain('Wikidata est indisponible.');
  expect(view.text()).toContain('Naissance de Pablo Picasso');
});
it('ignores a late result after a different subject was chosen', async () => {
  let resolve!: (data: LabSnapshot) => void;
  vi.mocked(readLive).mockReturnValue(new Promise(yes => { resolve = yes; }));
  await button('Actualiser depuis Wikidata').trigger('click');
  await router.push('/prototype/generation?wikidata=Q43653&family=space'); await flushPromises();
  resolve(structuredClone(picasso) as LabSnapshot); await flushPromises();
  expect(view.get('.lab-subject h2').text()).toBe('Apollo 11');
  expect(view.text()).not.toContain('Naissance de Pablo Picasso');
  expect(vi.mocked(readLive).mock.calls[0][2].aborted).toBe(true);
});
it('explains a subject submission with no selected match instead of doing nothing', async () => {
  await view.get('input[placeholder="Ex. Napoléon, Q517…"]').setValue('unknown test subject');
  await view.get('form').trigger('submit');
  expect(view.text()).toContain('Choisissez un résultat de recherche');
  expect(router.currentRoute.value.query.wikidata).toBe('Q5593');
});
