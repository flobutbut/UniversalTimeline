-- Evaluate the JWT once before extracting its anonymous-user flag.
BEGIN;
ALTER POLICY entry_points_insert ON public.story_entry_points WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
  AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid()))
);
ALTER POLICY entry_points_delete ON public.story_entry_points USING (
  (SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
  AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid()))
);
COMMIT;
