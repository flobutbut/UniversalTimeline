import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import StoryItemActionsMenu from '@/views/DatabaseView/StoryItemActionsMenu.vue';
import StoryFromPeriodModal from '@/views/DatabaseView/StoryFromPeriodModal.vue';
import { previewStoryFromPeriod } from '@/lib/storyFromPeriod';
import { StoryApiService } from '@/services/StoryApiService';
import { apiClient } from '@/services/ApiClient';
import { useDatabaseView } from '@/composables/useDatabaseView';
import { useUiStore } from '@/stores/useUiStore';
import type { Event, Period } from '@/types/database';

vi.mock('@/services/ApiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
let view: ReturnType<typeof mount> | undefined;
afterEach(() => { view?.unmount(); view = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); });

const period = (id: string, startDate: string, endDate: string, storyParentId: string | null = null) =>
  ({ id, label: { fr: id, en: '' }, startDate, endDate, storyParentId, categories: [] }) as unknown as Period;
const event = (id: string, date: string) => ({ id, label: { fr: id, en: '' }, date, categories: [] }) as unknown as Event;
const periods = [period('root', '1957-10-04', 'TODAY'), period('apollo', '1961-05-25', '1972-12-19', 'root'), period('gemini', '1961-12-07', '1966-11-15', 'apollo'), period('mir', '1986-02-20', '2001-03-23', 'root')];
const events = [event('in', '1969-07-16'), event('edge', '1972-12-19'), event('out', '1986-02-20'), event('undated', '')];

it('previews the copied branch and the frise events within the period, bounds included', () => {
  expect(previewStoryFromPeriod(periods, events, 'apollo')).toMatchObject({ label: 'apollo', periodCount: 2, eventCount: 2, datesKnown: true });
  expect(previewStoryFromPeriod(periods, events, 'mir')).toMatchObject({ periodCount: 1, eventCount: 1 });
  expect(previewStoryFromPeriod([period('vague', '', '')], events, 'vague')).toMatchObject({ eventCount: 0, datesKnown: false });
  expect(previewStoryFromPeriod(periods, events, 'absent')).toBeNull();
});

it('offers « Créer une frise » only on periods and emits it', async () => {
  view = mount(StoryItemActionsMenu, { props: { label: 'Apollo' }, attachTo: document.body });
  await view.get('button').trigger('click'); await flushPromises();
  expect([...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent?.trim())).toEqual(['Modifier', 'Supprimer']);
  view.unmount();
  view = mount(StoryItemActionsMenu, { props: { label: 'Apollo', createStory: true }, attachTo: document.body });
  await view.get('button').trigger('click'); await flushPromises();
  const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  expect(items.map(item => item.textContent?.trim())).toEqual(['Modifier', 'Créer une frise', 'Supprimer']);
  items[1].click();
  expect(view.emitted('create-story')).toHaveLength(1);
});

it('describes the copy, keeps the source untouched and confirms a trimmed, non-empty title', async () => {
  const preview = previewStoryFromPeriod(periods, events, 'apollo')!;
  view = mount(StoryFromPeriodModal, { props: { preview }, attachTo: document.body }); await flushPromises();
  const text = document.body.textContent ?? '';
  expect(text).toContain('1 sous-période'); expect(text).toContain('2 événements de la frise dans cette plage');
  expect(text).toContain('La frise actuelle n’est pas modifiée');
  const input = document.querySelector<HTMLInputElement>('input')!;
  expect(input.value).toBe('apollo');
  input.value = '   '; input.dispatchEvent(new Event('input'));
  document.querySelector<HTMLFormElement>('#story-from-period-form')!.dispatchEvent(new Event('submit', { cancelable: true })); await flushPromises();
  expect(view.emitted('confirm')).toBeUndefined();
  expect(document.body.textContent).toContain('Le titre est obligatoire.');
  input.value = '  Programme Apollo '; input.dispatchEvent(new Event('input'));
  document.querySelector<HTMLFormElement>('#story-from-period-form')!.dispatchEvent(new Event('submit', { cancelable: true })); await flushPromises();
  expect(view.emitted('confirm')).toEqual([['Programme Apollo']]);
});

describe('from the Frises page state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(useUiStore(), 'notify').mockImplementation(() => 0 as never);
    vi.mocked(apiClient.get).mockResolvedValue([]);
  });
  function start() {
    const scope = effectScope();
    const state = scope.run(() => useDatabaseView())!;
    state.selectedStory.value = { id: '14', title: { fr: 'Conquête spatiale', en: '' }, author: '', isPublic: true, categories: [], periods, events };
    state.selectedStoryId.value = '14';
    return { state, scope };
  }
  it('creates the frise in one request and closes the dialog on success', async () => {
    const create = vi.spyOn(StoryApiService.getInstance(), 'createStoryFromPeriod').mockResolvedValue({ id: '16', periodCount: 2, eventCount: 2 });
    const { state, scope } = start();
    state.openStoryFromPeriod('apollo');
    expect(state.storyFromPeriod.value?.preview.periodCount).toBe(2);
    await state.confirmStoryFromPeriod('Programme Apollo');
    expect(create).toHaveBeenCalledExactlyOnceWith('14', 'apollo', 'Programme Apollo');
    expect(state.storyFromPeriod.value).toBeNull();
    scope.stop();
  });
  it('keeps the dialog with the error and never resends after a lost response', async () => {
    const create = vi.spyOn(StoryApiService.getInstance(), 'createStoryFromPeriod').mockRejectedValue(Object.assign(new Error('socket hang up'), { request: {} }));
    const { state, scope } = start();
    state.openStoryFromPeriod('apollo');
    await state.confirmStoryFromPeriod('Programme Apollo');
    expect(create).toHaveBeenCalledOnce();
    expect(state.storyFromPeriod.value?.error).toMatch(/Rechargez les données/);
    expect(state.storyFromPeriod.value?.busy).toBe(false);
    scope.stop();
  });
});
