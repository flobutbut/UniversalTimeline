import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import EventCard from '@/views/HomeView/EventCard.vue';

let view: VueWrapper;
afterEach(() => { view?.unmount(); });
function start(minimized = false) {
  view = mount(EventCard, { attachTo: document.body, props: {
    event: { id: 'event', label: { fr: 'Événement', en: '' }, date: '1776', categories: [], description: { fr: 'Description à lire.', en: '' } },
    isSelected: false, isDefaultOpen: !minimized, minimized, isTagActive: false,
    cardStyle: { width: '0', left: '50%' },
    storySuggestions: [{ id: '2', title: { fr: 'Autre frise', en: '' } }],
  } });
}

it('keeps the same anchored detail when hover hands over to keyboard focus', async () => {
  start();
  const detail = view.get('.event-info-box').element;
  await view.trigger('mouseenter');
  await view.trigger('focusin');
  await view.trigger('mouseleave');
  expect(view.emitted('active-change')).toEqual([[true], [true], [true]]);
  await view.trigger('focusout');
  expect(view.emitted('active-change')?.at(-1)).toEqual([false]);
  expect(view.get('.event-info-box').element).toBe(detail);
  expect(view.get('.event-info-box').attributes('style')).toBeUndefined();
  expect(view.get('.event-info-box').attributes('popover')).toBeUndefined();
});

it.each([false, true])('preserves pinning and independent associated links (minimized: %s)', async minimized => {
  start(minimized);
  await view.get('.event-dot').trigger('click');
  expect(view.emitted('click')).toHaveLength(1);
  await view.setProps({ isSelected: true });
  expect(view.get('.event-dot').attributes('aria-pressed')).toBe('true');
  await view.get('.event-story-item').trigger('click');
  expect(view.emitted('story-select')).toEqual([['2']]);
  expect(view.emitted('click')).toHaveLength(1);
  await view.get('.event-label').trigger('click');
  expect(view.emitted('click')).toHaveLength(2);
  expect(view.get('.event-info-box').attributes('popover')).toBeUndefined();
});

it('keeps the pinned detail, keyboard focus and associated links when its frame resizes', async () => {
  start();
  await view.setProps({ isSelected: true, frameWidth: 366, cardStyle: { width: '0', left: '75%' } });
  const detail = view.get('.event-info-box').element;
  const link = view.get('.event-story-item');
  (link.element as HTMLElement).focus();
  expect(document.activeElement).toBe(link.element);
  await view.setProps({ frameWidth: 296 });
  expect(view.get('.event-info-box').element).toBe(detail);
  expect(document.activeElement).toBe(link.element);
  expect(view.get('.event-dot').attributes('aria-pressed')).toBe('true');
  await link.trigger('click');
  expect(view.emitted('story-select')).toEqual([['2']]);
  expect(view.emitted('click')).toBeUndefined();
});
