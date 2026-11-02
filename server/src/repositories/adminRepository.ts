import type { TransactionClient } from '../api/transaction.js';

// Every routine checks the admin claim and the stored role itself (admin_private, SECURITY DEFINER).
const read = async <T>(client: TransactionClient, sql: string, params: unknown[] = []) =>
  (await client.query<{ result: T }>(sql, params)).rows[0].result;

export const dashboard = (client: TransactionClient) => read<Record<string, unknown>>(client, 'SELECT admin_private.dashboard() AS result');
export const listUsers = (client: TransactionClient) => read<Record<string, unknown>[]>(client, 'SELECT admin_private.list_users() AS result');
export const userDetail = (client: TransactionClient, id: string) => read<Record<string, unknown>>(client, 'SELECT admin_private.user_detail($1) AS result', [id]);

export async function setAdmin(client: TransactionClient, id: string, enabled: boolean) {
  await client.query('SELECT admin_private.set_admin($1, $2)', [id, enabled]);
}
export async function setSuspended(client: TransactionClient, id: string, suspended: boolean) {
  await client.query('SELECT admin_private.set_suspended($1, $2)', [id, suspended]);
}
export async function deleteUser(client: TransactionClient, id: string) {
  await client.query('SELECT admin_private.delete_user($1)', [id]);
}
