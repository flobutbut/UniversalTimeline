-- Public Wikidata provenance. Existing catalogue rows and access policies are preserved.
BEGIN;
ALTER TABLE public.events ADD COLUMN source_key text, ADD COLUMN wikidata_source jsonb;
ALTER TABLE public.periods ADD COLUMN source_key text, ADD COLUMN wikidata_source jsonb;
CREATE UNIQUE INDEX events_source_key_unique ON public.events(source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX periods_source_key_unique ON public.periods(source_key) WHERE source_key IS NOT NULL;
ALTER TABLE public.events ADD CONSTRAINT events_wikidata_source_object CHECK (wikidata_source IS NULL OR jsonb_typeof(wikidata_source) = 'object');
ALTER TABLE public.periods ADD CONSTRAINT periods_wikidata_source_object CHECK (wikidata_source IS NULL OR jsonb_typeof(wikidata_source) = 'object');
ALTER TABLE public.events ADD CONSTRAINT events_fact_identity CHECK (source_key IS NULL OR coalesce(
  wikidata_id IS NULL AND source_key = 'fact:' || (wikidata_source->>'qid') || ':' || (wikidata_source->>'property') || ':' || lower(wikidata_source->>'statementId')
  AND (wikidata_source->>'qid') ~ '^Q[1-9][0-9]*$'
  AND (wikidata_source->>'property') ~ '^P[1-9][0-9]*$'
  AND length(source_key) <= 200, false));
ALTER TABLE public.periods ADD CONSTRAINT periods_fact_identity CHECK (source_key IS NULL OR coalesce(
  wikidata_id IS NULL AND source_key = 'fact:' || (wikidata_source->>'qid') || ':' || (wikidata_source->>'property') || ':' || lower(wikidata_source->>'statementId')
  AND (wikidata_source->>'qid') ~ '^Q[1-9][0-9]*$'
  AND (wikidata_source->>'property') ~ '^P[1-9][0-9]*$'
  AND length(source_key) <= 200, false));
COMMENT ON COLUMN public.events.source_key IS 'Stable statement identity for derived Wikidata facts; native entities keep wikidata_id.';
COMMENT ON COLUMN public.periods.source_key IS 'Stable statement identity for derived Wikidata facts; native entities keep wikidata_id.';
COMMENT ON COLUMN public.events.wikidata_source IS 'Public Wikidata declaration and original date precision; catalogue corrections do not rewrite the source.';
COMMENT ON COLUMN public.periods.wikidata_source IS 'Public Wikidata declaration and original date precision; catalogue corrections do not rewrite the source.';
COMMIT;
