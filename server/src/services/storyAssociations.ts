import type { TransactionClient } from '../api/transaction.js';
import { StoryAssociationError } from '../domain/errors.js';
import { checkAncestorChain } from '../domain/hierarchy.js';
import * as relations from '../repositories/storyRelationsRepository.js';
import { periodSubtree, itemsWithinPeriod } from '../domain/storySplit.js';
import { comparableYearsBeforePresent } from '../shared/temporal.js';
import { readEntityCategories, replaceEntityCategories } from '../repositories/categoryRepository.js';
import { creatorAuthor } from './storyAuthor.js';

async function requireWritableStory(client: TransactionClient, storyId: string) {
  if (!await relations.lockWritableStory(client, storyId)) throw new StoryAssociationError(404, 'Frise introuvable ou non modifiable.');
}
export async function changeRootPeriod(client: TransactionClient, storyId: string, periodId: string) {
  await relations.setRelationLockTimeout(client);
  await requireWritableStory(client, storyId);
  if ((await relations.lockAssociationTargets(client, 'period', [periodId])).length !== 1) {
    throw new StoryAssociationError(404, 'La période choisie est introuvable.');
  }
  await relations.replaceRootPeriod(client, storyId, periodId);
  return { storyId, periodId };
}
/** Caller supplies one transaction, scoped to its verified principal. */
export async function changeStoryAssociations(client: TransactionClient, storyId: string, kind: relations.AssociationKind, ids: string[], remove: boolean, parentId?: string | null) {
  await relations.setRelationLockTimeout(client);
  await requireWritableStory(client, storyId);
  if (remove) {
    await relations.removeAssociations(client, storyId, kind, ids);
  } else {
    const targets = [...new Set([...ids, ...(kind === 'period' && parentId ? [parentId] : [])])].sort();
    if (kind === 'period' && parentId && ids.includes(parentId)) throw new StoryAssociationError(409, 'Une période ne peut pas être son propre parent.');
    const entities = await relations.lockAssociationTargets(client, kind, targets);
    if (entities.length !== targets.length) throw new StoryAssociationError(404, 'Un des éléments à rattacher est introuvable.');
    if (kind === 'period' && parentId && !await relations.hasAssociation(client, storyId, 'period', parentId)) {
      throw new StoryAssociationError(409, 'La période parente doit appartenir à cette frise.');
    }
    await relations.insertAssociations(client, storyId, kind, ids);
    if (kind === 'period') {
      await completePeriodPlacements(client, storyId, ids, parentId);
    }
  }
  return { storyId, kind, ids, operation: remove ? 'remove' : 'add' };
}
async function completePeriodPlacements(client: TransactionClient, storyId: string, ids: string[], parentId?: string | null) {
  if (parentId !== undefined) await relations.setPeriodPlacements(client, storyId, ids, parentId);
  const rows = await relations.readPeriodPlacements(client, storyId);
  const parents = new Map(rows.map(row => [row.id, row.parent_id]));
  for (const id of ids) {
    if (checkAncestorChain(parents, id, new Set())) throw new StoryAssociationError(409, 'Ce placement créerait un cycle dans les périodes de la frise.');
  }
}
export async function changeSingleStoryAssociation(client: TransactionClient, storyId: string, kind: relations.AssociationKind, id: string, remove: boolean) {
  await changeStoryAssociations(client, storyId, kind, [id], remove);
  return { story_id: Number(storyId), [kind === 'period' ? 'period_id' : 'event_id']: id };
}
export async function linkChildStories(client: TransactionClient, parentId: string, childIds: string[], anchor?: { anchorType: 'period' | 'event'; anchorId: string }) {
  if (!childIds.every(id => /^[1-9]\d*$/.test(id))) throw new StoryAssociationError(400, 'Identifiant de frise enfant invalide.');
  await relations.lockStoryHierarchy(client);
  await requireWritableStory(client, parentId);
  const ancestors = await relations.readStoryAncestors(client, parentId);
  const chain = new Map(ancestors.map(row => [String(row.id), row.parent_story_id === null ? null : String(row.parent_story_id)]));
  const failure = checkAncestorChain(chain, parentId, new Set(childIds));
  if (failure === 'cycle') throw new StoryAssociationError(409, 'Ce rattachement créerait ou rejoindrait un cycle de frises.');
  if (failure === 'incomplete') throw new StoryAssociationError(409, 'La hiérarchie des frises est incomplète.');
  const moved = (await relations.readStoryParents(client, childIds))
    .filter(row => String(row.parent_story_id ?? '') !== parentId).map(row => String(row.id));
  const rows = await relations.setChildrenParent(client, parentId, childIds);
  if (rows.length !== childIds.length) throw new StoryAssociationError(404, 'Une frise enfant est introuvable ou non modifiable.');
  // A child moving from another parent (or none) loses anchors that pointed into that previous context.
  if (moved.length) await relations.deleteStoryAnchors(client, moved);
  if (anchor) {
    if (!await relations.hasAssociation(client, parentId, anchor.anchorType, anchor.anchorId)) throw new StoryAssociationError(409, 'La période ou l’événement n’appartient plus à cette frise.');
    for (const id of childIds) await relations.insertChildAnchor(client, id, anchor.anchorType, anchor.anchorId);
  }
  return rows;
}
export async function unlinkChildStory(client: TransactionClient, parentId: string, childId: string) {
  await relations.lockStoryHierarchy(client);
  await requireWritableStory(client, parentId);
  if (!await relations.lockChildStory(client, parentId, childId)) throw new StoryAssociationError(404, 'Liaison introuvable.');
  await relations.detachChildStory(client, parentId, childId);
}
/** Creates a child frise anchored on one period, with its sub-periods and the events in its time range. */
export async function createStoryFromPeriod(client: TransactionClient, sourceId: string, periodId: string, title: string) {
  await relations.setRelationLockTimeout(client);
  const source = await relations.lockSplitSource(client, sourceId);
  if (!source) throw new StoryAssociationError(404, 'Frise introuvable ou non modifiable.');
  const placements = await relations.readEffectivePeriodPlacements(client, sourceId);
  const subtree = periodSubtree(placements, periodId);
  if (!subtree) throw new StoryAssociationError(404, 'Cette période n’appartient plus à la frise.');
  const root = placements.find(row => row.id === periodId)!;
  // One reference instant: an event on the period's first day must compare equal, not a few ms older.
  const now = Date.now();
  const events = (await relations.readStoryEventDates(client, sourceId))
    .map(row => ({ id: row.id, yearsBP: comparableYearsBeforePresent(row.date, row.date_years_bp, now) }));
  const eventIds = itemsWithinPeriod(events,
    comparableYearsBeforePresent(root.start_date, root.start_years_bp, now), comparableYearsBeforePresent(root.end_date, root.end_years_bp, now));
  const story = await relations.insertDerivedStory(client, sourceId, title, await creatorAuthor(client, source.author), source.is_public);
  await relations.insertFrozenPlacements(client, story.id, subtree);
  if (eventIds.length) await relations.insertAssociations(client, String(story.id), 'event', eventIds);
  await relations.insertChildAnchor(client, String(story.id), 'period', periodId);
  await relations.changePresentation(client, sourceId, periodId, String(story.id), false);
  const categories = (await readEntityCategories(client, 'story', sourceId)).map(category => category.id);
  if (categories.length) await replaceEntityCategories(client, 'story', story.id, categories);
  return { id: String(story.id), parentStoryId: sourceId, periodId, periodCount: subtree.length, eventCount: eventIds.length };
}
