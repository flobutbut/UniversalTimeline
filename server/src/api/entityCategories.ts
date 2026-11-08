import { parseEntityId } from './inputValidation.js';
import { parseTagging } from './entityTags.js';

export class InvalidCategoriesError extends Error {
  constructor() {
    super('categories doit être un tableau de 500 objets maximum, avec un id non vide.');
  }
}

/** Undefined preserves associations; an explicit empty array clears them. */
export function parseCategoryIds(categories: unknown): string[] | undefined {
  if (categories === undefined) return undefined;
  if (!Array.isArray(categories) || categories.length > 500) throw new InvalidCategoriesError();
  const ids = categories.map(category => {
    if (!category || typeof category !== 'object' || Array.isArray(category) || typeof category.id !== 'string' || !category.id.trim()) {
      throw new InvalidCategoriesError();
    }
    return parseEntityId(category.id, 'categories');
  });
  return [...new Set(ids)];
}


export function parseWriteCategories<T extends { categories: unknown; tags: unknown; non_thematic?: unknown }>(input: T) {
  const { tags, non_thematic } = parseTagging(input.tags, input.non_thematic);
  const { non_thematic: _raw, ...rest } = input;
  return { ...rest, categories: parseCategoryIds(input.categories), tags, ...('non_thematic' in input ? { non_thematic } : {}) };
}
