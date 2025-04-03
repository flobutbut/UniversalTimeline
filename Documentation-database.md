# Documentation des Bases de Données

## Structure des Bases de Données

### Base de Données des Catégories (categories_db)

#### Table `categories`
- **Description** : Stocke les informations sur les catégories
- **Port** : 5435
- **Utilisateur** : categories_user
- **Mot de passe** : categories_password

| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR(255) | Identifiant unique de la catégorie |
| label_fr | TEXT | Label en français |
| label_en | TEXT | Label en anglais |
| description_fr | TEXT | Description en français |
| description_en | TEXT | Description en anglais |
| parent_id | VARCHAR(255) | ID de la catégorie parente |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

#### Tables de Liaison
- **Description** : Tables de liaison entre catégories et autres entités

| Table | Description | Colonnes |
|-------|-------------|-----------|
| period_categories | Lie les périodes aux catégories | period_id, category_id |
| event_categories | Lie les événements aux catégories | event_id, category_id |
| story_categories | Lie les stories aux catégories | story_id, category_id |

### Base de Données des Périodes (periods_db)

#### Table `periods`
- **Description** : Stocke les informations sur les périodes
- **Port** : 5432
- **Utilisateur** : periods_user
- **Mot de passe** : periods_password

| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR(255) | Identifiant unique de la période |
| wikidata_id | VARCHAR(255) | Identifiant Wikidata (QID) |
| label_fr | TEXT | Label en français |
| label_en | TEXT | Label en anglais |
| description_fr | TEXT | Description en français |
| description_en | TEXT | Description en anglais |
| start_date | TIMESTAMP | Date de début (format ISO 8601) |
| end_date | TIMESTAMP | Date de fin (format ISO 8601) |
| parent_id | VARCHAR(255) | ID de la période parente |
| temporal_location | VARCHAR(255) | Localisation temporelle |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Base de Données des Événements (events_db)

#### Table `events`
- **Description** : Stocke les informations sur les événements
- **Port** : 5433
- **Utilisateur** : events_user
- **Mot de passe** : events_password

| Colonne | Type | Description |
|---------|------|-------------|
| id | VARCHAR(255) | Identifiant unique de l'événement |
| wikidata_id | VARCHAR(255) | Identifiant Wikidata (QID) |
| label_fr | TEXT | Label en français |
| label_en | TEXT | Label en anglais |
| description_fr | TEXT | Description en français |
| description_en | TEXT | Description en anglais |
| date | TIMESTAMP | Date de l'événement (format ISO 8601) |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Base de Données des Stories (stories_db)

#### Table `stories`
- **Description** : Stocke les informations sur les stories créées par les utilisateurs
- **Port** : 5434
- **Utilisateur** : stories_user
- **Mot de passe** : stories_password

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique de la story |
| title_fr | TEXT | Titre en français |
| title_en | TEXT | Titre en anglais |
| description_fr | TEXT | Description en français |
| description_en | TEXT | Description en anglais |
| author | VARCHAR(255) | Auteur de la story |
| is_public | BOOLEAN | Visibilité de la story |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

#### Table `story_periods`
- **Description** : Table de liaison entre stories et périodes

| Colonne | Type | Description |
|---------|------|-------------|
| story_id | INTEGER | ID de la story |
| period_id | VARCHAR(255) | ID de la période |

#### Table `story_events`
- **Description** : Table de liaison entre stories et événements

| Colonne | Type | Description |
|---------|------|-------------|
| story_id | INTEGER | ID de la story |
| event_id | VARCHAR(255) | ID de l'événement |

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
  wikidataId: string;
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string; // Format ISO 8601
  endDate: string;   // Format ISO 8601
  parentId: string | null;
  temporalLocation: string;
  categories: Category[];
  children: Period[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Types pour les Événements
```typescript
interface Event {
  id: string;
  wikidataId: string;
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
  id: number;
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

## Contraintes et Indexes

### Base de Données des Catégories
- Index sur `id`
- Index sur `parent_id` pour la hiérarchie des catégories
- Index sur les tables de liaison :
  - `period_categories(period_id, category_id)`
  - `event_categories(event_id, category_id)`
  - `story_categories(story_id, category_id)`
- Contrainte de clé étrangère sur `parent_id` pour la hiérarchie

### Base de Données des Périodes
- Index sur `id`
- Index sur `wikidata_id`
- Index sur `parent_id`
- Index sur `start_date` et `end_date`
- Contrainte UNIQUE sur `wikidata_id`

### Base de Données des Événements
- Index sur `id`
- Index sur `wikidata_id`
- Index sur `date`
- Contrainte UNIQUE sur `wikidata_id`

### Base de Données des Stories
- Index sur `story_periods(story_id, period_id)`
- Index sur `story_events(story_id, event_id)`

## Notes d'Utilisation

1. Toutes les dates sont stockées au format ISO 8601 pour une meilleure manipulation
2. La hiérarchie des périodes est gérée via le champ `parent_id`
3. La hiérarchie des catégories est gérée via le champ `parent_id` dans la table `categories`
4. Les stories peuvent contenir à la fois des périodes et des événements
5. Toutes les entités (périodes, événements, stories) peuvent appartenir à plusieurs catégories
6. Toutes les tables incluent des timestamps de création et de mise à jour
7. Les identifiants Wikidata (QID) sont stockés dans le champ `wikidata_id` et doivent être uniques 