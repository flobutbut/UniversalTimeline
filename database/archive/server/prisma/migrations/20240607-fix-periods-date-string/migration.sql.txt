-- Migration : forcer les champs start_date et end_date à TEXT pour éviter les erreurs d'insertion de dates négatives ou exotiques
ALTER TABLE periods.periods ALTER COLUMN start_date TYPE TEXT;
ALTER TABLE periods.periods ALTER COLUMN end_date TYPE TEXT; 