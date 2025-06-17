-- Migration vers UUID
-- Date: 2024-03-21
-- Description: Conversion des IDs en UUID

-- 1. Sauvegarde automatique
\copy (SELECT '-- Backup généré automatiquement le ' || now()) to 'backup_pre_migration.sql'
\copy (SELECT pg_dump('wikidata_db')) to 'backup_pre_migration.sql'

-- 2. Activation de l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Création des tables temporaires pour stocker les anciennes relations
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

-- 4. Suppression des contraintes de clés étrangères
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

-- 5. Conversion des IDs en UUID
-- Pour les périodes
ALTER TABLE periods.periods 
ALTER COLUMN id TYPE UUID USING uuid_generate_v4();

-- Pour les événements
ALTER TABLE events.events 
ALTER COLUMN id TYPE UUID USING uuid_generate_v4();

-- Pour les catégories
ALTER TABLE categories.categories 
ALTER COLUMN id TYPE UUID USING uuid_generate_v4();

-- Pour les stories (spécial car c'est un SERIAL)
ALTER TABLE stories.stories 
ALTER COLUMN id TYPE UUID USING uuid_generate_v4();

-- 6. Mise à jour des tables de liaison
-- Period Categories
ALTER TABLE categories.period_categories 
ALTER COLUMN period_id TYPE UUID USING uuid_generate_v4(),
ALTER COLUMN category_id TYPE UUID USING uuid_generate_v4();

-- Event Categories
ALTER TABLE categories.event_categories 
ALTER COLUMN event_id TYPE UUID USING uuid_generate_v4(),
ALTER COLUMN category_id TYPE UUID USING uuid_generate_v4();

-- Story Categories
ALTER TABLE categories.story_categories 
ALTER COLUMN story_id TYPE UUID USING uuid_generate_v4(),
ALTER COLUMN category_id TYPE UUID USING uuid_generate_v4();

-- Story Periods
ALTER TABLE stories.story_periods 
ALTER COLUMN story_id TYPE UUID USING uuid_generate_v4(),
ALTER COLUMN period_id TYPE UUID USING uuid_generate_v4();

-- Story Events
ALTER TABLE stories.story_events 
ALTER COLUMN story_id TYPE UUID USING uuid_generate_v4(),
ALTER COLUMN event_id TYPE UUID USING uuid_generate_v4();

-- 7. Recréation des contraintes
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

-- 8. Recréation des index
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

-- 9. Nettoyage
DROP TABLE temp_period_categories;
DROP TABLE temp_event_categories;
DROP TABLE temp_story_categories;
DROP TABLE temp_story_periods;
DROP TABLE temp_story_events; 