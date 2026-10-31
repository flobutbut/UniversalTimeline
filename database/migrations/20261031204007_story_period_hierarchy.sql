-- Keep catalogue parentage unchanged; a frise can store its own placement.
ALTER TABLE public.story_periods
  ADD COLUMN parent_period_id character varying,
  ADD COLUMN parent_override boolean NOT NULL DEFAULT false;
ALTER TABLE public.story_periods
  ADD CONSTRAINT story_periods_parent_override_check CHECK (parent_period_id IS NULL OR parent_override),
  ADD CONSTRAINT story_periods_no_self_parent CHECK (parent_period_id IS DISTINCT FROM period_id),
  ADD CONSTRAINT story_periods_parent_period_id_fkey FOREIGN KEY (parent_period_id) REFERENCES public.periods(id) ON DELETE RESTRICT;
CREATE INDEX story_periods_parent_period_id_idx ON public.story_periods (parent_period_id, story_id);
