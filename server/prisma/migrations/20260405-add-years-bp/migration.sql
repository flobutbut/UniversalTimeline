-- Migration : ajout des colonnes numériques years_bp pour le scaling et le tri chronologique.
-- Non destructif : les colonnes TEXT existantes (start_date, end_date, date) sont conservées.
-- Les colonnes years_bp sont calculées à chaque INSERT/UPDATE par le backend.

-- Périodes
ALTER TABLE periods.periods
  ADD COLUMN IF NOT EXISTS start_years_bp NUMERIC,
  ADD COLUMN IF NOT EXISTS end_years_bp   NUMERIC;

-- Événements
ALTER TABLE events.events
  ADD COLUMN IF NOT EXISTS date_years_bp NUMERIC;

-- Index pour le tri et le filtrage chronologique
CREATE INDEX IF NOT EXISTS idx_periods_start_years_bp ON periods.periods (start_years_bp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_periods_end_years_bp   ON periods.periods (end_years_bp   ASC  NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_events_date_years_bp   ON events.events   (date_years_bp  DESC NULLS LAST);

-- Remplissage initial depuis les données existantes
-- (le backend recalculera start_years_bp/end_years_bp correctement à la prochaine écriture,
--  mais on fait une estimation initiale pour les lignes existantes)

-- Périodes : extraction de l'année depuis le format Wikidata ISO (-NNNNNNN-01-01T00:00:00Z)
UPDATE periods.periods
SET start_years_bp = (
  CASE
    WHEN start_date = 'NOW' OR start_date = 'TODAY' OR start_date IS NULL OR start_date = '' THEN 0
    WHEN start_date ~ '^[GMKA]\d' THEN
      -- Format canonique G/M/K/A
      CASE substring(start_date, 1, 1)
        WHEN 'G' THEN CAST(substring(start_date, 2) AS NUMERIC) * 1000000000
        WHEN 'M' THEN CAST(substring(start_date, 2) AS NUMERIC) * 1000000
        WHEN 'K' THEN CAST(substring(start_date, 2) AS NUMERIC) * 1000
        WHEN 'A' THEN CAST(substring(start_date, 2) AS NUMERIC)
        ELSE NULL
      END
    WHEN start_date ~ '^-\d' THEN
      -- Format Wikidata négatif (BCE)
      ABS(CAST(split_part(start_date, '-', 2) AS NUMERIC))
    WHEN start_date ~ '^\d{4}-' THEN
      -- Date calendaire CE
      GREATEST(0, EXTRACT(YEAR FROM NOW()) - CAST(split_part(start_date, '-', 1) AS NUMERIC))
    ELSE NULL
  END
)
WHERE start_years_bp IS NULL;

UPDATE periods.periods
SET end_years_bp = (
  CASE
    WHEN end_date = 'NOW' OR end_date = 'TODAY' OR end_date IS NULL OR end_date = '' THEN 0
    WHEN end_date ~ '^[GMKA]\d' THEN
      CASE substring(end_date, 1, 1)
        WHEN 'G' THEN CAST(substring(end_date, 2) AS NUMERIC) * 1000000000
        WHEN 'M' THEN CAST(substring(end_date, 2) AS NUMERIC) * 1000000
        WHEN 'K' THEN CAST(substring(end_date, 2) AS NUMERIC) * 1000
        WHEN 'A' THEN CAST(substring(end_date, 2) AS NUMERIC)
        ELSE NULL
      END
    WHEN end_date ~ '^-\d' THEN
      ABS(CAST(split_part(end_date, '-', 2) AS NUMERIC))
    WHEN end_date ~ '^\d{4}-' THEN
      GREATEST(0, EXTRACT(YEAR FROM NOW()) - CAST(split_part(end_date, '-', 1) AS NUMERIC))
    ELSE NULL
  END
)
WHERE end_years_bp IS NULL;

UPDATE events.events
SET date_years_bp = (
  CASE
    WHEN date = 'NOW' OR date = 'TODAY' OR date IS NULL OR date = '' THEN 0
    WHEN date ~ '^[GMKA]\d' THEN
      CASE substring(date, 1, 1)
        WHEN 'G' THEN CAST(substring(date, 2) AS NUMERIC) * 1000000000
        WHEN 'M' THEN CAST(substring(date, 2) AS NUMERIC) * 1000000
        WHEN 'K' THEN CAST(substring(date, 2) AS NUMERIC) * 1000
        WHEN 'A' THEN CAST(substring(date, 2) AS NUMERIC)
        ELSE NULL
      END
    WHEN date ~ '^-\d' THEN
      ABS(CAST(split_part(date, '-', 2) AS NUMERIC))
    WHEN date ~ '^\d{4}-' THEN
      GREATEST(0, EXTRACT(YEAR FROM NOW()) - CAST(split_part(date, '-', 1) AS NUMERIC))
    ELSE NULL
  END
)
WHERE date_years_bp IS NULL;
