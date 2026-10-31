import type { TransactionClient } from '../api/transaction.js';
import { PeriodHierarchyError } from '../domain/errors.js';
import { checkAncestorChain } from '../domain/hierarchy.js';
import { readEntityCategories } from './entityCategories.js';
import * as hierarchy from '../repositories/periodHierarchyRepository.js';

/** Caller owns the transaction. No network calls while holding hierarchy locks. */
export async function changePeriodParent(client: TransactionClient, id: string, parentId: string | null) {
  if (id === parentId) throw new PeriodHierarchyError(409, 'Une période ne peut pas être son propre parent.');
  await hierarchy.lockPeriodHierarchy(client);
  if (!await hierarchy.findPeriodIdentity(client, id)) throw new PeriodHierarchyError(404, 'Période non trouvée');
  if (parentId !== null) {
    const ancestors = await hierarchy.readPeriodAncestors(client, parentId);
    if (!ancestors.length) throw new PeriodHierarchyError(404, 'Période parente non trouvée');
    const failure = checkAncestorChain(new Map(ancestors.map(row => [row.id, row.parent_id])), parentId, new Set([id]));
    if (failure === 'cycle') throw new PeriodHierarchyError(409, 'Ce déplacement créerait ou rejoindrait un cycle dans la hiérarchie.');
    if (failure === 'incomplete') throw new PeriodHierarchyError(409, 'La hiérarchie parente est incomplète.');
  }
  const period = await hierarchy.updatePeriodParent(client, id, parentId);
  return { ...period, categories: await readEntityCategories(client, 'period', id) };
}
