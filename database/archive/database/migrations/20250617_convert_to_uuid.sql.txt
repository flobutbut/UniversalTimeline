-- Conversion des colonnes id et parent_id en UUID
SET search_path TO events, periods, categories, stories;

-- Conversion de la table events
ALTER TABLE events.events 
    ALTER COLUMN id TYPE uuid USING id::uuid;

-- Conversion de la table periods
ALTER TABLE periods.periods 
    ALTER COLUMN id TYPE uuid USING id::uuid;

-- Conversion de la table categories
ALTER TABLE categories.categories 
    ALTER COLUMN id TYPE uuid USING id::uuid,
    ALTER COLUMN parent_id TYPE uuid USING parent_id::uuid;

-- Conversion des tables de liaison
ALTER TABLE categories.event_categories 
    ALTER COLUMN event_id TYPE uuid USING event_id::uuid,
    ALTER COLUMN category_id TYPE uuid USING category_id::uuid;

ALTER TABLE categories.period_categories 
    ALTER COLUMN period_id TYPE uuid USING period_id::uuid,
    ALTER COLUMN category_id TYPE uuid USING category_id::uuid;

ALTER TABLE categories.story_categories 
    ALTER COLUMN category_id TYPE uuid USING category_id::uuid;

ALTER TABLE stories.story_events 
    ALTER COLUMN event_id TYPE uuid USING event_id::uuid;

ALTER TABLE stories.story_periods 
    ALTER COLUMN period_id TYPE uuid USING period_id::uuid;

-- Détection des données orphelines
-- Catégories sans parent valide
SELECT id, parent_id FROM categories.categories WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM categories.categories);
-- event_categories orphelins
SELECT event_id, category_id FROM categories.event_categories WHERE event_id NOT IN (SELECT id FROM events.events) OR category_id NOT IN (SELECT id FROM categories.categories);
-- period_categories orphelins
SELECT period_id, category_id FROM categories.period_categories WHERE period_id NOT IN (SELECT id FROM periods.periods) OR category_id NOT IN (SELECT id FROM categories.categories);
-- story_events orphelins
SELECT story_id, event_id FROM stories.story_events WHERE event_id NOT IN (SELECT id FROM events.events);
-- story_periods orphelins
SELECT story_id, period_id FROM stories.story_periods WHERE period_id NOT IN (SELECT id FROM periods.periods);

-- Mise à jour des contraintes de clé étrangère
ALTER TABLE categories.categories 
    DROP CONSTRAINT IF EXISTS categories_parent_id_fkey,
    ADD CONSTRAINT categories_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES categories.categories(id);

ALTER TABLE categories.event_categories 
    DROP CONSTRAINT IF EXISTS event_categories_event_id_fkey,
    ADD CONSTRAINT event_categories_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events.events(id),
    DROP CONSTRAINT IF EXISTS event_categories_category_id_fkey,
    ADD CONSTRAINT event_categories_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories.categories(id);

ALTER TABLE categories.period_categories 
    DROP CONSTRAINT IF EXISTS period_categories_period_id_fkey,
    ADD CONSTRAINT period_categories_period_id_fkey 
    FOREIGN KEY (period_id) REFERENCES periods.periods(id),
    DROP CONSTRAINT IF EXISTS period_categories_category_id_fkey,
    ADD CONSTRAINT period_categories_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories.categories(id);

ALTER TABLE stories.story_events 
    DROP CONSTRAINT IF EXISTS story_events_event_id_fkey,
    ADD CONSTRAINT story_events_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events.events(id);

ALTER TABLE stories.story_periods 
    DROP CONSTRAINT IF EXISTS story_periods_period_id_fkey,
    ADD CONSTRAINT story_periods_period_id_fkey 
    FOREIGN KEY (period_id) REFERENCES periods.periods(id); 