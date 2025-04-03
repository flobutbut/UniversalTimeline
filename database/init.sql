-- Base de données des périodes
CREATE TABLE IF NOT EXISTS periods (
    id VARCHAR(50) PRIMARY KEY,
    label_fr VARCHAR(255),
    label_en VARCHAR(255),
    description_fr TEXT,
    description_en TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    parent_id VARCHAR(50),
    category VARCHAR(100),
    temporal_location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_periods_parent_id ON periods(parent_id);
CREATE INDEX IF NOT EXISTS idx_periods_category ON periods(category);
CREATE INDEX IF NOT EXISTS idx_periods_temporal_location ON periods(temporal_location);

-- Base de données des événements
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    label_fr VARCHAR(255),
    label_en VARCHAR(255),
    description_fr TEXT,
    description_en TEXT,
    date VARCHAR(50),
    period_id VARCHAR(50),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES periods(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_events_period_id ON events(period_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category); 