import type { TransactionClient } from '../api/transaction.js';
const relations = {
  period: { entity: 'periods', table: 'story_periods', column: 'period_id' },
  event: { entity: 'events', table: 'story_events', column: 'event_id' },
} as const;
export type AssociationKind = keyof typeof relations;
export async function setRelationLockTimeout(client: TransactionClient) {
  await client.query("SET LOCAL lock_timeout = '5s'");
}
export async function lockStoryHierarchy(client: TransactionClient) {
  await setRelationLockTimeout(client);
  await client.query('LOCK TABLE public.stories IN SHARE ROW EXCLUSIVE MODE');
}
export async function lockWritableStory(client: TransactionClient, storyId: string) {
  // FOR UPDATE applies UPDATE and SELECT policies: ownership or the public-editor permission is required.
  return (await client.query<{ id: number }>('SELECT id FROM public.stories WHERE id = $1 FOR UPDATE', [storyId])).rows[0];
}
export async function removeAssociations(client: TransactionClient, storyId: string, kind: AssociationKind, ids: string[]) {
  const relation = relations[kind];
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  if (kind === 'period') {
    // Children stay in this frise and become roots when their parent is removed.
    await client.query(`UPDATE public.story_periods SET parent_period_id = NULL
      WHERE story_id = $1 AND parent_period_id = ANY($2::varchar[])`, [storyId, ids]);
  }
  await client.query(`DELETE FROM public.story_anchors a USING public.stories child
    WHERE a.story_id = child.id AND child.parent_story_id = $1 AND a.anchor_type = $2
      AND a.anchor_id = ANY($3::varchar[])`, [storyId, kind, ids]);
  await client.query(`DELETE FROM public.${relation.table} WHERE story_id = $1 AND ${relation.column} IN (${placeholders})`, [storyId, ...ids]);
}
export async function lockAssociationTargets(client: TransactionClient, kind: AssociationKind, ids: string[]) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  return (await client.query<{ id: string }>(`SELECT id FROM public.${relations[kind].entity} WHERE id IN (${placeholders}) ORDER BY id FOR KEY SHARE`, ids)).rows;
}
export async function insertAssociations(client: TransactionClient, storyId: string, kind: AssociationKind, ids: string[]) {
  const relation = relations[kind];
  const values = ids.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(`INSERT INTO public.${relation.table} (story_id, ${relation.column}) VALUES ${values} ON CONFLICT (story_id, ${relation.column}) DO NOTHING`, [storyId, ...ids]);
}
export async function setPeriodPlacements(client: TransactionClient, storyId: string, ids: string[], parentId: string | null) {
  await client.query(`UPDATE public.story_periods SET parent_period_id = $3
    WHERE story_id = $1 AND period_id = ANY($2::varchar[])`, [storyId, ids, parentId]);
}
export async function readPeriodPlacements(client: TransactionClient, storyId: string) {
  return (await client.query<{ id: string; parent_id: string | null }>(`
    SELECT period_id AS id, parent_period_id AS parent_id FROM public.story_periods WHERE story_id = $1`, [storyId])).rows;
}
/** Keep the branch under the chosen root in this frise; never reparent catalogue records. */
export async function replaceRootPeriod(client: TransactionClient, storyId: string, periodId: string) {
  await insertAssociations(client, storyId, 'period', [periodId]);
  await setPeriodPlacements(client, storyId, [periodId], null);
  await client.query(`
    WITH RECURSIVE retained(id) AS (
      SELECT $2::varchar
      UNION
      SELECT sp.period_id FROM public.story_periods sp JOIN retained r ON sp.parent_period_id = r.id
      WHERE sp.story_id = $1
    )
    DELETE FROM public.story_periods
    WHERE story_id = $1 AND period_id NOT IN (SELECT id FROM retained)
  `, [storyId, periodId]);
  await client.query(`
    DELETE FROM public.story_anchors a USING public.stories child
    WHERE a.story_id = child.id AND child.parent_story_id = $1 AND a.anchor_type = 'period'
      AND NOT EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id = $1 AND sp.period_id = a.anchor_id)
  `, [storyId]);
}
export async function readStoryAncestors(client: TransactionClient, parentId: string) {
  return (await client.query<{ id: number; parent_story_id: number | null }>(`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_story_id FROM public.stories WHERE id = $1
      UNION
      SELECT s.id, s.parent_story_id FROM public.stories s JOIN ancestors a ON s.id = a.parent_story_id
    ) SELECT id, parent_story_id FROM ancestors`, [parentId])).rows;
}
export async function hasAssociation(client: TransactionClient, storyId: string, kind: AssociationKind, id: string) {
  const relation = relations[kind];
  return (await client.query(`SELECT 1 FROM public.${relation.table} WHERE story_id = $1 AND ${relation.column} = $2`, [storyId, id])).rows.length > 0;
}
export async function insertChildAnchor(client: TransactionClient, storyId: string, kind: AssociationKind, id: string) {
  await client.query('INSERT INTO public.story_anchors (story_id, anchor_type, anchor_id) VALUES ($1, $2, $3) ON CONFLICT (story_id, anchor_type, anchor_id) DO NOTHING', [storyId, kind, id]);
}
/** Current parents of the children, read before a reattachment. */
export async function readStoryParents(client: TransactionClient, childIds: string[]) {
  const placeholders = childIds.map((_, i) => `$${i + 1}`).join(', ');
  return (await client.query<{ id: number; parent_story_id: number | null }>(`SELECT id, parent_story_id FROM public.stories WHERE id IN (${placeholders})`, childIds)).rows;
}
/** Anchors designate a place in the parent frise: they are meaningless under another parent. */
export async function deleteStoryAnchors(client: TransactionClient, storyIds: string[]) {
  const placeholders = storyIds.map((_, i) => `$${i + 1}`).join(', ');
  await client.query(`DELETE FROM public.story_anchors WHERE story_id IN (${placeholders})`, storyIds);
}
export async function setChildrenParent(client: TransactionClient, parentId: string, childIds: string[]) {
  const placeholders = childIds.map((_, i) => `$${i + 2}`).join(', ');
  return (await client.query<{ id: number; parent_story_id: number }>(`UPDATE public.stories SET parent_story_id = $1 WHERE id IN (${placeholders}) RETURNING id, parent_story_id`, [parentId, ...childIds])).rows;
}
export async function lockChildStory(client: TransactionClient, parentId: string, childId: string) {
  return (await client.query<{ id: number }>('SELECT id FROM public.stories WHERE id = $1 AND parent_story_id = $2 FOR UPDATE', [childId, parentId])).rows[0];
}
export async function detachChildStory(client: TransactionClient, parentId: string, childId: string) {
  await client.query('DELETE FROM public.story_anchors WHERE story_id = $1', [childId]);
  await client.query('UPDATE public.stories SET parent_story_id = NULL WHERE id = $1 AND parent_story_id = $2', [childId, parentId]);
}
/** Source of a derived frise: only its owner may read it FOR UPDATE (RLS). */
export async function lockSplitSource(client: TransactionClient, storyId: string, userId?: string | null) {
  return (await client.query<{ id: number; author: string; is_public: boolean }>(
    `SELECT id, author, is_public FROM public.stories WHERE id = $1${userId ? ' AND owner_user_id = $2' : ''} FOR UPDATE`, userId ? [storyId, userId] : [storyId])).rows[0];
}
/** The frise is the only authority for period placement. */
export async function readEffectivePeriodPlacements(client: TransactionClient, storyId: string) {
  return (await client.query<{ id: string; parent_id: string | null; start_date: string | null; end_date: string | null; start_years_bp: string | null; end_years_bp: string | null }>(`
    SELECT sp.period_id AS id,
           sp.parent_period_id AS parent_id,
           p.start_date, p.end_date, p.start_years_bp, p.end_years_bp
    FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
    WHERE sp.story_id = $1`, [storyId])).rows;
}
export async function readStoryEventDates(client: TransactionClient, storyId: string) {
  return (await client.query<{ id: string; date: string | null; date_years_bp: string | null }>(`
    SELECT e.id, e.date, e.date_years_bp
    FROM public.story_events se JOIN public.events e ON e.id = se.event_id
    WHERE se.story_id = $1`, [storyId])).rows;
}
export async function insertDerivedStory(client: TransactionClient, parentId: string, title: string, author: string, isPublic: boolean) {
  return (await client.query<{ id: number }>(`
    INSERT INTO public.stories (title_fr, title_en, author, is_public, parent_story_id)
    VALUES ($1, $1, $2, $3, $4) RETURNING id`, [title, author, isPublic, parentId])).rows[0];
}
/** Copy a branch with its placements into a new frise. */
export async function insertFrozenPlacements(client: TransactionClient, storyId: number, placements: { id: string; parent_id: string | null }[]) {
  const values = placements.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ');
  await client.query(`INSERT INTO public.story_periods (story_id, period_id, parent_period_id) VALUES ${values}`,
    [storyId, ...placements.flatMap(row => [row.id, row.parent_id])]);
}

