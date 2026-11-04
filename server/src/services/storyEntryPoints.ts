import type { TransactionClient } from '../api/transaction.js';
import { StoryAssociationError } from '../domain/errors.js';
import { hasAssociation, lockWritableStory, setRelationLockTimeout } from '../repositories/storyRelationsRepository.js';
import * as entries from '../repositories/storyEntryPointsRepository.js';

export async function changeEntryPoints(client: TransactionClient, sourceId: string, targetIds: string[], anchor: { anchorType: 'period' | 'event'; anchorId: string } | null | undefined, remove: boolean) {
  if (targetIds.includes(sourceId)) throw new StoryAssociationError(409, 'Une frise ne peut pas être son propre point d’entrée.');
  await setRelationLockTimeout(client);
  // Deterministic lock order also serializes concurrent writes to a legacy relation.
  for (const id of [...new Set([sourceId, ...targetIds])].sort((a, b) => Number(a) - Number(b))) {
    if (!await lockWritableStory(client, id)) throw new StoryAssociationError(404, 'Une des frises est introuvable ou non modifiable.');
  }
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
