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
export const listUsers = () => run(client => admin.listUsers(client));
export const userDetail = (id: string) => run(client => admin.userDetail(client, id));
export const setAdmin = (id: string, enabled: boolean) => run(client => admin.setAdmin(client, id, enabled));
export const setSuspended = (id: string, suspended: boolean) => run(client => admin.setSuspended(client, id, suspended));
export const deleteUser = (id: string) => run(client => admin.deleteUser(client, id));
