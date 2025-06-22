-- Migration pour ajouter les relations catégories
-- Date: 2025-06-17

-- Table de liaison pour les périodes et catégories
CREATE TABLE IF NOT EXISTS period_categories (
    period_id VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (period_id, category_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories.categories(id) ON DELETE CASCADE
);

-- Table de liaison pour les événements et catégories
CREATE TABLE IF NOT EXISTS event_categories (
    event_id VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, category_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories.categories(id) ON DELETE CASCADE
);

-- Table de liaison pour les stories et catégories
CREATE TABLE IF NOT EXISTS story_categories (
    story_id INTEGER NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, category_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories.categories(id) ON DELETE CASCADE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_period_categories_period_id ON period_categories(period_id);
CREATE INDEX IF NOT EXISTS idx_period_categories_category_id ON period_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_event_id ON event_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_category_id ON event_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_story_categories_story_id ON story_categories(story_id);
CREATE INDEX IF NOT EXISTS idx_story_categories_category_id ON story_categories(category_id);

-- Commentaires pour la documentation
COMMENT ON TABLE period_categories IS 'Table de liaison entre périodes et catégories (relation many-to-many)';
COMMENT ON TABLE event_categories IS 'Table de liaison entre événements et catégories (relation many-to-many)';
COMMENT ON TABLE story_categories IS 'Table de liaison entre stories et catégories (relation many-to-many)'; 