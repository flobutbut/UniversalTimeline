-- Applied to Universal-Timeline as Supabase migration 20261029090427 (29 October 2026).
-- Existing stories stay unassigned until the explicit confirmed-account attribution.
BEGIN;
ALTER TABLE public.stories ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.stories ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE public.stories ALTER COLUMN is_public SET DEFAULT false;
CREATE INDEX stories_owner_user_id_idx ON public.stories(owner_user_id);
ALTER TABLE public.stories ADD CONSTRAINT stories_id_owner_unique UNIQUE (id, owner_user_id);
-- A child cannot be attached to another user's story, even when that parent is public.
ALTER TABLE public.stories ADD CONSTRAINT stories_parent_same_owner
  FOREIGN KEY (parent_story_id, owner_user_id) REFERENCES public.stories(id, owner_user_id);

-- Unexpected additional policies must be reviewed rather than silently left permissive.
DO $audit$
DECLARE item record;
BEGIN
  FOR item IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN
      ('periods','events','categories','period_categories','event_categories','stories','story_periods','story_events','story_categories','story_anchors')
  LOOP
    IF item.policyname NOT IN ('read_' || item.tablename, 'write_' || item.tablename) THEN
      RAISE EXCEPTION 'Unexpected policy: %.%', item.tablename, item.policyname;
    END IF;
    EXECUTE format('DROP POLICY %I ON public.%I', item.policyname, item.tablename);
  END LOOP;
END $audit$;

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.periods FROM anon, authenticated;
GRANT SELECT ON public.periods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.periods TO authenticated;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
ALTER TABLE public.period_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.period_categories FROM anon, authenticated;
GRANT SELECT ON public.period_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.period_categories TO authenticated;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_categories FROM anon, authenticated;
GRANT SELECT ON public.event_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_categories TO authenticated;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stories FROM anon, authenticated;
GRANT SELECT ON public.stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stories TO authenticated;
ALTER TABLE public.story_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_periods FROM anon, authenticated;
GRANT SELECT ON public.story_periods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.story_periods TO authenticated;
ALTER TABLE public.story_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_events FROM anon, authenticated;
GRANT SELECT ON public.story_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.story_events TO authenticated;
ALTER TABLE public.story_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_categories FROM anon, authenticated;
GRANT SELECT ON public.story_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.story_categories TO authenticated;
ALTER TABLE public.story_anchors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_anchors FROM anon, authenticated;
GRANT SELECT ON public.story_anchors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.story_anchors TO authenticated;
GRANT USAGE ON SEQUENCE public.stories_id_seq, public.story_anchors_id_seq TO authenticated;

CREATE POLICY ut_read_periods ON public.periods FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ut_write_periods ON public.periods FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true') WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_events ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ut_write_events ON public.events FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true') WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_categories ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ut_read_period_categories ON public.period_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ut_write_period_categories ON public.period_categories FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true') WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_event_categories ON public.event_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ut_write_event_categories ON public.event_categories FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true') WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

CREATE POLICY ut_read_stories ON public.stories FOR SELECT TO anon, authenticated
  USING (is_public IS TRUE OR ((SELECT auth.uid()) = owner_user_id));
CREATE POLICY ut_insert_stories ON public.stories FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_user_id AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_update_stories ON public.stories FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_user_id AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true') WITH CHECK ((SELECT auth.uid()) = owner_user_id AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_delete_stories ON public.stories FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_user_id AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

CREATE POLICY ut_read_story_periods ON public.story_periods FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_periods.story_id));
CREATE POLICY ut_write_story_periods ON public.story_periods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_periods.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_periods.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_story_events ON public.story_events FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_events.story_id));
CREATE POLICY ut_write_story_events ON public.story_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_events.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_events.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_story_categories ON public.story_categories FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_categories.story_id));
CREATE POLICY ut_write_story_categories ON public.story_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_categories.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_categories.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY ut_read_story_anchors ON public.story_anchors FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_anchors.story_id));
CREATE POLICY ut_write_story_anchors ON public.story_anchors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_anchors.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_anchors.story_id AND s.owner_user_id = (SELECT auth.uid())) AND (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- No changes to spatial_ref_sys/PostGIS in this migration: separate reviewed remediation.
COMMENT ON COLUMN public.stories.owner_user_id IS 'UniversalTimeline access v1; NULL = legacy story pending explicit attribution';
COMMIT;
