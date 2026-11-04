-- Display preference on a navigation occurrence; never creates catalogue periods.
ALTER TABLE public.story_entry_points ADD COLUMN IF NOT EXISTS display_as_period boolean NOT NULL DEFAULT false;
