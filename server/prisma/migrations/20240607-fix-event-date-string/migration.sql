-- Migration : forcer le champ date à TEXT pour éviter les erreurs d'insertion de dates négatives ou exotiques
ALTER TABLE events.events ALTER COLUMN date TYPE TEXT; 