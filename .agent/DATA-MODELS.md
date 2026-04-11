> Généré le : 2026-04-11 — Source : analyse du code source

# Modèles de données

## Types TypeScript principaux (`src/types/database.ts`)

Interfaces et types exportés observés :

- **`ListPeriod`, `ListEvent`, `ListStory`** : formes « liste » (id UUID, labels multilingues, dates, catégories, champs optionnels enrichis côté client comme `parentId`, `hasChildren`, `wikidata_id`, années BP).
- **`MultilingualText`** : `{ fr: string; en: string }`.
- **`Category`** : `id`, `label`, `description?`.
- **`Period`, `Event`, `Story`** : entités détaillées (relations `children`, `periods`, `events`, etc.).
- **`StoryElement`, `StoryAnnotation`** : liaisons / annotations.
- **Requêtes** : `CreateStoryRequest`, `AddElementToStoryRequest`, `UpdatePeriodParentRequest`, `AddAnnotationRequest`.

## Types complémentaires (fichiers séparés)

- **`src/types/periodTree.ts`** : `StoryPeriodInput`, `PeriodTreeNode` (arbre hiérarchique pour l’UI story).
- **`src/types/graph.ts`** : `GraphPeriod`, `GraphLink` (finder / graphe).
- **`src/types/global.d.ts`** : extensions `Window` (`toast`, `showToast`, `showConfirm`) ; type `Tab` pour les onglets.

Types Wikidata / géologie : `src/types/geological.ts` (référencé par `WikidataQueryService` et le serveur `server/src/types/geological.ts` — contenu : non déterminé ligne par ligne dans cette passe).

## Schémas de réponses API (extrait du code observé)

Le frontend appelle `baseURL: '/api'` ; le serveur monte le routeur sur `/api` (`server/src/index.ts`), donc les chemins ci-dessous sont relatifs à `/api`.

### Recherche

- **`GET /search?q=`** — corps JSON observé dans `SearchApiService.ts` : `{ periods: [...], events: [...] }` avec champs typés côté client (`id`, `wikidataId`, `label`, dates pour les périodes, `date` pour les événements).

### Périodes

- **`GET /periods`** : tableau ; éléments mappés par `mapToPeriod` (champs snake_case API → camelCase client : `label_fr` / `start_date` / `parent_id` / `has_children` / etc.).
- **`GET /periods/:id`**, **`GET /periods/wikidata/:wikidataId`** : objet période détaillé (voir réponses construites dans `server/src/api/routes.ts`).
- **`GET /periods/:id/children`** : tableau d’enfants (même style agrégé catégories que la liste racine).
- **`PATCH /periods/:id/parent`** : body `{ parent_id }` (nom observé dans `PeriodApiService.updateParent`).

### Événements

- **`GET /events`** : tableau d’événements avec `label`, `description?`, `date`, `categories`, etc. (mapping dans les services / store selon les usages).

### Stories

- **`GET /stories`** : liste avec `title_fr` / champs SQL exposés puis consommés côté client (voir `StoryApiService` pour le mapping exact).
- **`GET /stories/temporal-bounds`** : lignes `{ story_id, start_date, end_date }` (observé dans le SQL du routeur).
- **`GET /stories/:id`** : objet story avec `title`, `description`, `author`, `isPublic`, `categories`, `periods[]`, `events[]` (construction dans `routes.ts`).

### Catégories

- **`GET /categories`** : lignes `id`, `label_fr`, `description_fr` (réponse SQL brute partielle selon route).

### Wikidata (frontend)

- **SPARQL** : URL déterminée dans `WikidataQueryService` (`VITE_WIKIDATA_SPARQL_URL` ou proxy `/api/wikidata/sparql` en dev). Forme des résultats : spécifique aux requêtes du service — non résumé ici.

## Relations entre entités (observées dans le SQL / types)

- **Période** ↔ **parent** : `parent_id` sur `periods`.
- **Période / événement** ↔ **catégories** : tables de liaison `period_categories`, `event_categories`.
- **Story** ↔ **périodes / événements** : `story_periods`, `story_events` ; **story** ↔ **catégories** : `story_categories`.

Prisma (`server/prisma/schema.prisma`) peut détailler le schéma relationnel complet — **non relu** pour ce document : compléter manuellement si besoin d’une stricte équivalence ORM.
