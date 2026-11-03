import { withTransaction } from '../api/database.js';
import type { GeneratedStoryInput } from '../api/wikidataGenerationInput.js';
import { insertStory } from '../repositories/storyRepository.js';
import { insertAssociations, insertFrozenPlacements, setRelationLockTimeout } from '../repositories/storyRelationsRepository.js';
import { insertOrReuseGeneratedItem, findGeneratedStoryMatches, lockGeneratedStoryTopic } from '../repositories/wikidataGenerationRepository.js';
import { StoryAssociationError, WikidataGenerationConflictError } from '../domain/errors.js';
import { creatorAuthor } from './storyAuthor.js';
import { PRIVATE_DRAFT_MESSAGE, refusesPublication } from '../domain/storyVisibility.js';

export function findExistingGeneratedStories(qid: string, title: string) {
  return withTransaction(client => findGeneratedStoryMatches(client, qid, title));
}

/** Same verified principal and transaction for the story, imports and links. */
export function createGeneratedStory(input: GeneratedStoryInput) {
  // A generated frise has no parent yet: it starts as a private draft.
  if (refusesPublication(input.story.isPublic, { isPublic: false, parentStoryId: null })) throw new StoryAssociationError(400, PRIVATE_DRAFT_MESSAGE);
  return withTransaction(async client => {
    await setRelationLockTimeout(client);
    // Serialize equal subjects/titles across requests, then read a fresh RLS snapshot.
    await lockGeneratedStoryTopic(client, input.qid, input.story.title.fr);
    const matches = await findGeneratedStoryMatches(client, input.qid, input.story.title.fr);
    if (matches.some(story => !input.acknowledgedStoryIds.includes(story.id))) throw new WikidataGenerationConflictError(matches);
    const story = await insertStory(client, { ...input.story, isPublic: input.story.isPublic ?? false, author: await creatorAuthor(client) });
    const periods = new Map<string, string>(); const events: string[] = [];
    // Stable lock ordering makes overlapping imports less likely to deadlock.
    for (const item of [...input.items].sort((a, b) => a.data.wikidata_id.localeCompare(b.data.wikidata_id))) {
      const id = await insertOrReuseGeneratedItem(client, item);
      if (item.type === 'period') periods.set(item.data.wikidata_id, id);
      else events.push(id);
    }
    if (periods.size) await insertFrozenPlacements(client, story.id, input.items.filter(item => item.type === 'period').map(item => ({
      id: periods.get(item.data.wikidata_id)!, parent_id: item.parentQid ? periods.get(item.parentQid)! : null,
    })));
    if (events.length) await insertAssociations(client, String(story.id), 'event', events);
    return { id: String(story.id), periodCount: periods.size, eventCount: events.length };
  });
}
