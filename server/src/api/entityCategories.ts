import { parseEntityId } from './inputValidation.js';

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


export function parseWriteCategories<T extends { categories: unknown }>(input: T) {
  return { ...input, categories: parseCategoryIds(input.categories) };
}
