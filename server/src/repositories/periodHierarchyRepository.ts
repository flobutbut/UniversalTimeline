import type { TransactionClient } from '../api/transaction.js';
import type { PeriodRow } from './rows.js';

/** Acquire before any INSERT/UPDATE that also changes hierarchy: no lock upgrades. */
export async function lockPeriodHierarchy(client: TransactionClient) {
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query('LOCK TABLE public.periods IN SHARE ROW EXCLUSIVE MODE');
}
export async function findPeriodIdentity(client: TransactionClient, id: string) {
  return (await client.query<{ id: string }>('SELECT id FROM public.periods WHERE id = $1', [id])).rows[0];
}
export async function readPeriodAncestors(client: TransactionClient, id: string) {
  // UNION terminates even if imported data already contains a cycle.
  return (await client.query<{ id: string; parent_id: string | null }>(`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM public.periods WHERE id = $1
      UNION
      SELECT p.id, p.parent_id FROM public.periods p JOIN ancestors a ON p.id = a.parent_id
    ) SELECT id, parent_id FROM ancestors
  `, [id])).rows;
}
export async function updatePeriodParent(client: TransactionClient, id: string, parentId: string | null) {
  return (await client.query<PeriodRow>(`
    UPDATE public.periods AS target
    SET parent_id = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING target.*, EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = target.id) AS has_children
  `, [parentId, id])).rows[0];
}
export async function lockPeriodForDeletion(client: TransactionClient, id: string) {
  // Blocks new FK references from story_periods until commit/rollback.
  return (await client.query<{ id: string; parent_id: string | null }>(
    'SELECT id, parent_id FROM public.periods WHERE id = $1 FOR UPDATE', [id],
  )).rows[0];
}
export async function readPeriodDependencies(client: TransactionClient, id: string) {
  return (await client.query<{ children: number; stories: number }>(`
    SELECT
      (SELECT count(*)::int FROM public.periods WHERE parent_id = $1) AS children,
      (SELECT count(*)::int FROM public.story_periods WHERE period_id = $1 OR to_jsonb(story_periods)->>'parent_period_id' = $1) AS stories
  `, [id])).rows[0];
}
export async function deletePeriod(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.period_categories WHERE period_id = $1', [id]);
  await client.query('DELETE FROM public.periods WHERE id = $1', [id]);
}
export async function hasPeriodChildren(client: TransactionClient, id: string) {
  return (await client.query<{ has_children: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM public.periods WHERE parent_id = $1) AS has_children', [id],
  )).rows[0].has_children;
}
