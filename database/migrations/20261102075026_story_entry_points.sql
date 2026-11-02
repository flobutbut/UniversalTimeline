-- Additional navigation entry points; historical parent/anchor links remain readable.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.story_entry_points (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_story_id integer NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  target_story_id integer NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  period_id varchar,
  event_id varchar,
  CONSTRAINT story_entry_points_location CHECK (num_nonnulls(period_id, event_id) = 1),
  CONSTRAINT story_entry_points_distinct_stories CHECK (source_story_id <> target_story_id),
  CONSTRAINT story_entry_points_unique UNIQUE NULLS NOT DISTINCT (source_story_id, target_story_id, period_id, event_id),
  CONSTRAINT story_entry_points_period FOREIGN KEY (source_story_id, period_id)
    REFERENCES public.story_periods(story_id, period_id) ON DELETE CASCADE,
  CONSTRAINT story_entry_points_event FOREIGN KEY (source_story_id, event_id)
    REFERENCES public.story_events(story_id, event_id) ON DELETE CASCADE
);
CREATE INDEX story_entry_points_target_idx ON public.story_entry_points(target_story_id);
CREATE INDEX story_entry_points_period_idx ON public.story_entry_points(source_story_id, period_id) WHERE period_id IS NOT NULL;
CREATE INDEX story_entry_points_event_idx ON public.story_entry_points(source_story_id, event_id) WHERE event_id IS NOT NULL;
ALTER TABLE public.story_entry_points ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_entry_points FROM anon, authenticated;
GRANT SELECT ON public.story_entry_points TO anon, authenticated;
GRANT INSERT, DELETE ON public.story_entry_points TO authenticated;
GRANT USAGE ON SEQUENCE public.story_entry_points_id_seq TO authenticated;
CREATE POLICY entry_points_read ON public.story_entry_points FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id)
     AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id));
CREATE POLICY entry_points_insert ON public.story_entry_points FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
CREATE POLICY entry_points_delete ON public.story_entry_points FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
COMMIT;
