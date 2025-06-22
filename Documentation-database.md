# Documentation Base de Données et Serveur

## Architecture

### Stack Technologique
- **Base de données** : PostgreSQL avec schémas multiples
- **Backend** : Node.js + Express + TypeScript
- **ORM** : Prisma (pour Events) + requêtes SQL directes
- **API** : REST avec support multilingue
- **Containerisation** : Docker avec docker-compose

### Structure du Projet
```
api_Wikidata/
├── server/                # Backend Express
│   ├── src/
│   │   ├── api/           # Routes et configuration DB
│   │   │   ├── database.ts    # Configuration PostgreSQL
│   │   │   └── routes.ts      # Routes de l'API
│   │   └── types/        # Types TypeScript
│   └── prisma/            # Schéma Prisma (Events)
├── database/              # Scripts SQL et migrations
│   ├── init-all.sql       # Initialisation complète
│   ├── migrations/        # Migrations PostgreSQL
│   └── backups/           # Sauvegardes
└── docker-compose.yml     # Configuration Docker
```

## Base de Données PostgreSQL

### Schémas et Tables

#### Schéma `categories`
```sql
CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    parent_id VARCHAR(255) REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables de liaison
CREATE TABLE period_categories (period_id VARCHAR(255), category_id VARCHAR(255));
CREATE TABLE event_categories (event_id VARCHAR(255), category_id VARCHAR(255));
CREATE TABLE story_categories (story_id INTEGER, category_id VARCHAR(255));
```

#### Schéma `periods`
```sql
CREATE TABLE periods (
    id VARCHAR(255) PRIMARY KEY,
    wikidata_id VARCHAR(255) UNIQUE NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    parent_id VARCHAR(255) REFERENCES periods(id),
    temporal_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Schéma `events`
```sql
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    wikidata_id VARCHAR(255) UNIQUE NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Schéma `stories`
```sql
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    title_fr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    author VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables de liaison
CREATE TABLE story_periods (story_id INTEGER, period_id VARCHAR(255));
CREATE TABLE story_events (story_id INTEGER, event_id VARCHAR(255));
```

### Schéma Prisma (Events)
```prisma
model Event {
  id          String   @id @default(uuid())
  wikidataId  String?
  label       String
  date        String?
  description String?
  category    String?
  source      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Types TypeScript

### Types Communs
```typescript
interface MultilingualText {
  fr: string;
  en: string;
}

