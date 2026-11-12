import { InputValidationError, parseSearchText } from './inputValidation.js';
import { CATALOGUE_MAX_PAGE_SIZE, CATALOGUE_PAGE_SIZE, type CatalogueRange, type StoryCatalogueInput } from '../shared/storyCatalogue.js';

function range(query: Record<string, unknown>, prefix: string): CatalogueRange | null {
  const old = query[`${prefix}Old`], recent = query[`${prefix}Recent`];
  if (old === undefined && recent === undefined) return null;
  const number = (value: unknown) => typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  const oldBP = number(old), recentBP = number(recent);
  if (!Number.isFinite(oldBP) || !Number.isFinite(recentBP) || recentBP < 0 || oldBP < recentBP || oldBP > 1.4e10) {
    throw new InputValidationError(prefix, 'La plage de dates du catalogue est invalide.');
  }
  return { oldBP, recentBP };
}
export function parseStoryCatalogueInput(query: Record<string, unknown>): StoryCatalogueInput {
  const search = parseSearchText(query.q, 'q', 300);
  const tags = parseSearchText(query.tags, 'tags', 1000);
  const tagIds = [...new Set(tags ? tags.split(',') : [])];
  if (tagIds.length > 32 || tagIds.some(tag => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag) || tag.length > 100)) {
    throw new InputValidationError('tags', 'Les tags du catalogue sont invalides.');
  }
  const cursor = query.cursor === undefined ? null : query.cursor;
  if (cursor !== null && (typeof cursor !== 'string' || !/^[1-9]\d*$/.test(cursor) || Number(cursor) > 2147483647)) {
    throw new InputValidationError('cursor', 'La position du catalogue est invalide.');
  }
  const rawLimit = query.limit;
  const limit = rawLimit === undefined ? CATALOGUE_PAGE_SIZE : typeof rawLimit === 'string' && /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > CATALOGUE_MAX_PAGE_SIZE) {
    throw new InputValidationError('limit', `Le catalogue accepte de 1 à ${CATALOGUE_MAX_PAGE_SIZE} frises par page.`);
  }
  return { search, tagIds, cursor, limit, timeRange: range(query, 'time'), periodRange: range(query, 'period') };
}
