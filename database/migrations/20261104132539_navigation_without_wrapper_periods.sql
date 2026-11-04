BEGIN;
SET LOCAL lock_timeout = '5s';
-- Both location fields NULL means an explicit entry at the source frise root.
ALTER TABLE public.story_entry_points DROP CONSTRAINT story_entry_points_location;
ALTER TABLE public.story_entry_points ADD CONSTRAINT story_entry_points_location
  CHECK (num_nonnulls(period_id, event_id) <= 1);
-- The reference period belongs to its context, not necessarily to the destination narrative.
ALTER TABLE public.story_period_presentations DROP CONSTRAINT story_period_presentations_target;
ALTER TABLE public.story_period_presentations ADD CONSTRAINT story_period_presentations_target
  FOREIGN KEY (target_story_id) REFERENCES public.stories(id) ON DELETE CASCADE;
COMMIT;