interface Category {
  id: string;
  label: MultilingualText;
  description?: MultilingualText;
  parentId?: string | null;
}
```

### Types pour les Périodes
```typescript
interface Period {
  id: string;
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string; // Format ISO 8601
  endDate: string;   // Format ISO 8601
  hasParent: boolean;
  children: string[];
  temporalLocation: string;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Types pour les Événements
```typescript
interface Event {
  id: string;
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  date: string;      // Format ISO 8601
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Types pour les Stories
```typescript
interface Story {
  id: string;
  title: MultilingualText;
  description?: MultilingualText;
  author: string;
  isPublic: boolean;
  categories: Category[];
  periods: Period[];
  events: Event[];
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Périodes
- `GET /api/periods` : Liste des périodes racines
- `GET /api/periods/:id` : Détails d'une période
- `POST /api/periods` : Création d'une période
- `PUT /api/periods/:id` : Modification d'une période
- `GET /api/periods/wikidata/:wikidataId` : Recherche par Wikidata ID

### Événements
- `GET /api/events` : Liste des événements
- `POST /api/events` : Création d'un événement
- `PUT /api/events/:id` : Modification d'un événement
- `DELETE /api/events/:id` : Suppression d'un événement

### Stories
- `GET /api/stories` : Liste des stories
- `GET /api/stories/:id` : Détails d'une story
- `POST /api/stories` : Création d'une story
- `DELETE /api/stories/:id` : Suppression d'une story
- `GET /api/stories/:storyId/periods` : Périodes d'une story
- `GET /api/stories/:storyId/events` : Événements d'une story
- `POST /api/stories/:storyId/periods/:periodId` : Ajouter période à story
- `POST /api/stories/:storyId/events/:eventId` : Ajouter événement à story
- `DELETE /api/stories/:storyId/periods/:periodId` : Retirer période de story
- `DELETE /api/stories/:storyId/events/:eventId` : Retirer événement de story

### Catégories
- `GET /api/categories` : Liste des catégories

## Configuration

### Base de Données
```typescript
// server/src/api/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wikidata_db',
  user: process.env.DB_USER || 'wikidata_user',
  password: process.env.DB_PASSWORD || 'wikidata_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Variables d'Environnement
```bash
DATABASE_URL=postgresql://wikidata_user:wikidata_password@localhost:5432/wikidata_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wikidata_db
DB_USER=wikidata_user
DB_PASSWORD=wikidata_password
NODE_ENV=development
PORT=3000
```

## Index et Performance

### Index Principaux
```sql
-- Categories
CREATE INDEX idx_categories_parent_id ON categories.categories(parent_id);

-- Periods
CREATE INDEX idx_periods_parent_id ON periods.periods(parent_id);
CREATE INDEX idx_periods_dates ON periods.periods(start_date, end_date);
CREATE INDEX idx_periods_wikidata_id ON periods.periods(wikidata_id);

-- Events
CREATE INDEX idx_events_date ON events.events(date);
CREATE INDEX idx_events_wikidata_id ON events.events(wikidata_id);

-- Tables de liaison
CREATE INDEX idx_period_categories ON categories.period_categories(period_id, category_id);
CREATE INDEX idx_event_categories ON categories.event_categories(event_id, category_id);
CREATE INDEX idx_story_categories ON categories.story_categories(story_id, category_id);
CREATE INDEX idx_story_periods ON stories.story_periods(story_id, period_id);
CREATE INDEX idx_story_events ON stories.story_events(story_id, event_id);
```

### Optimisations
- **Pool de connexions** : Maximum 20 connexions simultanées
- **Index composites** : Pour les requêtes de jointure
- **Contraintes d'intégrité** : Clés étrangères et UNIQUE
- **Triggers** : Mise à jour automatique des timestamps

## Scripts et Migrations

### Initialisation
```bash
# Initialisation complète de la base de données
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < database/init-all.sql

# Import des données
./database/import_data.sh

# Migrations
./database/migrate_to_iso8602.sh
```

### Sauvegardes
```bash
# Sauvegarde automatique
docker exec wikidata_db pg_dump -U wikidata_user wikidata_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restauration
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < backup_file.sql
```

## Fonctionnalités Spéciales

### Intégration Wikidata
- **Récupération automatique des dates** : Pour les événements sans date
- **Rate limiting** : Délais entre requêtes Wikidata
- **Retry automatique** : En cas d'erreur 429 (rate limit)
- **Cache** : Évite les requêtes répétées

### Support Multilingue
- **Labels et descriptions** : Français et anglais
- **Détection automatique** : Langue de recherche
- **Fallback** : Anglais si français non disponible

### Gestion des Erreurs
- **Validation des données** : Côté client et serveur
- **Logs structurés** : Traçabilité complète
- **Retry automatique** : Pour les opérations critiques
- **Fallbacks** : Valeurs par défaut en cas d'échec

## Sécurité

### Base de Données
- **Utilisateur dédié** : Permissions minimales
- **Validation des entrées** : Protection contre les injections SQL
- **Contraintes d'intégrité** : Cohérence des données
- **Sauvegardes régulières** : Récupération en cas de problème

### API
- **Validation des entrées** : Sanitisation des données
- **Gestion des erreurs** : Messages d'erreur appropriés
- **Rate limiting** : Protection contre les abus
- **CORS configuré** : Sécurité des requêtes cross-origin

## Monitoring

### Métriques
- **Temps de réponse** : < 100ms pour les requêtes simples
- **Connexions DB** : Monitoring du pool de connexions
- **Requêtes Wikidata** : Suivi des timeouts et erreurs
- **Utilisation mémoire** : Surveillance des fuites

### Logs
- **Requêtes API** : Traçabilité complète
- **Erreurs DB** : Logs détaillés des erreurs
- **Requêtes Wikidata** : Suivi des performances
- **Opérations critiques** : Création, modification, suppression 