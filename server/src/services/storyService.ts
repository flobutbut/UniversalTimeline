import { readEntityCategories } from './entityCategories.js';
import { query, withTransaction } from '../api/database.js';
import { NotFoundError } from '../domain/errors.js';
import type { StoryWrite } from '../domain/writeInputs.js';
import * as stories from '../repositories/storyRepository.js';
import { listDetailedCategories, replaceEntityCategories } from '../repositories/categoryRepository.js';
import { description, localized, groupCategories, mapCategory, mapPeriodDetail, mapEventDetail } from './mappers.js';
import { loadStoryTemporalBounds } from './storyTemporalBounds.js';
import * as associations from './storyAssociations.js';
import type { AssociationKind } from '../repositories/storyRelationsRepository.js';

const db = { query };
export async function listStories() {
  const rows = await stories.listStories(db);
  const bounds = new Map((await loadStoryTemporalBounds()).map(bound => [String(bound.story_id), bound]));
  return groupCategories(rows, row => ({
    id: row.id, title_fr: row.title_fr, title_en: row.title_en,
    description_fr: row.description_fr, description_en: row.description_en,
    author: row.author, is_public: row.is_public, owner_user_id: row.owner_user_id,
    parent_story_id: row.parent_story_id ?? null,
    created_at: row.created_at, updated_at: row.updated_at,
    preview_periods: row.preview_periods ?? [], preview_events: row.preview_events ?? [],
    start_date: bounds.get(String(row.id))?.start_date ?? null, end_date: bounds.get(String(row.id))?.end_date ?? null,
  }));
}
export async function getStory(id: string) {
  const row = await stories.findStory(db, id);
  if (!row) throw new NotFoundError('Frise non trouvée');
  // Keep reads sequential to preserve established query/response behaviour.
  const categories = (await listDetailedCategories(db, 'story', id)).map(mapCategory);
  const periods = groupCategories(await stories.listStoryPeriods(db, id), mapPeriodDetail);
  const events = groupCategories(await stories.listStoryEvents(db, id), mapEventDetail);
  const childStories = (await stories.listChildStories(db, id)).map(child => ({
    id: String(child.id), title: localized(child.title_fr, child.title_en), anchors: child.anchors ?? [],
  }));
  return {
    id: row.id, title: localized(row.title_fr, row.title_en), description: description(row.description_fr, row.description_en),
    author: row.author, isPublic: row.is_public, ownerUserId: row.owner_user_id,
    categories, periods, events, childStories, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
export function createStory(data: StoryWrite) {
  return withTransaction(async client => {
    const row = await stories.insertStory(client, data);
    await replaceEntityCategories(client, 'story', row.id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'story', row.id) };
  });
}
export async function updateStory(id: string, data: StoryWrite) {
  const row = await withTransaction(async client => {
    const row = await stories.updateStory(client, id, data);
    if (!row) return undefined;
    await replaceEntityCategories(client, 'story', id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'story', id) };
  });
  if (!row) throw new NotFoundError('Frise non trouvée');
  return row;
}
export async function deleteStory(id: string) {
  const row = await withTransaction(client => stories.deleteStory(client, id));
  if (!row) throw new NotFoundError('Frise non trouvée');
}
export function getSuggestions(storyId: string, periodIds: string[], eventIds: string[]) {
  return periodIds.length || eventIds.length ? stories.findSuggestedStories(db, storyId, periodIds, eventIds) : Promise.resolve([]);
}
export const listStoryPeriods = (id: string) => stories.listAssociatedPeriods(db, id);
export async function listStoryLinks(kind: AssociationKind) {
  return stories.listStoryLinks(db, kind);
}
export async function listStoryEvents(id: string) {
  // Conserver les champs de la liste historique et y joindre toutes les catégories.
  return groupCategories(await stories.listStoryEvents(db, id), row => ({
    id: row.id, wikidata_id: row.wikidata_id,
    label_fr: row.label_fr, label_en: row.label_en,
    description_fr: row.description_fr, description_en: row.description_en,
    date: row.date, date_years_bp: row.date_years_bp,
    created_at: row.created_at, updated_at: row.updated_at,
  }));
}
export const addAnchor = (id: string, kind: 'period' | 'event', anchor: string) => stories.insertAnchor(db, id, kind, anchor);
export const removeAnchor = (id: string, kind: 'period' | 'event', anchor: string) => stories.deleteAnchor(db, id, kind, anchor);
export const changeSingleAssociation = (id: string, kind: AssociationKind, entity: string, remove: boolean) => withTransaction(client => associations.changeSingleStoryAssociation(client, id, kind, entity, remove));
export const changeAssociations = (id: string, kind: AssociationKind, ids: string[], remove: boolean, parentId?: string | null) => withTransaction(client => associations.changeStoryAssociations(client, id, kind, ids, remove, parentId));
export const changeRootPeriod = (id: string, periodId: string) => withTransaction(client => associations.changeRootPeriod(client, id, periodId));
export const createFromPeriod = (sourceId: string, periodId: string, title: string) => withTransaction(client => associations.createStoryFromPeriod(client, sourceId, periodId, title));
export const linkChildren = (id: string, children: string[], anchor?: { anchorType: 'period' | 'event'; anchorId: string }) => withTransaction(client => associations.linkChildStories(client, id, children, anchor));
export const unlinkChild = (id: string, child: string) => withTransaction(client => associations.unlinkChildStory(client, id, child));
