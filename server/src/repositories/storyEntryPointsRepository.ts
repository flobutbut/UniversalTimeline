import type { TransactionClient } from '../api/transaction.js';

export type EntryLocation = { anchorType: 'period' | 'event'; anchorId: string } | null;

/** The same explicit, historical and chronological locations shown by the detail view. */
export async function listEntryLocations(client: TransactionClient, sourceId: string, targetId: string) {
  return (await client.query<{ anchor_type: 'period' | 'event' | null; anchor_id: string | null; legacy: boolean; in_story: boolean; display_as_period: boolean }>(`
    WITH locations AS (
      SELECT CASE WHEN period_id IS NOT NULL THEN 'period' WHEN event_id IS NOT NULL THEN 'event' END AS anchor_type,
        coalesce(period_id,event_id) AS anchor_id, false AS legacy, display_as_period
      FROM public.story_entry_points WHERE source_story_id=$1 AND target_story_id=$2
      UNION ALL
      SELECT a.anchor_type,a.anchor_id,true,false FROM public.story_anchors a JOIN public.stories s ON s.id=a.story_id
      WHERE s.parent_story_id=$1 AND s.id=$2
      UNION ALL
      SELECT 'period',period_id,false,false FROM public.story_period_presentations WHERE context_story_id=$1 AND target_story_id=$2
      UNION ALL
      SELECT NULL,NULL,true,false FROM public.stories s WHERE s.parent_story_id=$1 AND s.id=$2
        AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=s.id)
    ) SELECT l.*, EXISTS(SELECT 1 FROM public.story_periods p
      WHERE l.anchor_type='period' AND p.story_id=$1 AND p.period_id=l.anchor_id) AS in_story FROM locations l
  `, [sourceId, targetId])).rows;
}

/** Existing INSERT/DELETE policies apply; changing presentation grants no new permissions. */
export async function setEntryDisplay(client: TransactionClient, sourceId: string, targetId: string, location: EntryLocation, asPeriod: boolean) {
  const values = [sourceId,targetId,location?.anchorType === 'period' ? location.anchorId : null,location?.anchorType === 'event' ? location.anchorId : null];
  await client.query(`DELETE FROM public.story_entry_points WHERE source_story_id=$1 AND target_story_id=$2
    AND period_id IS NOT DISTINCT FROM $3::varchar AND event_id IS NOT DISTINCT FROM $4::varchar`,values);
  await client.query(`INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id,display_as_period)
    VALUES($1,$2,$3,$4,$5)`,[...values,asPeriod]);
}

/** Remove just the dragged occurrence; retain every other source and location. */
export async function removeMovedEntryLocation(client: TransactionClient, sourceId: string, targetId: string, from: EntryLocation, to: EntryLocation, legacyOrigin: boolean) {
  await client.query(`DELETE FROM public.story_entry_points WHERE source_story_id=$1 AND target_story_id=$2
    AND period_id IS NOT DISTINCT FROM $3::varchar AND event_id IS NOT DISTINCT FROM $4::varchar`,
  [sourceId,targetId,from?.anchorType === 'period' ? from.anchorId : null,from?.anchorType === 'event' ? from.anchorId : null]);
  if (from?.anchorType === 'period') await client.query(`DELETE FROM public.story_period_presentations
    WHERE context_story_id=$1 AND target_story_id=$2 AND period_id=$3`, [sourceId,targetId,from.anchorId]);
  if (!legacyOrigin) return;
  if (from) await client.query(`DELETE FROM public.story_anchors a USING public.stories s WHERE a.story_id=s.id
    AND s.parent_story_id=$1 AND s.id=$2 AND a.anchor_type=$3 AND a.anchor_id=$4`, [sourceId,targetId,from.anchorType,from.anchorId]);
  // Do not detach the historical parent or accidentally create an implicit root.
  if (to) await client.query(`INSERT INTO public.story_anchors(story_id,anchor_type,anchor_id)
    SELECT s.id,$3,$4 FROM public.stories s WHERE s.parent_story_id=$1 AND s.id=$2
      AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=s.id)
    ON CONFLICT DO NOTHING`, [sourceId,targetId,to.anchorType,to.anchorId]);
}

/** A root is a real location, distinct from deleting every location in a source. */
export async function changeRootEntryPoint(client: TransactionClient, sourceId: string, targetId: string, remove: boolean) {
  if (!remove) {
    await client.query(`INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id)
      VALUES($1,$2,NULL,NULL) ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING`,[sourceId,targetId]);
    return;
  }
  await client.query('DELETE FROM public.story_entry_points WHERE source_story_id=$1 AND target_story_id=$2 AND period_id IS NULL AND event_id IS NULL',[sourceId,targetId]);
  await client.query(`UPDATE public.stories s SET parent_story_id=NULL WHERE s.id=$2 AND s.parent_story_id=$1
    AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=s.id)`,[sourceId,targetId]);
}

/** New entry points coexist with historical parent/anchor links without reparenting them. */
export async function addEntryPoint(client: TransactionClient, sourceId: string, targetId: string, type: 'period' | 'event', anchorId: string) {
  await client.query(`INSERT INTO public.story_entry_points (source_story_id, target_story_id, period_id, event_id)
    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [sourceId, targetId, type === 'period' ? anchorId : null, type === 'event' ? anchorId : null]);
}

/** Remove one location; other sources and locations must survive. */
export async function removeEntryPoint(client: TransactionClient, sourceId: string, targetId: string, type: 'period' | 'event', anchorId: string) {
  const column = type === 'period' ? 'period_id' : 'event_id';
  await client.query(`DELETE FROM public.story_entry_points WHERE source_story_id = $1 AND target_story_id = $2 AND ${column} = $3`, [sourceId, targetId, anchorId]);
  if (type === 'period') await client.query('DELETE FROM public.story_period_presentations WHERE context_story_id=$1 AND target_story_id=$2 AND period_id=$3',[sourceId,targetId,anchorId]);
  await client.query(`DELETE FROM public.story_anchors a USING public.stories s
    WHERE a.story_id = s.id AND s.id = $2 AND s.parent_story_id = $1 AND a.anchor_type = $3 AND a.anchor_id = $4`, [sourceId, targetId, type, anchorId]);
  await client.query(`UPDATE public.stories s SET parent_story_id = NULL
    WHERE s.id = $2 AND s.parent_story_id = $1
      AND NOT EXISTS (SELECT 1 FROM public.story_anchors a WHERE a.story_id = s.id)`, [sourceId, targetId]);
}

/** Explicitly detach a legacy relation with no location. */
export async function removeSource(client: TransactionClient, sourceId: string, targetId: string) {
  await client.query('DELETE FROM public.story_entry_points WHERE source_story_id = $1 AND target_story_id = $2', [sourceId, targetId]);
  await client.query(`DELETE FROM public.story_anchors a USING public.stories s
    WHERE a.story_id = s.id AND s.id = $2 AND s.parent_story_id = $1`, [sourceId, targetId]);
  await client.query('UPDATE public.stories SET parent_story_id = NULL WHERE id = $2 AND parent_story_id = $1', [sourceId, targetId]);
}
