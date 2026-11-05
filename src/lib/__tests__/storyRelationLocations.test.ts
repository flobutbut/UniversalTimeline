import { expect, it } from 'vitest';
import { hasStoryLocation, hasStoryRootLocation } from '../storyRelationLocations';
import { storyNavigationLinks } from '../storyNavigationLinks';
import { storyFixture } from '@/testFixtures/story';

it('distinguishes root, period and event locations without inventing a root', () => {
  const link = { atRoot: false, anchors: [{ type: 'event' as const, id: 'event' }] };
  expect(hasStoryRootLocation(link)).toBe(false);
  expect(hasStoryLocation(link, { type: 'event', id: 'event' })).toBe(true);
  expect(hasStoryLocation(link, { type: 'period', id: 'event' })).toBe(false);
  expect(hasStoryRootLocation({ ...link, atRoot: true })).toBe(true);
  expect(hasStoryRootLocation({ anchors: [] })).toBe(true);
  expect(hasStoryRootLocation({ atRoot: false, anchors: [] })).toBe(false);
});

it('never promotes a missing anchor to the root when navigation filters it out', () => {
  const story = storyFixture('1', [], []);
  story.childStories = [{ id: '2', title: { fr: 'Autre', en: '' }, anchors: [{ type: 'period', id: 'missing' }] }];
  expect(storyNavigationLinks(story)[0]).toMatchObject({ anchors: [], atRoot: false });
});
