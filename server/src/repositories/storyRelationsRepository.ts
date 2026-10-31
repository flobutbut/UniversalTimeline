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
  // FOR UPDATE applies UPDATE and SELECT policies: public visibility is not ownership.
  return (await client.query<{ id: number }>('SELECT id FROM public.stories WHERE id = $1 FOR UPDATE', [storyId])).rows[0];
}
export async function removeAssociations(client: TransactionClient, storyId: string, kind: AssociationKind, ids: string[]) {
  const relation = relations[kind];
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
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
/** Hold the catalogue hierarchy stable while copying it into one frise's placements. */
export async function lockCatalogueHierarchyForRead(client: TransactionClient) {
  await client.query('LOCK TABLE public.periods IN SHARE MODE');
}
export async function freezePeriodPlacements(client: TransactionClient, storyId: string) {
  await client.query(`UPDATE public.story_periods sp
    SET parent_override = true, parent_period_id = p.parent_id
    FROM public.periods p
    WHERE sp.story_id = $1 AND sp.period_id = p.id AND NOT sp.parent_override`, [storyId]);
}
export async function setPeriodPlacements(client: TransactionClient, storyId: string, ids: string[], parentId: string | null) {
  await client.query(`UPDATE public.story_periods SET parent_override = true, parent_period_id = $3
    WHERE story_id = $1 AND period_id = ANY($2::varchar[])`, [storyId, ids, parentId]);
}
export async function readPeriodPlacements(client: TransactionClient, storyId: string) {
  return (await client.query<{ id: string; parent_id: string | null }>(`
    SELECT period_id AS id, parent_period_id AS parent_id FROM public.story_periods WHERE story_id = $1`, [storyId])).rows;
}
/** Keep the branch under the chosen root in this frise; never reparent catalogue records. */
export async function replaceRootPeriod(client: TransactionClient, storyId: string, periodId: string) {
  await insertAssociations(client, storyId, 'period', [periodId]);
  await freezePeriodPlacements(client, storyId);
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
