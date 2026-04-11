# Documentation Base de Données et Serveur

## Architecture

### Stack Technologique
- **Base de données** : PostgreSQL avec schémas multiples
- **Backend** : Node.js + Express + TypeScript
- **ORM** : Prisma (pour Events) + requêtes SQL directes
- **API** : REST avec support multilingue
- **Containerisation** : Docker avec docker-compose

### Structure du dépôt (extraits utiles)
```
web-chronologie-univers-2/
├── server/
│   ├── src/api/
│   │   ├── database.ts    # Pool PostgreSQL (`pg`)
│   │   └── routes.ts      # Routes REST (source de vérité des endpoints)
│   └── prisma/
│       └── schema.prisma  # modèle partiel — voir ci-dessous
├── database/
│   ├── supabase-init.sql  # script de référence principal (schémas periods, events, stories, categories)
│   ├── init-all.sql       # variante / import complet selon procédure d’install
│   ├── migrations/        # migrations SQL complémentaires (UUID, contraintes, etc.)
│   └── …
├── config/                # gabarits pgAdmin (optionnel — voir section ci-dessous)
└── docker-compose.yml
```

### Config pgAdmin et lockfile parasite

- **`config/servers.json`** et **`config/passwords.json`** : gabarits **pgAdmin** (multi-connexions). Le **`docker-compose.yml`** racine ne démarre **pas** pgAdmin ni ces hôtes ; rien ne monte automatiquement ces fichiers — à n’utiliser que si vous recréez vous‑même une stack avec pgAdmin (copie vers `/pgadmin4/` dans le conteneur).
- **`database/init-pgadmin.sh`** : même contexte (init pgAdmin), inutile sans service pgAdmin.
- **`yarn 2.lock`** : nom parfois créé par l’OS en doublon ; **Yarn ne lit que** `yarn.lock` et `server/yarn.lock` — à supprimer s’il apparaît.

**Source de vérité schéma** : ne pas dupliquer ici des `CREATE TABLE` qui vieillissent — utiliser **`database/supabase-init.sql`** puis les scripts sous **`database/migrations/`** selon l’environnement. Les colonnes exactes (ex. `has_parent`, `children` jsonb, types d’`id` story après migration UUID) dépendent des migrations appliquées.

Exemple (extrait **indicatif** de `supabase-init.sql` pour `periods.periods`, sans engagement sur un déploiement déjà migré) : `start_date` / `end_date` en **`text`**, `has_parent` **boolean**, `children` **jsonb** — pas de `parent_id` dans ce dump initial ; l’API Express actuelle peut cependant s’appuyer sur une colonne `parent_id` selon votre base réelle (`server/src/api/routes.ts`).

### Prisma
Le fichier **`server/prisma/schema.prisma`** est un **vestige partiel** (ex. modèle `Event` simplifié) : **il ne reflète pas** l’ensemble du modèle métier servi par l’API. L’application métier passe par du **SQL** dans **`routes.ts`** / requêtes paramétrées. Ne pas se baser sur le seul extrait Prisma du dépôt pour décrire la production.

### Schéma Prisma (non représentatif de la prod)
> **Note** : bloc retiré — voir `server/prisma/schema.prisma` pour l’état exact du fichier ; pour les données réelles, se référer au SQL versionné ci-dessus.

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

**Liste exhaustive et à jour** : `server/src/api/routes.ts`.

Exemples courants (non exhaustif) :
- **Périodes** : `GET /api/periods`, `GET /api/periods/:id`, `GET /api/periods/:id/children`, `POST` / `PUT` / routes Wikidata, mise à jour parent (`PUT` ou route dédiée selon version).
- **Événements** : `GET/POST/PUT/DELETE /api/events/…`
- **Stories** : `GET/POST/PUT/DELETE /api/stories/…`, liaisons périodes / événements, **`GET /api/stories/temporal-bounds`**
- **Recherche** : `GET /api/search`
- **Wikidata** : proxy SPARQL / wbsearchentities selon routes définies dans `routes.ts`
- **Catégories** : `GET /api/categories`

## Configuration

### Base de Données
```typescript
// server/src/api/database.ts (extraits représentatifs)
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'wikidata_user',
  password: process.env.DB_PASSWORD || 'wikidata_password',
  database: process.env.DB_NAME || 'wikidata_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
```

Les options `max`, `idleTimeoutMillis`, etc. **ne sont pas** définies dans l’extrait actuel du fichier — ne pas inventer de chiffres ici ; les ajouter à la doc seulement s’ils sont réellement présents dans le code.

### Variables d'Environnement
```bash
DATABASE_URL=postgresql://wikidata_user:wikidata_password@localhost:5432/wikidata_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wikidata_db
DB_USER=wikidata_user
DB_PASSWORD=wikidata_password
DB_SSL=false
NODE_ENV=development
PORT=3000
```

## Index et Performance

### Index
Les index réels et leurs noms qualifiés par schéma (`categories.*`, `periods.*`, …) figurent dans **`database/supabase-init.sql`** et les **migrations**. Vérifier sur la base déployée avant de s’appuyer sur un nom d’index précis.

### Optimisations
- **Pool** : taille gérée par défaut du client `pg` (voir `database.ts`)
- **Index composites** : Pour les requêtes de jointure
- **Contraintes d'intégrité** : Clés étrangères et UNIQUE
- **Triggers** : Mise à jour automatique des timestamps

## Scripts et Migrations

### Initialisation
```bash
# Exemple : appliquer le script principal (adapter le conteneur / user / DB)
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < database/supabase-init.sql

# Variante / jeu complet selon procédure interne
# docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < database/init-all.sql

# Import des données
./database/import_data.sh

# Scripts de migration (exemple présent dans le dépôt)
./database/migrate_to_iso8602.sh
# + scripts sous database/migrations/ selon besoin
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
- **Validation des données** : côté client et serveur
- **Logs** : principalement `console` côté serveur ; pas de couche unique « logging structuré » documentée ici
- **Retry automatique** : pour certaines opérations critiques (Wikidata, etc.)
- **Fallbacks** : valeurs par défaut en cas d'échec

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
Objectifs ou mesures **non centralisés** dans ce dépôt — toute valeur chiffrée doit être vérifiée sur l’environnement cible.

### Logs
Journalisation ad hoc (`console`, gestion d’erreurs dans les routes) ; pas de catalogue unique des champs de log. 