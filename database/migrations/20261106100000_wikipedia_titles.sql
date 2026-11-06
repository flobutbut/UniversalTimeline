-- Wikipedia article titles (French and English) for catalogue periods and events.
-- Titles only: the page builds the article URL. Existing rows and access policies are preserved.
BEGIN;
ALTER TABLE public.events ADD COLUMN wikipedia_title_fr text, ADD COLUMN wikipedia_title_en text;
ALTER TABLE public.periods ADD COLUMN wikipedia_title_fr text, ADD COLUMN wikipedia_title_en text;
ALTER TABLE public.events ADD CONSTRAINT events_wikipedia_titles CHECK (
  (wikipedia_title_fr IS NULL OR (char_length(wikipedia_title_fr) BETWEEN 1 AND 255 AND wikipedia_title_fr = btrim(wikipedia_title_fr) AND wikipedia_title_fr !~ '[][#<>|{}_[:cntrl:]]'))
  AND (wikipedia_title_en IS NULL OR (char_length(wikipedia_title_en) BETWEEN 1 AND 255 AND wikipedia_title_en = btrim(wikipedia_title_en) AND wikipedia_title_en !~ '[][#<>|{}_[:cntrl:]]')));
ALTER TABLE public.periods ADD CONSTRAINT periods_wikipedia_titles CHECK (
  (wikipedia_title_fr IS NULL OR (char_length(wikipedia_title_fr) BETWEEN 1 AND 255 AND wikipedia_title_fr = btrim(wikipedia_title_fr) AND wikipedia_title_fr !~ '[][#<>|{}_[:cntrl:]]'))
  AND (wikipedia_title_en IS NULL OR (char_length(wikipedia_title_en) BETWEEN 1 AND 255 AND wikipedia_title_en = btrim(wikipedia_title_en) AND wikipedia_title_en !~ '[][#<>|{}_[:cntrl:]]')));
COMMENT ON COLUMN public.events.wikipedia_title_fr IS 'French Wikipedia article title (spaces, no underscores); NULL when there is no article.';
COMMENT ON COLUMN public.events.wikipedia_title_en IS 'English Wikipedia article title (spaces, no underscores); NULL when there is no article.';
COMMENT ON COLUMN public.periods.wikipedia_title_fr IS 'French Wikipedia article title (spaces, no underscores); NULL when there is no article.';
COMMENT ON COLUMN public.periods.wikipedia_title_en IS 'English Wikipedia article title (spaces, no underscores); NULL when there is no article.';
COMMIT;
