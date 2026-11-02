-- Importance of an event within one frise: the same catalogue event can be major here
-- and a detail elsewhere. Existing links keep the neutral level; the timeline then ranks
-- them with its structural signals only. Writes stay under ut_write_story_events (owner).
BEGIN;
ALTER TABLE public.story_events
  ADD COLUMN importance text NOT NULL DEFAULT 'normal',
  ADD CONSTRAINT story_events_importance_check CHECK (importance IN ('major', 'normal', 'minor'));
COMMIT;
