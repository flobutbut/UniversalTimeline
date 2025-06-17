-- Création d'une table temporaire avec la nouvelle structure
CREATE TABLE stories.stories_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  author VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copie des données avec génération de nouveaux UUIDs
INSERT INTO stories.stories_new (title_fr, title_en, description_fr, description_en, author, is_public, created_at, updated_at)
SELECT title_fr, title_en, description_fr, description_en, author, is_public, created_at, updated_at
FROM stories.stories;

-- Création de la table de mapping
CREATE TABLE IF NOT EXISTS stories.stories_id_mapping (
  old_id INTEGER PRIMARY KEY,
  new_id UUID NOT NULL
);

-- Remplissage de la table de mapping
INSERT INTO stories.stories_id_mapping (old_id, new_id)
SELECT s.id, n.id
FROM stories.stories s
JOIN stories.stories_new n ON s.title_fr = n.title_fr;

-- Mise à jour des références dans les tables de liaison
UPDATE stories.story_events
SET story_id = (SELECT new_id FROM stories.stories_id_mapping WHERE old_id = story_events.story_id::integer);

UPDATE stories.story_periods
SET story_id = (SELECT new_id FROM stories.stories_id_mapping WHERE old_id = story_periods.story_id::integer);

-- Suppression de l'ancienne table et renommage de la nouvelle
DROP TABLE stories.stories;
ALTER TABLE stories.stories_new RENAME TO stories;

-- Vérification du nombre de mappings créés
SELECT COUNT(*) as stories_mapping_count FROM stories.stories_id_mapping; 