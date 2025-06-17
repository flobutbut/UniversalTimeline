-- 1. Création des tables de mapping pour chaque entité
CREATE TABLE IF NOT EXISTS categories.categories_id_mapping (
    old_id VARCHAR(255) PRIMARY KEY,
    new_id UUID DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE IF NOT EXISTS events.events_id_mapping (
    old_id VARCHAR(255) PRIMARY KEY,
    new_id UUID DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE IF NOT EXISTS periods.periods_id_mapping (
    old_id VARCHAR(255) PRIMARY KEY,
    new_id UUID DEFAULT gen_random_uuid() NOT NULL
);

-- 2. Remplissage des tables de mapping
INSERT INTO categories.categories_id_mapping (old_id)
SELECT id FROM categories.categories
ON CONFLICT DO NOTHING;

INSERT INTO events.events_id_mapping (old_id)
SELECT id FROM events.events
ON CONFLICT DO NOTHING;

INSERT INTO periods.periods_id_mapping (old_id)
SELECT id FROM periods.periods
ON CONFLICT DO NOTHING;

-- 3. Mise à jour des IDs dans les tables principales
UPDATE categories.categories AS c
SET id = m.new_id
FROM categories.categories_id_mapping AS m
WHERE c.id::text = m.old_id;

UPDATE events.events AS e
SET id = m.new_id
FROM events.events_id_mapping AS m
WHERE e.id::text = m.old_id;

UPDATE periods.periods AS p
SET id = m.new_id
FROM periods.periods_id_mapping AS m
WHERE p.id::text = m.old_id;

-- 4. Mise à jour des parent_id dans categories.categories
UPDATE categories.categories AS c
SET parent_id = m.new_id
FROM categories.categories_id_mapping AS m
WHERE c.parent_id::text = m.old_id;

-- 5. Mise à jour des références dans event_categories
UPDATE categories.event_categories AS ec
SET event_id = m.new_id
FROM events.events_id_mapping AS m
WHERE ec.event_id::text = m.old_id;

UPDATE categories.event_categories AS ec
SET category_id = m.new_id
FROM categories.categories_id_mapping AS m
WHERE ec.category_id::text = m.old_id;

-- 6. Mise à jour des références dans period_categories
UPDATE categories.period_categories AS pc
SET period_id = m.new_id
FROM periods.periods_id_mapping AS m
WHERE pc.period_id::text = m.old_id;

UPDATE categories.period_categories AS pc
SET category_id = m.new_id
FROM categories.categories_id_mapping AS m
WHERE pc.category_id::text = m.old_id;

-- 7. Mise à jour des références dans story_categories
UPDATE categories.story_categories AS sc
SET category_id = m.new_id
FROM categories.categories_id_mapping AS m
WHERE sc.category_id::text = m.old_id;

-- 8. Mise à jour des références dans story_events
UPDATE stories.story_events AS se
SET event_id = m.new_id
FROM events.events_id_mapping AS m
WHERE se.event_id::text = m.old_id;

-- 9. Mise à jour des références dans story_periods
UPDATE stories.story_periods AS sp
SET period_id = m.new_id
FROM periods.periods_id_mapping AS m
WHERE sp.period_id::text = m.old_id;

-- 10. Vérification des mappings
SELECT 'Categories mapping' as mapping_type, COUNT(*) as count FROM categories.categories_id_mapping
UNION ALL
SELECT 'Events mapping', COUNT(*) FROM events.events_id_mapping
UNION ALL
SELECT 'Periods mapping', COUNT(*) FROM periods.periods_id_mapping; 