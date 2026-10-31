-- Migration des champs de date vers le format ISO8602

-- Modification de la table periods
ALTER TABLE periods.periods 
    ALTER COLUMN start_date TYPE VARCHAR(255),
    ALTER COLUMN end_date TYPE VARCHAR(255);

-- Modification de la table events
ALTER TABLE events.events 
    ALTER COLUMN date TYPE VARCHAR(255);

-- Mise à jour des index
DROP INDEX IF EXISTS periods.idx_periods_dates;
DROP INDEX IF EXISTS events.idx_events_date;

CREATE INDEX idx_periods_dates ON periods.periods(start_date, end_date);
CREATE INDEX idx_events_date ON events.events(date);

-- Commentaires sur les colonnes
COMMENT ON COLUMN periods.periods.start_date IS 'Date de début au format ISO8602 (ex: G+14000000000Y2, H-8000Y0, M+2025Y4)';
COMMENT ON COLUMN periods.periods.end_date IS 'Date de fin au format ISO8602 (ex: G+14000000000Y2, H-8000Y0, M+2025Y4)';
COMMENT ON COLUMN events.events.date IS 'Date au format ISO8602 (ex: G+14000000000Y2, H-8000Y0, M+2025Y4)';

-- Création d'une fonction de validation
CREATE OR REPLACE FUNCTION validate_iso8602_date(date_str VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN date_str ~ '^[GHM][+-]\d+Y[0-8](?:T[0-9]{2}:[0-9]{2})?Z?$';
END;
$$ LANGUAGE plpgsql;

-- Création des contraintes de validation
ALTER TABLE periods.periods
    ADD CONSTRAINT check_start_date_format 
    CHECK (start_date IS NULL OR validate_iso8602_date(start_date)),
    ADD CONSTRAINT check_end_date_format 
    CHECK (end_date IS NULL OR validate_iso8602_date(end_date));

ALTER TABLE events.events
    ADD CONSTRAINT check_date_format 
    CHECK (date IS NULL OR validate_iso8602_date(date)); 