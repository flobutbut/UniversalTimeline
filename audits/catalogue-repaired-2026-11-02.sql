-- Read-only checks for the current frise-only schema.
-- Event/period date comparisons must use comparableYearsBeforePresent(raw, stored, oneReferenceInstant).
-- Stored BP numbers alone were computed at different instants and can produce false boundary warnings.
SELECT 'periods' AS kind, count(*) AS total,
  count(*) FILTER(WHERE NULLIF(btrim(description_fr),'') IS NULL) AS missing_fr,
  count(*) FILTER(WHERE NULLIF(btrim(description_en),'') IS NULL) AS missing_en
FROM public.periods
UNION ALL
SELECT 'events',count(*),
  count(*) FILTER(WHERE NULLIF(btrim(description_fr),'') IS NULL),
  count(*) FILTER(WHERE NULLIF(btrim(description_en),'') IS NULL)
FROM public.events;

SELECT s.id,s.title_fr,s.parent_story_id,a.anchor_type,a.anchor_id
FROM public.stories s JOIN public.story_anchors a ON a.story_id=s.id
WHERE s.is_public AND (
  s.parent_story_id IS NULL
  OR (a.anchor_type='period' AND NOT EXISTS(SELECT 1 FROM public.story_periods p WHERE p.story_id=s.parent_story_id AND p.period_id=a.anchor_id))
  OR (a.anchor_type='event' AND NOT EXISTS(SELECT 1 FROM public.story_events e WHERE e.story_id=s.parent_story_id AND e.event_id=a.anchor_id))
);

SELECT child.* FROM public.story_periods child
LEFT JOIN public.story_periods parent ON parent.story_id=child.story_id AND parent.period_id=child.parent_period_id
WHERE child.parent_period_id IS NOT NULL AND parent.period_id IS NULL;

WITH RECURSIVE ancestry AS (
  SELECT story_id,period_id,parent_period_id,ARRAY[period_id::text] AS path,false AS cycle FROM public.story_periods
  UNION ALL
  SELECT a.story_id,a.period_id,p.parent_period_id,a.path||p.period_id::text,p.period_id::text=ANY(a.path)
  FROM ancestry a JOIN public.story_periods p ON p.story_id=a.story_id AND p.period_id=a.parent_period_id
  WHERE NOT a.cycle
)
SELECT story_id,period_id,path FROM ancestry WHERE cycle;

WITH RECURSIVE ancestry AS (
  SELECT id,parent_story_id,ARRAY[id] AS path,false AS cycle FROM public.stories
  UNION ALL
  SELECT a.id,s.parent_story_id,a.path||s.id,s.id=ANY(a.path)
  FROM ancestry a JOIN public.stories s ON s.id=a.parent_story_id WHERE NOT a.cycle
)
SELECT id,path FROM ancestry WHERE cycle;

SELECT id,title_fr FROM public.stories WHERE is_public AND parent_story_id IS NULL ORDER BY id;
