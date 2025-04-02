-- Création de la table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    label_fr VARCHAR(255) NOT NULL,
    label_en VARCHAR(255),
    description_fr TEXT,
    description_en TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création des tables de liaison
CREATE TABLE IF NOT EXISTS period_categories (
    period_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (period_id, category_id)
);

CREATE TABLE IF NOT EXISTS event_categories (
    event_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (event_id, category_id)
);

CREATE TABLE IF NOT EXISTS story_categories (
    story_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (story_id, category_id)
);

-- Création des index
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_period_categories_period_id ON period_categories(period_id);
CREATE INDEX IF NOT EXISTS idx_period_categories_category_id ON period_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_event_id ON event_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_category_id ON event_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_story_categories_story_id ON story_categories(story_id);
CREATE INDEX IF NOT EXISTS idx_story_categories_category_id ON story_categories(category_id);

-- Attribution des privilèges sur les tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO categories_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO categories_user;

-- Insertion des catégories initiales
-- Sciences de l'Univers
INSERT INTO categories (label_fr, label_en, parent_id) VALUES
('Sciences de l''Univers', 'Universe Sciences', NULL);

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Cosmologie', 'Cosmology', id FROM categories WHERE label_fr = 'Sciences de l''Univers';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Astrophysique', 'Astrophysics', id FROM categories WHERE label_fr = 'Sciences de l''Univers';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Physique Théorique', 'Theoretical Physics', id FROM categories WHERE label_fr = 'Sciences de l''Univers';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Physique des Particules', 'Particle Physics', id FROM categories WHERE label_fr = 'Sciences de l''Univers';

-- Sciences de la Vie
INSERT INTO categories (label_fr, label_en, parent_id) VALUES
('Sciences de la Vie', 'Life Sciences', NULL);

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Biologie Évolutive', 'Evolutionary Biology', id FROM categories WHERE label_fr = 'Sciences de la Vie';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Paléontologie', 'Paleontology', id FROM categories WHERE label_fr = 'Sciences de la Vie';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Botanique', 'Botany', id FROM categories WHERE label_fr = 'Sciences de la Vie';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Microbiologie', 'Microbiology', id FROM categories WHERE label_fr = 'Sciences de la Vie';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Écologie', 'Ecology', id FROM categories WHERE label_fr = 'Sciences de la Vie';

-- Sciences de la Terre
INSERT INTO categories (label_fr, label_en, parent_id) VALUES
('Sciences de la Terre', 'Earth Sciences', NULL);

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Géologie', 'Geology', id FROM categories WHERE label_fr = 'Sciences de la Terre';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Chimie', 'Chemistry', id FROM categories WHERE label_fr = 'Sciences de la Terre';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Océanographie', 'Oceanography', id FROM categories WHERE label_fr = 'Sciences de la Terre';

-- Sciences Humaines et Sociales
INSERT INTO categories (label_fr, label_en, parent_id) VALUES
('Sciences Humaines et Sociales', 'Human and Social Sciences', NULL);

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Histoire et Civilisations', 'History and Civilizations', id FROM categories WHERE label_fr = 'Sciences Humaines et Sociales';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Anthropologie et Archéologie', 'Anthropology and Archaeology', id FROM categories WHERE label_fr = 'Sciences Humaines et Sociales';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Religion et Philosophie', 'Religion and Philosophy', id FROM categories WHERE label_fr = 'Sciences Humaines et Sociales';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Art et Culture', 'Art and Culture', id FROM categories WHERE label_fr = 'Sciences Humaines et Sociales';

INSERT INTO categories (label_fr, label_en, parent_id) 
SELECT 'Économie', 'Economics', id FROM categories WHERE label_fr = 'Sciences Humaines et Sociales';

-- Technologie
INSERT INTO categories (label_fr, label_en, parent_id) VALUES
('Technologie et Innovations', 'Technology and Innovations', NULL); 