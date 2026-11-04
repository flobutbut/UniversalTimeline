import type { TransactionClient } from '../api/transaction.js';

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
