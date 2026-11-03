import { readEntityCategories } from './entityCategories.js';
import { query, withTransaction } from '../api/database.js';
import { NotFoundError, StoryAssociationError } from '../domain/errors.js';
import type { EventImportance, StoryWrite } from '../domain/writeInputs.js';
import * as stories from '../repositories/storyRepository.js';
import { replaceEntityCategories } from '../repositories/categoryRepository.js';
import { description, localized, groupCategories, mapCategory, mapPeriodDetail, mapEventDetail } from './mappers.js';
import { aggregateStoryTemporalBounds } from '../domain/storyTemporalBounds.js';
import * as associations from './storyAssociations.js';
import type { AssociationKind } from '../repositories/storyRelationsRepository.js';
import { changeEntryPoints } from './storyEntryPoints.js';
import { changePresentation, lockWritableStory, setRelationLockTimeout } from '../repositories/storyRelationsRepository.js';
import { creatorAuthor, editorAuthor } from './storyAuthor.js';
import { principalContext } from '../auth/context.js';

const db = { query };
export async function listStories() {
  const rows = await stories.listStories(db);
  const candidates = [...new Map(rows.map(row => [String(row.id), row])).values()].flatMap(row => [
    ...(row.preview_periods ?? []).map(period => ({ ...period, story_id: row.id })),
    ...(row.preview_events ?? []).map(event => ({ story_id: row.id, start_date: event.date, end_date: event.date, start_years_bp: event.date_years_bp, end_years_bp: event.date_years_bp })),
  ]);
  const bounds = new Map(aggregateStoryTemporalBounds(candidates).map(bound => [String(bound.story_id), bound]));
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
  const row = await stories.findStorySnapshot(db, id);
  if (!row) throw new NotFoundError('Frise non trouvée');
  const categories = row.categories.map(mapCategory);
  const periods = groupCategories(row.periods, period => ({ ...mapPeriodDetail(period), hasChildren: period.has_children }));
  const events = groupCategories(row.events, event => ({ ...mapEventDetail(event), wikidata_id: event.wikidata_id, dateYearsBP: event.date_years_bp == null ? null : Number(event.date_years_bp), importance: event.importance }));
  const childStories = row.child_stories.map(child => ({
    id: String(child.id), title: localized(child.title_fr, child.title_en), anchors: child.anchors ?? [],
  }));
  return {
    id: row.id, title: localized(row.title_fr, row.title_en), description: description(row.description_fr, row.description_en),
    author: row.author, isPublic: row.is_public, ownerUserId: row.owner_user_id, created_at: row.created_at,
    parent_story_id: row.parent_story_id ?? null,
    categories, periods, events, childStories,
    navigationContexts: (row.navigation_contexts ?? []).map(context => ({
      id: String(context.id), title: localized(context.title_fr, context.title_en), periods: context.periods,
      presentations: context.presentations.map(view => ({ periodId: view.period_id, storyId: String(view.story_id), title: localized(view.title_fr, view.title_en) })),
    })),
    parentStories: (row.parent_stories ?? []).map(parent => ({
      id: String(parent.id), title: localized(parent.title_fr, parent.title_en), ownerUserId: parent.owner_user_id, isPublic: parent.is_public,
      anchors: parent.anchors.map(anchor => ({ type: anchor.type, id: anchor.id, label: localized(anchor.label_fr, anchor.label_en) })),
    })),
    relatedStories: row.related_stories.map(related => ({
      id: String(related.id), title: localized(related.title_fr, related.title_en),
      periodIds: related.period_ids, eventIds: related.event_ids,
    })),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
export function createStory(data: StoryWrite) {
  return withTransaction(async client => {
    const row = await stories.insertStory(client, { ...data, author: await creatorAuthor(client, data.author) });
    await replaceEntityCategories(client, 'story', row.id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'story', row.id) };
  });
}
export async function updateStory(id: string, data: StoryWrite) {
  const row = await withTransaction(async client => {
    const row = await stories.updateStory(client, id, { ...data, author: editorAuthor(data.author) });
    if (!row) return undefined;
    await replaceEntityCategories(client, 'story', id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'story', id) };
  });
  if (!row) throw new NotFoundError('Frise non trouvée');
  return row;
}
export async function deleteStory(id: string) {
  const row = await withTransaction(async client => {
    const userId = principalContext.getStore()?.userId;
    // Check ownership before deleting associations: an editor may edit these, but cannot delete the frise.
    if (userId && !await stories.lockOwnedStory(client, id, userId)) return undefined;
    return stories.deleteStory(client, id);
  });
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
export const changeEventImportance = (storyId: string, eventId: string, importance: EventImportance) => withTransaction(async client => {
  await setRelationLockTimeout(client);
  if (!await lockWritableStory(client, storyId)) throw new StoryAssociationError(404, 'Frise introuvable ou non modifiable.');
  const updated = await stories.updateEventImportance(client, storyId, eventId, importance);
  if (!updated) throw new StoryAssociationError(404, 'Cet événement n’appartient pas à la frise.');
  return { storyId, eventId, importance: updated.importance };
});
export const changeEntries = (sourceId: string, ids: string[], anchor: { anchorType: 'period' | 'event'; anchorId: string } | undefined, remove: boolean) => withTransaction(client => changeEntryPoints(client, sourceId, ids, anchor, remove));

export const changePeriodPresentation = (contextId: string, periodId: string, targetId: string, remove: boolean) => withTransaction(async client => {
  if (!remove) await associations.changeStoryAssociations(client, contextId, 'period', [periodId], false);
  await changePresentation(client, contextId, periodId, targetId, remove);
});