/** Frises linked to periods leaving the source: children anchored on them, entry targets, presentation ends. */
export async function readMovedPeriodLinks(client: TransactionClient, sourceId: string, periodIds: string[]) {
  return (await client.query<{ id: number; owner_user_id: string | null; child: boolean }>(`
    WITH linked AS (
      SELECT child.id, true AS child FROM public.stories child JOIN public.story_anchors a ON a.story_id = child.id
      WHERE child.parent_story_id = $1 AND a.anchor_type = 'period' AND a.anchor_id = ANY($2::varchar[])
      UNION SELECT target_story_id, false FROM public.story_entry_points WHERE source_story_id = $1 AND period_id = ANY($2::varchar[])
      UNION SELECT target_story_id, false FROM public.story_period_presentations WHERE context_story_id = $1 AND period_id = ANY($2::varchar[])
    )
    SELECT s.id, s.owner_user_id, bool_or(linked.child) AS child FROM linked JOIN public.stories s ON s.id = linked.id
    GROUP BY s.id, s.owner_user_id ORDER BY s.id`, [sourceId, periodIds])).rows;
}
/** Links on moved periods follow them into the derived frise, before the source memberships are removed. */
export async function transferMovedPeriodLinks(client: TransactionClient, sourceId: string, targetId: string, periodIds: string[], childIds: string[]) {
  if (childIds.length) {
    await client.query('UPDATE public.stories SET parent_story_id = $1 WHERE id = ANY($2::int[]) AND parent_story_id = $3', [targetId, childIds, sourceId]);
    // Anchors absent from the new parent keep their access from the source as entry points.
    await client.query(`
      WITH stale AS (
        DELETE FROM public.story_anchors a WHERE a.story_id = ANY($3::int[]) AND NOT EXISTS (
          SELECT 1 FROM public.story_periods sp WHERE a.anchor_type = 'period' AND sp.story_id = $2 AND sp.period_id = a.anchor_id
          UNION ALL SELECT 1 FROM public.story_events se WHERE a.anchor_type = 'event' AND se.story_id = $2 AND se.event_id = a.anchor_id)
        RETURNING a.story_id, a.anchor_type, a.anchor_id)
      INSERT INTO public.story_entry_points (source_story_id, target_story_id, period_id, event_id)
      SELECT $1, stale.story_id, CASE WHEN anchor_type = 'period' THEN anchor_id END, CASE WHEN anchor_type = 'event' THEN anchor_id END
      FROM stale WHERE EXISTS (
        SELECT 1 FROM public.story_periods sp WHERE stale.anchor_type = 'period' AND sp.story_id = $1 AND sp.period_id = stale.anchor_id
        UNION ALL SELECT 1 FROM public.story_events se WHERE stale.anchor_type = 'event' AND se.story_id = $1 AND se.event_id = stale.anchor_id)
      ON CONFLICT DO NOTHING`, [sourceId, targetId, childIds]);
  }
  await client.query(`
    WITH moved AS (DELETE FROM public.story_entry_points WHERE source_story_id = $1 AND period_id = ANY($3::varchar[]) RETURNING target_story_id, period_id, display_as_period)
    INSERT INTO public.story_entry_points (source_story_id, target_story_id, period_id, display_as_period)
    SELECT $2, target_story_id, period_id, display_as_period FROM moved WHERE target_story_id <> $2 ON CONFLICT DO NOTHING`, [sourceId, targetId, periodIds]);
  await client.query(`
    WITH moved AS (DELETE FROM public.story_period_presentations WHERE context_story_id = $1 AND period_id = ANY($3::varchar[]) RETURNING period_id, target_story_id)
    INSERT INTO public.story_period_presentations (context_story_id, period_id, target_story_id)
    SELECT $2, period_id, target_story_id FROM moved WHERE target_story_id <> $2 ON CONFLICT DO NOTHING`, [sourceId, targetId, periodIds]);
}
export async function deletePeriodMemberships(client: TransactionClient, storyId: string, periodIds: string[]) {
  await client.query('DELETE FROM public.story_periods WHERE story_id = $1 AND period_id = ANY($2::varchar[])', [storyId, periodIds]);
}

/** Explicitly declare a detail view; composite foreign keys validate both memberships. */
export async function changePresentation(client: TransactionClient, contextId: string, periodId: string, targetId: string, remove: boolean) {
  if (remove) await client.query('DELETE FROM public.story_period_presentations WHERE context_story_id=$1 AND period_id=$2 AND target_story_id=$3', [contextId, periodId, targetId]);
  else await client.query('INSERT INTO public.story_period_presentations(context_story_id,period_id,target_story_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [contextId, periodId, targetId]);
}
