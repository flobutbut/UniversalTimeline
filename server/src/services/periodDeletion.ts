import type { TransactionClient } from '../api/transaction.js';
import { PeriodDeletionError } from '../domain/errors.js';
import * as periods from '../repositories/periodHierarchyRepository.js';

/** Delete only an unused catalogue record, inside a transaction before taking other locks. */
export async function deleteUnusedPeriod(client: TransactionClient, id: string) {
  const period = await periods.lockPeriodForDeletion(client, id);
  if (!period) throw new PeriodDeletionError(404, 'Période non trouvée');
  const { children, stories } = await periods.readPeriodDependencies(client, id);
  if (children || stories) {
    const reasons = [];
    if (children) reasons.push(`${children} sous-période(s)`);
    if (stories) reasons.push(`${stories} lien(s) vers une frise`);
    throw new PeriodDeletionError(409, `Suppression impossible : cette période possède ${reasons.join(' et ')}. Retirez ces liens avant de la supprimer.`);
  }
  await periods.deletePeriod(client, id);
  return { id, parent: null };
}
