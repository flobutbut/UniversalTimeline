import type { StorySuggestion, StorySummary } from '@/types/database';

interface Sources {
  /** Stories enfants de la frise courante ancrées sur l'événement. */
  anchored: () => Promise<StorySuggestion[]>;
  /** Appartenances lisibles : eventId → storyIds. */
  memberships: () => Promise<Map<string, string[]>>;
  /** Frises lisibles, pour leurs titres. */
  stories: () => Promise<StorySummary[]>;
}

/** Frises vers lesquelles poursuivre depuis un événement : ancrées d'abord, puis celles qui le contiennent. */
export async function loadEventStorySuggestions(currentStoryId: string, eventId: string, sources: Sources): Promise<StorySuggestion[]> {
  const [anchored, memberships, stories] = await Promise.all([sources.anchored(), sources.memberships(), sources.stories()]);
  const byId = new Map(stories.map(story => [story.id, story]));
  const seen = new Set([currentStoryId, ...anchored.map(story => story.id)]);
  const containing: StorySuggestion[] = [];
  for (const id of memberships.get(eventId) ?? []) {
    const story = byId.get(id);
    if (!story || seen.has(id)) continue;
    seen.add(id);
    containing.push({ id, title: story.title, parentStoryId: null });
  }
  containing.sort((a, b) => (a.title.fr || a.title.en).localeCompare(b.title.fr || b.title.en, 'fr'));
  return [...anchored.filter(story => story.id !== currentStoryId), ...containing];
}
