import type { TransactionClient } from '../api/transaction.js';

export async function lockPeriodForDeletion(client: TransactionClient, id: string) {
  await client.query("SET LOCAL lock_timeout = '5s'");
  // New memberships take a FK key lock; serialize them with deletion.
  return (await client.query<{ id: string }>(
    'SELECT id FROM public.periods WHERE id = $1 FOR UPDATE', [id],
  )).rows[0];
}
export async function readPeriodDependencies(client: TransactionClient, id: string) {
  return (await client.query<{ children: number; stories: number }>(`
    SELECT 0 AS children,
      (SELECT count(*)::int FROM public.story_periods WHERE period_id = $1) AS stories
  `, [id])).rows[0];
}
export async function deletePeriod(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.period_categories WHERE period_id = $1', [id]);
  await client.query('DELETE FROM public.periods WHERE id = $1', [id]);
}
