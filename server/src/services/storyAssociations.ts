import type { TransactionClient } from '../api/transaction.js';
import { principalContext } from '../auth/context.js';
import { StoryAssociationError } from '../domain/errors.js';
import { checkAncestorChain } from '../domain/hierarchy.js';
import * as relations from '../repositories/storyRelationsRepository.js';
import { periodSubtree, itemsWithinPeriod } from '../domain/storySplit.js';
import { comparableYearsBeforePresent } from '../shared/temporal.js';
import { readEntityCategories, replaceEntityCategories } from '../repositories/categoryRepository.js';
import { readEntityTags, replaceEntityTags } from '../repositories/tagRepository.js';
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
/** Creates a child frise anchored on one period. Its sub-periods move there with the links that target them;
 * the period stays in the source as the anchor, and the events in its time range are copied. */
export async function createStoryFromPeriod(client: TransactionClient, sourceId: string, periodId: string, title: string) {
  await relations.lockStoryHierarchy(client);
  const userId = principalContext.getStore()?.userId;
  const source = await relations.lockSplitSource(client, sourceId, userId);
  if (!source) throw new StoryAssociationError(404, 'Frise introuvable ou non modifiable.');
  const placements = await relations.readEffectivePeriodPlacements(client, sourceId);
  const subtree = periodSubtree(placements, periodId);
  if (!subtree) throw new StoryAssociationError(404, 'Cette période n’appartient plus à la frise.');
  const moved = subtree.slice(1).map(row => row.id);
  const linked = moved.length ? await relations.readMovedPeriodLinks(client, sourceId, moved) : [];
  // RLS lets only the owner of both ends rewrite a link: refuse rather than let a cascade drop it.
  if (userId && linked.some(row => row.owner_user_id !== userId)) {
    throw new StoryAssociationError(409, 'Une frise liée à ces sous-périodes appartient à un autre compte : la création est refusée.');
  }
  const root = placements.find(row => row.id === periodId)!;
  // One reference instant: an event on the period's first day must compare equal, not a few ms older.
  const now = Date.now();
  const events = (await relations.readStoryEventDates(client, sourceId))
    .map(row => ({ id: row.id, yearsBP: comparableYearsBeforePresent(row.date, row.date_years_bp, now) }));
  const eventIds = itemsWithinPeriod(events,
    comparableYearsBeforePresent(root.start_date, root.start_years_bp, now), comparableYearsBeforePresent(root.end_date, root.end_years_bp, now));
  const story = await relations.insertDerivedStory(client, sourceId, title, await creatorAuthor(client, source.author), source.is_public);
  const storyId = String(story.id);
  const narrative = subtree.slice(1).map(p => ({ ...p, parent_id: p.parent_id === periodId ? null : p.parent_id }));
  if (narrative.length) await relations.insertFrozenPlacements(client, story.id, narrative);
  if (eventIds.length) await relations.insertAssociations(client, storyId, 'event', eventIds);
  await relations.insertChildAnchor(client, storyId, 'period', periodId);
  await relations.changePresentation(client, sourceId, periodId, storyId, false);
  if (moved.length) {
    await relations.transferMovedPeriodLinks(client, sourceId, storyId, moved, linked.filter(row => row.child).map(row => String(row.id)));
    await relations.deletePeriodMemberships(client, sourceId, moved);
  }
  const categories = (await readEntityCategories(client, 'story', sourceId)).map(category => category.id);
  if (categories.length) await replaceEntityCategories(client, 'story', story.id, categories);
  const tags = (await readEntityTags(client, 'story', sourceId)).map(tag => tag.id);
  if (tags.length) await replaceEntityTags(client, 'story', story.id, tags);
  return { id: storyId, parentStoryId: sourceId, periodId, periodCount: narrative.length, eventCount: eventIds.length, movedPeriodCount: moved.length, linkedStoryCount: linked.length };
}
