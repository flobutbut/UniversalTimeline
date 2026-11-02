-- Audit du catalogue Universal-Timeline : lecture seule.
-- Actualisé pour le modèle de frises migré le 2 novembre 2026.
-- Ne lit ni les descriptions des frises, ni les comptes.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

-- Couverture des descriptions (fiches uniques).
SELECT 'period' AS kind, count(*) AS total,
  count(*) FILTER (WHERE nullif(btrim(description_fr), '') IS NULL) AS missing_fr,
  count(*) FILTER (WHERE nullif(btrim(description_en), '') IS NULL) AS missing_en,
  count(*) FILTER (WHERE nullif(btrim(description_fr), '') IS NULL
                    AND nullif(btrim(description_en), '') IS NULL) AS missing_both
FROM public.periods
UNION ALL
SELECT 'event', count(*),
  count(*) FILTER (WHERE nullif(btrim(description_fr), '') IS NULL),
  count(*) FILTER (WHERE nullif(btrim(description_en), '') IS NULL),
  count(*) FILTER (WHERE nullif(btrim(description_fr), '') IS NULL
                    AND nullif(btrim(description_en), '') IS NULL)
FROM public.events;

-- Fiches à enrichir, sans exporter les textes existants.
SELECT 'period' AS kind, id, label_fr, wikidata_id,
  nullif(btrim(description_fr), '') IS NULL AS missing_fr,
  nullif(btrim(description_en), '') IS NULL AS missing_en
FROM public.periods
WHERE nullif(btrim(description_fr), '') IS NULL OR nullif(btrim(description_en), '') IS NULL
UNION ALL
SELECT 'event', id, label_fr, wikidata_id,
  nullif(btrim(description_fr), '') IS NULL,
  nullif(btrim(description_en), '') IS NULL
FROM public.events
WHERE nullif(btrim(description_fr), '') IS NULL OR nullif(btrim(description_en), '') IS NULL
ORDER BY kind, label_fr;

-- Frises publiques : contenu et ancres.
SELECT s.id, s.title_fr, s.parent_story_id,
  (SELECT count(*) FROM public.story_periods sp WHERE sp.story_id = s.id) AS periods,
  (SELECT count(*) FROM public.story_events se WHERE se.story_id = s.id) AS events,
  (SELECT count(*) FROM public.story_anchors a WHERE a.story_id = s.id) AS anchors
FROM public.stories s WHERE s.is_public IS TRUE ORDER BY s.id;

-- Ancres invalides ou absentes ; une ligne NULL signifie « aucune ancre explicite ».
WITH anchors AS (
  SELECT s.id, s.title_fr, s.parent_story_id, a.anchor_type, a.anchor_id,
    CASE WHEN a.anchor_type = 'period' THEN EXISTS (
      SELECT 1 FROM public.story_periods sp
      WHERE sp.story_id = s.parent_story_id AND sp.period_id = a.anchor_id
    ) WHEN a.anchor_type = 'event' THEN EXISTS (
      SELECT 1 FROM public.story_events se
      WHERE se.story_id = s.parent_story_id AND se.event_id = a.anchor_id
    ) ELSE false END AS anchor_in_parent
  FROM public.stories s LEFT JOIN public.story_anchors a ON a.story_id = s.id
  WHERE s.is_public IS TRUE AND s.parent_story_id IS NOT NULL
)
SELECT * FROM anchors WHERE NOT anchor_in_parent ORDER BY id;

-- Fiches sans appartenance publique (peuvent être volontairement en réserve).
SELECT 'period' AS kind, p.id, p.label_fr
FROM public.periods p WHERE NOT EXISTS (
  SELECT 1 FROM public.story_periods sp JOIN public.stories s ON s.id = sp.story_id
  WHERE s.is_public IS TRUE AND sp.period_id = p.id
)
UNION ALL
SELECT 'event', e.id, e.label_fr
FROM public.events e WHERE NOT EXISTS (
  SELECT 1 FROM public.story_events se JOIN public.stories s ON s.id = se.story_id
  WHERE s.is_public IS TRUE AND se.event_id = e.id
)
ORDER BY kind, label_fr;

-- Parents locaux absents de leur frise et cycles par frise publique.
SELECT child.story_id, child.period_id, child.parent_period_id
FROM public.story_periods child JOIN public.stories s ON s.id = child.story_id
WHERE s.is_public IS TRUE AND child.parent_period_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.story_periods parent
  WHERE parent.story_id = child.story_id AND parent.period_id = child.parent_period_id
);

WITH RECURSIVE walk AS (
  SELECT sp.story_id, sp.period_id AS origin, sp.period_id, sp.parent_period_id,
    ARRAY[sp.period_id::text] AS path, false AS cycle
  FROM public.story_periods sp JOIN public.stories s ON s.id = sp.story_id
  WHERE s.is_public IS TRUE
  UNION ALL
  SELECT w.story_id, w.origin, p.period_id, p.parent_period_id,
    w.path || p.period_id::text, p.period_id::text = ANY(w.path)
  FROM walk w JOIN public.story_periods p
    ON p.story_id = w.story_id AND p.period_id = w.parent_period_id
  WHERE NOT w.cycle
)
SELECT DISTINCT story_id, origin FROM walk WHERE cycle;

-- Catégories manquantes.
SELECT 'period' AS kind, p.id, p.label_fr FROM public.periods p
WHERE NOT EXISTS (SELECT 1 FROM public.period_categories pc WHERE pc.period_id = p.id)
UNION ALL
SELECT 'event', e.id, e.label_fr FROM public.events e
WHERE NOT EXISTS (SELECT 1 FROM public.event_categories ec WHERE ec.event_id = e.id);

-- Événements hors de toutes les périodes de leur frise selon les BP stockés.
-- Indicateur à examiner : ni erreur certaine, ni demande de suppression.
SELECT s.id AS story_id, s.title_fr, e.id AS event_id, e.label_fr, e.date
FROM public.story_events se
JOIN public.stories s ON s.id = se.story_id AND s.is_public IS TRUE
JOIN public.events e ON e.id = se.event_id
WHERE e.date_years_bp IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id = s.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
    WHERE sp.story_id = s.id AND e.date_years_bp <= p.start_years_bp
      AND e.date_years_bp >= p.end_years_bp
  )
ORDER BY s.id, e.label_fr;

COMMIT;
