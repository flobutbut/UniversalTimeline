import type { MultilingualText, StorySummary } from '@/types/database';
import type { TimelineStoryProperties, TimelineVia } from './analytics';

const title = (text: MultilingualText | undefined) => text?.fr || text?.en || undefined;

/** Entry announced by another page (a search result) for the next timeline navigation; it expires quickly. */
let announcedEntry: { via: TimelineVia; until: number } | null = null;
export function announceTimelineEntry(via: TimelineVia, now = Date.now()) { announcedEntry = { via, until: now + 10_000 }; }
export function takeAnnouncedEntry(now = Date.now()): TimelineVia | null {
  const entry = announcedEntry; announcedEntry = null;
  return entry && now <= entry.until ? entry.via : null;
}

/** Entry without announcement, from Vue Router's previous path: a landing, another page of the app, or outside. */
export function entryVia(previousPath: unknown): TimelineVia {
  if (typeof previousPath !== 'string') return 'link';
  const path = previousPath.split(/[?#]/)[0];
  return path === '/' || path === '/voyage' ? 'landing' : 'app';
}

export interface StoryScope { story: StorySummary | undefined; username: string | null | undefined; signedIn: boolean }

/** A frise is identified only when it is known to be public; ownership is compared with the username that signs it. */
export function storyProperties({ story, username, signedIn }: StoryScope): TimelineStoryProperties {
  const visibility = !story ? 'unknown' : story.isPublic ? 'public' : 'private';
  return {
    story_visibility: visibility,
    ...(story && visibility === 'public' ? { story_id: String(story.id), story_title: title(story.title) } : {}),
    own_story: !!story && !!username && story.author === username,
    signed_in: signedIn,
  };
}

type Item = { id: string; label: MultilingualText } | null | undefined;
// Periods and events are named only inside a public frise: inside a private one they would describe its content.
const named = (scope: StoryScope, item: Item) => !!item && scope.story?.isPublic === true;
export function periodProperties(scope: StoryScope, period: Item): { period_id?: string; period_title?: string } {
  return named(scope, period) ? { period_id: period!.id, period_title: title(period!.label) } : {};
}
export function eventProperties(scope: StoryScope, event: Item): { event_id?: string; event_title?: string } {
  return named(scope, event) ? { event_id: event!.id, event_title: title(event!.label) } : {};
}
