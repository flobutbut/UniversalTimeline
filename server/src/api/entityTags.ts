import { InputValidationError } from './inputValidation.js';

const TAG_ID = /^[a-z]+(-[a-z]+)*$/;
export const MAX_TAGS = 3;

/** Undefined preserves the tags; an empty array clears them. The order is the rank, the first being primary. */
export function parseTagIds(tags: unknown): string[] | undefined {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags) || tags.length > MAX_TAGS || tags.some(id => typeof id !== 'string' || id.length > 64 || !TAG_ID.test(id)) || new Set(tags).size !== tags.length) {
    throw new InputValidationError('tags', `tags doit être une liste de ${MAX_TAGS} identifiants distincts au maximum.`);
  }
  return tags as string[];
}

/** A non-thematic period carries no domain: the two facts are kept consistent here, before any write. */
export function parseTagging(tagsInput: unknown, nonThematicInput: unknown): { tags: string[] | undefined; non_thematic?: boolean } {
  const tags = parseTagIds(tagsInput);
  if (nonThematicInput === undefined) return tags?.length ? { tags, non_thematic: false } : { tags };
  if (typeof nonThematicInput !== 'boolean') throw new InputValidationError('nonThematic', 'nonThematic doit être un booléen.');
  if (nonThematicInput && tags?.length) throw new InputValidationError('tags', 'Une période non thématique ne porte aucun tag.');
  return { tags: nonThematicInput ? [] : tags, non_thematic: nonThematicInput };
}
