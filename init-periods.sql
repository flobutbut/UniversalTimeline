-- Création de la base de données
CREATE DATABASE periods_db;

-- Connexion à la base de données
\c periods_db

-- Création de l'utilisateur
CREATE USER periods_user WITH PASSWORD 'periods_password';

-- Attribution des privilèges
GRANT ALL PRIVILEGES ON DATABASE periods_db TO periods_user;

-- Création des tables
CREATE TABLE periods (
    id VARCHAR(255) PRIMARY KEY,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    parent_id VARCHAR(255),
    temporal_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES periods(id)
);

-- Création des index
CREATE INDEX idx_periods_parent_id ON periods(parent_id);
CREATE INDEX idx_periods_dates ON periods(start_date, end_date);

-- Attribution des privilèges sur les tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO periods_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO periods_user; 