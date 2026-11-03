import type { TransactionClient } from '../api/transaction.js';

export type CatalogueKind = 'period' | 'event';
const table = (kind: CatalogueKind) => kind === 'period' ? 'periods' : 'events';

export async function lockEntity(client: TransactionClient, kind: CatalogueKind, id: string) {
  await client.query("SET LOCAL lock_timeout = '5s'");
  // New memberships take a FK key lock on the record: they wait for the conversion, then fail on the deleted row.
  return (await client.query<{ id: string }>(`SELECT id FROM public.${table(kind)} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
}

/** Uses invisible to RLS: frises of other owners and chronological views of a period. */
export async function readBlockers(client: TransactionClient, kind: CatalogueKind, id: string) {
  return (await client.query<{ result: { foreign_stories: number; presentations: number } }>(
    'SELECT catalogue_private.conversion_blockers($1, $2) AS result', [kind, id],
  )).rows[0].result;
}

export async function countStoriesWithSubPeriods(client: TransactionClient, periodId: string) {
  return (await client.query<{ n: number }>(
    'SELECT count(DISTINCT story_id)::int AS n FROM public.story_periods WHERE parent_period_id = $1', [periodId],
  )).rows[0].n;
}

/** Each frise keeps the converted record; a former event becomes a root period, a former period a neutral event. */
export async function transferMemberships(client: TransactionClient, from: CatalogueKind, oldId: string, newId: string) {
  if (from === 'period') {
    await client.query(`INSERT INTO public.story_events (story_id, event_id)
      SELECT story_id, $2 FROM public.story_periods WHERE period_id = $1`, [oldId, newId]);
  } else {
    await client.query(`INSERT INTO public.story_periods (story_id, period_id)
      SELECT story_id, $2 FROM public.story_events WHERE event_id = $1`, [oldId, newId]);
  }
  const [oldColumn, newColumn] = from === 'period' ? ['period_id', 'event_id'] : ['event_id', 'period_id'];
  await client.query(`INSERT INTO public.story_entry_points (source_story_id, target_story_id, ${newColumn})
    SELECT source_story_id, target_story_id, $2 FROM public.story_entry_points WHERE ${oldColumn} = $1
    ON CONFLICT DO NOTHING`, [oldId, newId]);
  await client.query(`UPDATE public.story_anchors SET anchor_type = $3, anchor_id = $2
    WHERE anchor_type = $4 AND anchor_id = $1`, [oldId, newId, from === 'period' ? 'event' : 'period', from]);
}

export async function countMemberships(client: TransactionClient, kind: CatalogueKind, id: string) {
  const sql = kind === 'period'
    ? 'SELECT count(*)::int AS n FROM public.story_periods WHERE period_id = $1'
    : 'SELECT count(*)::int AS n FROM public.story_events WHERE event_id = $1';
  return (await client.query<{ n: number }>(sql, [id])).rows[0].n;
}
