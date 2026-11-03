import { withTransaction } from '../api/database.js';
import { AdminError } from '../domain/errors.js';
import * as admin from '../repositories/adminRepository.js';
import type { TransactionClient } from '../api/transaction.js';

// Rule violations raised by admin_private, translated without exposing database messages.
const RULES: Record<string, [403 | 404 | 409, string]> = {
  '42501': [403, 'Accès réservé à l’administrateur.'],
  P0002: [404, 'Ce compte n’existe plus.'],
  UTA01: [409, 'Cette action n’est pas possible sur votre propre compte.'],
  UTA02: [409, 'Retirez d’abord le rôle administrateur de ce compte.'],
  UTA03: [409, 'Ce compte n’a pas encore confirmé son adresse e-mail.'],
  UTA04: [409, 'Réactivez d’abord ce compte suspendu.'],
};

async function run<T>(operation: (client: TransactionClient) => Promise<T>): Promise<T> {
  try { return await withTransaction(operation); }
  catch (error) {
    const code = (error as { code?: unknown })?.code;
    const rule = typeof code === 'string' ? RULES[code] : undefined;
    throw rule ? new AdminError(rule[0], rule[1]) : error;
  }
}

export const dashboard = () => run(client => admin.dashboard(client));
export const relations = () => run(client => admin.relations(client));
export const relationNetwork = () => run(client => admin.relationNetwork(client));
// P0002 from these read-only functions refers to a missing frise/catalogue fiche, not an account.
async function readRelation(operation: (client: TransactionClient) => Promise<Record<string, unknown>>) {
  try { return await withTransaction(operation); }
  catch (error) {
    if ((error as { code?: string })?.code === 'P0002') throw new AdminError(404, 'Cet élément n’existe plus. Actualisez la carte.');
    throw error;
  }
}
export const relationStory = (id: string) => readRelation(client => admin.relationStory(client, id));
export const relationEntity = (kind: string, id: string) => readRelation(client => admin.relationEntity(client, kind, id));
export const relationCatalogue = (kind: string, usage: string, q: string, offset: number) => run(client => admin.relationCatalogue(client, kind, usage, q, offset));
export const listUsers = () => run(client => admin.listUsers(client));
export const userDetail = (id: string) => run(client => admin.userDetail(client, id));
export const setAdmin = (id: string, enabled: boolean) => run(client => admin.setAdmin(client, id, enabled));
export const setEditor = (id: string, enabled: boolean) => run(client => admin.setEditor(client, id, enabled));
export const setSuspended = (id: string, suspended: boolean) => run(client => admin.setSuspended(client, id, suspended));
export const deleteUser = (id: string) => run(client => admin.deleteUser(client, id));
