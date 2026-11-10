import type { TransactionClient } from '../api/transaction.js';
import type { NavigationRows } from '../shared/storyNavigation.js';

/** One RLS snapshot for the small graph; never load complete frise details for a breadcrumb. */
export async function readNavigationGraph(db: TransactionClient): Promise<NavigationRows> {
  return (await db.query<NavigationRows>(`
    WITH readable AS MATERIALIZED (SELECT id, title_fr, title_en, parent_story_id FROM public.stories),
    links AS (
      SELECT source_story_id AS source,target_story_id AS target,
        CASE WHEN period_id IS NOT NULL THEN 'period' WHEN event_id IS NOT NULL THEN 'event' END AS kind,
        COALESCE(period_id,event_id) AS anchor FROM public.story_entry_points
      UNION
      SELECT child.parent_story_id,child.id,a.anchor_type,a.anchor_id FROM readable child
        LEFT JOIN public.story_anchors a ON a.story_id=child.id WHERE child.parent_story_id IS NOT NULL
      UNION
      SELECT context_story_id,target_story_id,'period',period_id FROM public.story_period_presentations
    )
    SELECT
      (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM readable s) AS stories,
      (SELECT COALESCE(jsonb_agg(to_jsonb(p)),'[]') FROM (
        SELECT sp.story_id,sp.period_id,sp.parent_period_id FROM public.story_periods sp JOIN readable s ON s.id=sp.story_id
      ) p) AS periods,
      (SELECT COALESCE(jsonb_agg(to_jsonb(e)),'[]') FROM (
        SELECT se.story_id,se.event_id FROM public.story_events se JOIN readable s ON s.id=se.story_id
      ) e) AS events,
      (SELECT COALESCE(jsonb_agg(to_jsonb(l)),'[]') FROM links l
        JOIN readable source ON source.id=l.source JOIN readable target ON target.id=l.target) AS links
  `)).rows[0];
}
