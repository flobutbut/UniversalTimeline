import * as legacyAssociations from '../repositories/storyRepository.js';
import type { TransactionClient } from '../api/transaction.js';
import { StoryAssociationError } from '../domain/errors.js';
import { checkAncestorChain } from '../domain/hierarchy.js';
import * as relations from '../repositories/storyRelationsRepository.js';

async function requireWritableStory(client: TransactionClient, storyId: string) {
  if (!await relations.lockWritableStory(client, storyId)) throw new StoryAssociationError(404, 'Frise introuvable ou non modifiable.');
}
export async function changeRootPeriod(client: TransactionClient, storyId: string, periodId: string) {
  await relations.setRelationLockTimeout(client);
  await requireWritableStory(client, storyId);
  await relations.lockCatalogueHierarchyForRead(client);
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
    if (kind === 'period') await relations.lockCatalogueHierarchyForRead(client);
    const targets = [...new Set([...ids, ...(kind === 'period' && parentId ? [parentId] : [])])].sort();
    if (kind === 'period' && parentId && ids.includes(parentId)) throw new StoryAssociationError(409, 'Une période ne peut pas être son propre parent.');
    const entities = await relations.lockAssociationTargets(client, kind, targets);
    if (entities.length !== targets.length) throw new StoryAssociationError(404, 'Un des éléments à rattacher est introuvable.');
    await relations.insertAssociations(client, storyId, kind, ids);
    if (kind === 'period') {
      await completePeriodPlacements(client, storyId, ids, parentId);
    }
  }
  return { storyId, kind, ids, operation: remove ? 'remove' : 'add' };
}
async function completePeriodPlacements(client: TransactionClient, storyId: string, ids: string[], parentId?: string | null) {
  await relations.freezePeriodPlacements(client, storyId);
  if (parentId !== undefined) await relations.setPeriodPlacements(client, storyId, ids, parentId);
  const rows = await relations.readPeriodPlacements(client, storyId);
  const present = new Set(rows.map(row => row.id));
  const parents = new Map(rows.map(row => [row.id, row.parent_id && present.has(row.parent_id) ? row.parent_id : null]));
  for (const id of ids) {
    if (checkAncestorChain(parents, id, new Set())) throw new StoryAssociationError(409, 'Ce placement créerait un cycle dans les périodes de la frise.');
  }
}
export async function changeSingleStoryAssociation(client: TransactionClient, storyId: string, kind: relations.AssociationKind, id: string, remove: boolean) {
  await relations.setRelationLockTimeout(client);
  await requireWritableStory(client, storyId);
  if (kind === 'period' && !remove) await relations.lockCatalogueHierarchyForRead(client);
  const result = await legacyAssociations.changeSingleAssociation(client, storyId, kind, id, remove);
  if (kind === 'period' && !remove) await completePeriodPlacements(client, storyId, [id]);
  return result;
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
  const rows = await relations.setChildrenParent(client, parentId, childIds);
  if (rows.length !== childIds.length) throw new StoryAssociationError(404, 'Une frise enfant est introuvable ou non modifiable.');
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
