-- Frises own all period placements. Shared catalogue records have no parent.
-- Run as one transaction (Supabase apply_migration is transactional).
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.periods, public.stories, public.story_periods IN SHARE ROW EXCLUSIVE MODE;


-- Transaction-local proof: the shared facts and visible trees must survive the
-- migration unchanged. No backup table or second hierarchy remains afterwards.
CREATE TEMPORARY TABLE ut_frise_placement_check ON COMMIT DROP AS
WITH effective AS (
  SELECT sp.story_id, sp.period_id,
    CASE WHEN sp.parent_override THEN sp.parent_period_id ELSE p.parent_id END AS parent_id
  FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
), normalized AS (
  SELECT e.story_id, e.period_id, CASE WHEN EXISTS (
    SELECT 1 FROM effective parent WHERE parent.story_id = e.story_id AND parent.period_id = e.parent_id
  ) THEN e.parent_id ELSE NULL END AS parent_id FROM effective e
)
SELECT
  (SELECT count(*) FROM public.periods) AS period_count,
  (SELECT md5(jsonb_agg(to_jsonb(p) - 'parent_id' ORDER BY id)::text) FROM public.periods p) AS facts,
  (SELECT count(*) FROM public.story_periods) AS link_count,
  (SELECT md5(jsonb_agg(jsonb_build_array(story_id, period_id, parent_id) ORDER BY story_id, period_id)::text) FROM normalized) AS placements;

-- Materialize exactly the tree visible in each existing frise. A catalogue
-- parent outside that frise was already displayed as a local root.
UPDATE public.story_periods sp
SET parent_period_id = CASE WHEN EXISTS (
  SELECT 1 FROM public.story_periods parent
  WHERE parent.story_id = sp.story_id
    AND parent.period_id = CASE WHEN sp.parent_override THEN sp.parent_period_id ELSE p.parent_id END
) THEN CASE WHEN sp.parent_override THEN sp.parent_period_id ELSE p.parent_id END ELSE NULL END,
parent_override = true
FROM public.periods p WHERE p.id = sp.period_id;

-- Refuse to migrate a corrupt tree rather than silently cutting its branches.
DO $check$
BEGIN
  IF EXISTS (
    WITH RECURSIVE paths AS (
      SELECT story_id, period_id, parent_period_id, ARRAY[period_id::text] AS path, false AS cycle
      FROM public.story_periods
      UNION ALL
      SELECT w.story_id, p.period_id, p.parent_period_id, w.path || p.period_id::text,
             p.period_id::text = ANY(w.path)
      FROM paths w JOIN public.story_periods p
        ON p.story_id = w.story_id AND p.period_id = w.parent_period_id
      WHERE NOT w.cycle
    ) SELECT 1 FROM paths WHERE cycle
  ) THEN RAISE EXCEPTION 'A frise contains a period cycle; migration cancelled'; END IF;
END;
$check$;

ALTER TABLE public.story_periods
  DROP CONSTRAINT story_periods_parent_override_check,
  DROP CONSTRAINT story_periods_parent_period_id_fkey,
  DROP COLUMN parent_override;
ALTER TABLE public.story_periods
  ADD CONSTRAINT story_periods_parent_in_same_story
    FOREIGN KEY (story_id, parent_period_id)
    REFERENCES public.story_periods(story_id, period_id)
    DEFERRABLE INITIALLY DEFERRED;

-- Serialize hierarchy writes within their owning frise, including Data API writes.
-- No SECURITY DEFINER: the existing ownership/RLS rules remain authoritative.
CREATE FUNCTION public.check_story_period_hierarchy() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  PERFORM 1 FROM public.stories WHERE id = NEW.story_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND (NEW.story_id, NEW.period_id) IS DISTINCT FROM (OLD.story_id, OLD.period_id) THEN
    RAISE EXCEPTION 'Remove and add a membership to change its identity' USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_period_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE ancestors(id, parent_id) AS (
      SELECT sp.period_id, sp.parent_period_id FROM public.story_periods sp
      WHERE sp.story_id = NEW.story_id AND sp.period_id = NEW.parent_period_id
      UNION
      SELECT sp.period_id, sp.parent_period_id FROM public.story_periods sp
      JOIN ancestors a ON sp.period_id = a.parent_id WHERE sp.story_id = NEW.story_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.period_id
  ) THEN RAISE EXCEPTION 'A frise cannot contain a period cycle' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.check_story_period_hierarchy() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_story_period_hierarchy
BEFORE INSERT OR UPDATE ON public.story_periods
FOR EACH ROW EXECUTE FUNCTION public.check_story_period_hierarchy();

-- This obsolete repair routine refers to the removed catalogue hierarchy.
DROP FUNCTION IF EXISTS public.maintain_period_relations();
ALTER TABLE public.periods DROP COLUMN parent_id;

DO $verify$
DECLARE expected record; actual record;
BEGIN
  SELECT * INTO expected FROM pg_temp.ut_frise_placement_check;
  SELECT
    (SELECT count(*) FROM public.periods) AS period_count,
    (SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY id)::text) FROM public.periods p) AS facts,
    (SELECT count(*) FROM public.story_periods) AS link_count,
    (SELECT md5(jsonb_agg(jsonb_build_array(story_id, period_id, parent_period_id) ORDER BY story_id, period_id)::text) FROM public.story_periods) AS placements
  INTO actual;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'Shared facts or frise placements changed; migration cancelled';
  END IF;
END;
$verify$;
