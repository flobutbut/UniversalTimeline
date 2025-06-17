-- Rollback de la migration vers UUID
-- Date: 2024-03-21
-- Description: Retour aux IDs originaux

-- 1. Sauvegarde automatique avant rollback
\copy (SELECT '-- Backup généré automatiquement le ' || now()) to 'backup_pre_rollback.sql'
\copy (SELECT pg_dump('wikidata_db')) to 'backup_pre_rollback.sql'

-- 2. Création des tables temporaires pour stocker les relations actuelles
CREATE TEMP TABLE temp_period_categories AS 
SELECT * FROM categories.period_categories;

CREATE TEMP TABLE temp_event_categories AS 
SELECT * FROM categories.event_categories;

CREATE TEMP TABLE temp_story_categories AS 
SELECT * FROM categories.story_categories;

CREATE TEMP TABLE temp_story_periods AS 
SELECT * FROM stories.story_periods;

CREATE TEMP TABLE temp_story_events AS 
SELECT * FROM stories.story_events;

-- 3. Suppression des contraintes de clés étrangères
ALTER TABLE categories.period_categories DROP CONSTRAINT period_categories_pkey;
ALTER TABLE categories.event_categories DROP CONSTRAINT event_categories_pkey;
ALTER TABLE categories.story_categories DROP CONSTRAINT story_categories_pkey;
ALTER TABLE stories.story_periods DROP CONSTRAINT story_periods_pkey;
ALTER TABLE stories.story_events DROP CONSTRAINT story_events_pkey;

ALTER TABLE categories.period_categories DROP CONSTRAINT period_categories_category_id_fkey;
ALTER TABLE categories.event_categories DROP CONSTRAINT event_categories_category_id_fkey;
ALTER TABLE categories.story_categories DROP CONSTRAINT story_categories_category_id_fkey;
ALTER TABLE stories.story_periods DROP CONSTRAINT story_periods_story_id_fkey;
ALTER TABLE stories.story_events DROP CONSTRAINT story_events_story_id_fkey;

-- 4. Conversion des UUIDs en VARCHAR
-- Pour les périodes
ALTER TABLE periods.periods 
ALTER COLUMN id TYPE VARCHAR(255);

-- Pour les événements
ALTER TABLE events.events 
ALTER COLUMN id TYPE VARCHAR(255);

-- Pour les catégories
ALTER TABLE categories.categories 
ALTER COLUMN id TYPE VARCHAR(255);

-- Pour les stories
ALTER TABLE stories.stories 
ALTER COLUMN id TYPE INTEGER USING 1; -- Valeur par défaut, à ajuster selon vos besoins

-- 5. Mise à jour des tables de liaison
-- Period Categories
ALTER TABLE categories.period_categories 
ALTER COLUMN period_id TYPE VARCHAR(255),
ALTER COLUMN category_id TYPE VARCHAR(255);

-- Event Categories
ALTER TABLE categories.event_categories 
ALTER COLUMN event_id TYPE VARCHAR(255),
ALTER COLUMN category_id TYPE VARCHAR(255);

-- Story Categories
ALTER TABLE categories.story_categories 
ALTER COLUMN story_id TYPE INTEGER,
ALTER COLUMN category_id TYPE VARCHAR(255);

-- Story Periods
ALTER TABLE stories.story_periods 
ALTER COLUMN story_id TYPE INTEGER,
ALTER COLUMN period_id TYPE VARCHAR(255);

-- Story Events
ALTER TABLE stories.story_events 
ALTER COLUMN story_id TYPE INTEGER,
ALTER COLUMN event_id TYPE VARCHAR(255);

-- 6. Recréation des contraintes
ALTER TABLE categories.period_categories 
ADD CONSTRAINT period_categories_pkey PRIMARY KEY (period_id, category_id),
ADD CONSTRAINT period_categories_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories.categories(id);

ALTER TABLE categories.event_categories 
ADD CONSTRAINT event_categories_pkey PRIMARY KEY (event_id, category_id),
ADD CONSTRAINT event_categories_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories.categories(id);

ALTER TABLE categories.story_categories 
ADD CONSTRAINT story_categories_pkey PRIMARY KEY (story_id, category_id),
ADD CONSTRAINT story_categories_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories.categories(id);

ALTER TABLE stories.story_periods 
ADD CONSTRAINT story_periods_pkey PRIMARY KEY (story_id, period_id),
ADD CONSTRAINT story_periods_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories.stories(id);

ALTER TABLE stories.story_events 
ADD CONSTRAINT story_events_pkey PRIMARY KEY (story_id, event_id),
ADD CONSTRAINT story_events_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories.stories(id);

-- 7. Recréation des index
CREATE INDEX idx_periods_wikidata_id ON periods.periods(wikidata_id);
CREATE INDEX idx_events_wikidata_id ON events.events(wikidata_id);
CREATE INDEX idx_periods_dates ON periods.periods(start_date, end_date);
CREATE INDEX idx_events_date ON events.events(date);
CREATE INDEX idx_categories_parent_id ON categories.categories(parent_id);
CREATE INDEX idx_periods_parent_id ON periods.periods(parent_id);
CREATE INDEX idx_event_categories ON categories.event_categories(event_id, category_id);
CREATE INDEX idx_story_categories ON categories.story_categories(story_id, category_id);
CREATE INDEX idx_story_periods ON stories.story_periods(story_id, period_id);
CREATE INDEX idx_story_events ON stories.story_events(story_id, event_id);

-- 8. Nettoyage
DROP TABLE temp_period_categories;
DROP TABLE temp_event_categories;
DROP TABLE temp_story_categories;
DROP TABLE temp_story_periods;
DROP TABLE temp_story_events; 