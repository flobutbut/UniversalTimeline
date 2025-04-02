-- Création de la base de données
CREATE DATABASE stories_db;

-- Connexion à la base de données
\c stories_db

-- Création de l'utilisateur
CREATE USER stories_user WITH PASSWORD 'stories_password';

-- Attribution des privilèges
GRANT ALL PRIVILEGES ON DATABASE stories_db TO stories_user;

-- Création des tables
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    title_fr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    author VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE story_periods (
    story_id INTEGER,
    period_id VARCHAR(255),
    PRIMARY KEY (story_id, period_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

CREATE TABLE story_events (
    story_id INTEGER,
    event_id VARCHAR(255),
    PRIMARY KEY (story_id, event_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- Création des index
CREATE INDEX idx_story_periods ON story_periods(story_id, period_id);
CREATE INDEX idx_story_events ON story_events(story_id, event_id);

-- Attribution des privilèges sur les tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stories_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stories_user; 