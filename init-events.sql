-- Création de la base de données
CREATE DATABASE events_db;

-- Connexion à la base de données
\c events_db

-- Création de l'utilisateur
CREATE USER events_user WITH PASSWORD 'events_password';

-- Attribution des privilèges
GRANT ALL PRIVILEGES ON DATABASE events_db TO events_user;

-- Création des tables
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Création des index
CREATE INDEX idx_events_date ON events(date);

-- Attribution des privilèges sur les tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO events_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO events_user; 