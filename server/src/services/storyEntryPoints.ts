import type { TransactionClient } from '../api/transaction.js';
import { StoryAssociationError } from '../domain/errors.js';
import { hasAssociation, lockWritableStory, setRelationLockTimeout } from '../repositories/storyRelationsRepository.js';
import * as entries from '../repositories/storyEntryPointsRepository.js';
export type EntryLocation = entries.EntryLocation;

async function lockEntryStories(client: TransactionClient, sourceId: string, targetIds: string[]) {
  if (targetIds.includes(sourceId)) throw new StoryAssociationError(409, 'Une frise ne peut pas être son propre point d’entrée.');
  await setRelationLockTimeout(client);
  // Deterministic lock order also serializes concurrent writes to a legacy relation.
  for (const id of [...new Set([sourceId, ...targetIds])].sort((a, b) => Number(a) - Number(b))) {
    if (!await lockWritableStory(client, id)) throw new StoryAssociationError(404, 'Une des frises est introuvable ou non modifiable.');
  }
}

/** One transaction moves an occurrence without dropping other anchors or reparenting the frise. */
export async function moveEntryPoint(client: TransactionClient, sourceId: string, targetId: string, from: EntryLocation, to: EntryLocation) {
  await lockEntryStories(client, sourceId, [targetId]);
  if (to && !await hasAssociation(client, sourceId, to.anchorType, to.anchorId)) {
    throw new StoryAssociationError(409, 'La destination n’appartient pas à la frise source.');
  }
  const locations = await entries.listEntryLocations(client, sourceId, targetId);
  const origin = locations.filter(location => location.anchor_type === (from?.anchorType ?? null) && location.anchor_id === (from?.anchorId ?? null));
  if (!origin.length) throw new StoryAssociationError(409, 'Le rattachement d’origine a changé. Rechargez la frise.');
  if (from?.anchorType === to?.anchorType && from?.anchorId === to?.anchorId) return;
  if (to) await entries.addEntryPoint(client, sourceId, targetId, to.anchorType, to.anchorId);
  else await entries.changeRootEntryPoint(client, sourceId, targetId, false);
  if (origin.some(location => location.display_as_period)) await entries.setEntryDisplay(client, sourceId, targetId, to, true);
  await entries.removeMovedEntryLocation(client, sourceId, targetId, from, to, origin.some(location => location.legacy));
}

export async function changeEntryDisplay(client: TransactionClient, sourceId: string, targetId: string, location: EntryLocation, asPeriod: boolean) {
  await lockEntryStories(client,sourceId,[targetId]);
  const locations = await entries.listEntryLocations(client,sourceId,targetId);
  const matching = locations.some(row => row.anchor_type === (location?.anchorType ?? null) && row.anchor_id === (location?.anchorId ?? null));
  if (!matching) throw new StoryAssociationError(409,'Le rattachement a changé. Rechargez la frise.');
  if (location && !await hasAssociation(client,sourceId,location.anchorType,location.anchorId)) throw new StoryAssociationError(409,'Cette ancre n’appartient pas à la frise.');
  await entries.setEntryDisplay(client,sourceId,targetId,location,asPeriod);
}

export async function changeEntryPoints(client: TransactionClient, sourceId: string, targetIds: string[], anchor: EntryLocation | undefined, remove: boolean) {
  await lockEntryStories(client, sourceId, targetIds);
  if (!remove && (anchor === undefined || (anchor && !await hasAssociation(client, sourceId, anchor.anchorType, anchor.anchorId)))) {
    throw new StoryAssociationError(409, 'Choisissez une période ou un événement appartenant à la frise source.');
  }
  for (const targetId of targetIds) {
    if (anchor === null) await entries.changeRootEntryPoint(client, sourceId, targetId, remove);
    else if (!anchor) await entries.removeSource(client, sourceId, targetId);
    else if (remove) await entries.removeEntryPoint(client, sourceId, targetId, anchor.anchorType, anchor.anchorId);
    else await entries.addEntryPoint(client, sourceId, targetId, anchor.anchorType, anchor.anchorId);
  }
}
