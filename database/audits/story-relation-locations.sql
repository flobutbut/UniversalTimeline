-- Read-only audit. Event-only links can be intentional: never repair them automatically.
-- Includes explicit entry points, historical parent anchors, and period presentations.
WITH locations AS (
  SELECT source_story_id, target_story_id,
    CASE WHEN period_id IS NOT NULL THEN 'period' WHEN event_id IS NOT NULL THEN 'event' END AS kind,
    coalesce(period_id,event_id) AS anchor_id
  FROM public.story_entry_points
  UNION
  SELECT s.parent_story_id,s.id,a.anchor_type,a.anchor_id
  FROM public.stories s JOIN public.story_anchors a ON a.story_id=s.id WHERE s.parent_story_id IS NOT NULL
  UNION
  SELECT s.parent_story_id,s.id,NULL,NULL FROM public.stories s
  WHERE s.parent_story_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=s.id)
  UNION
  SELECT context_story_id,target_story_id,'period',period_id FROM public.story_period_presentations
), checked AS (
  SELECT l.*, CASE WHEN kind='period' THEN EXISTS(SELECT 1 FROM public.story_periods p WHERE p.story_id=l.source_story_id AND p.period_id=l.anchor_id)
    WHEN kind='event' THEN EXISTS(SELECT 1 FROM public.story_events e WHERE e.story_id=l.source_story_id AND e.event_id=l.anchor_id)
    ELSE true END AS valid
  FROM locations l
)
SELECT source_story_id,source.title_fr AS source_title,target_story_id,target.title_fr AS target_title,
  CASE WHEN bool_and(kind IS NOT NULL AND kind='event' AND valid) THEN 'event_only' ELSE 'missing_anchor' END AS review_reason,
  jsonb_agg(jsonb_build_object('type',kind,'id',anchor_id,'valid',valid) ORDER BY kind,anchor_id) AS locations
FROM checked JOIN public.stories source ON source.id=source_story_id JOIN public.stories target ON target.id=target_story_id
GROUP BY source_story_id,source.title_fr,target_story_id,target.title_fr
HAVING bool_or(NOT valid) OR bool_and(kind IS NOT NULL AND kind='event' AND valid)
ORDER BY source_story_id,target_story_id;
