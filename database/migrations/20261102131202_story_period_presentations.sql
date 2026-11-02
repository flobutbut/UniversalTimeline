-- A presentation is a view of a period in a specific chronological context.
-- Existing thematic entry points keep their original meaning.
CREATE TABLE public.story_period_presentations (
  context_story_id integer NOT NULL,
  period_id varchar NOT NULL,
  target_story_id integer NOT NULL,
  CONSTRAINT story_period_presentations_pkey PRIMARY KEY (context_story_id, period_id, target_story_id),
  CONSTRAINT story_period_presentations_context FOREIGN KEY (context_story_id, period_id)
    REFERENCES public.story_periods(story_id, period_id) ON DELETE CASCADE,
  CONSTRAINT story_period_presentations_target FOREIGN KEY (target_story_id, period_id)
    REFERENCES public.story_periods(story_id, period_id) ON DELETE CASCADE,
  CONSTRAINT story_period_presentations_distinct CHECK (context_story_id <> target_story_id)
);
CREATE INDEX story_period_presentations_target_idx ON public.story_period_presentations(target_story_id, period_id);
ALTER TABLE public.story_period_presentations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_period_presentations FROM anon, authenticated;
GRANT SELECT ON public.story_period_presentations TO anon, authenticated;
GRANT INSERT, DELETE ON public.story_period_presentations TO authenticated;
CREATE POLICY presentations_read ON public.story_period_presentations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id)
     AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id));
CREATE POLICY presentations_insert ON public.story_period_presentations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
CREATE POLICY presentations_delete ON public.story_period_presentations FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
