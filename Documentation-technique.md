# Documentation Technique

## Stack Technique
- Frontend :
  - Vue.js 3
  - TypeScript
  - Vite
  - CSS
- Backend :
  - Node.js avec Express.js
  - TypeScript
  - PostgreSQL
  - Docker
- Outils :
  - Yarn
  - Docker Compose
  - pgAdmin

## Structure du Projet
```
api_Wikidata/
├─ _datas_/               # Données sources JSON
├─ config/               # Configuration (mots de passe, serveurs)
├─ database/            # Scripts SQL et shell
├─ dist/                # Build de production
├─ public/              # Assets statiques
├─ server/              # Backend Express
│  ├─ src/
│  │  ├─ api/          # Routes et configuration DB
│  │  ├─ types/        # Types TypeScript
│  │  └─ index.ts      # Point d'entrée
│  └─ package.json
└─ src/                 # Frontend Vue
   ├─ assets/          # Ressources statiques
   ├─ components/      # Composants Vue
   ├─ services/        # Services (API, Wikidata)
   ├─ styles/          # Styles CSS
   ├─ types/           # Types TypeScript
   ├─ utils/           # Utilitaires
   ├─ App.vue
   └─ main.ts
```

## Configuration
- Frontend :
  - Vite pour le bundling
  - TypeScript strict
  - CSS modulaire
  - Tests avec Vitest
- Backend :
  - Express.js avec TypeScript
  - PostgreSQL avec Docker
  - Support multilingue (fr, en)

## Architecture

Le projet est divisé en deux parties principales :

### Frontend (Vue 3)
- Interface utilisateur pour la navigation des périodes géologiques
- Composants Vue réutilisables
- Services pour l'interaction avec l'API et Wikidata
- Styles modulaires avec variables CSS
- Tests unitaires avec Vitest

### Backend (Express)
- API REST pour l'accès aux données
- Base de données PostgreSQL
- Intégration avec Wikidata
- Support multilingue

## Structure de données

### Types principaux

```typescript
interface Period {
  id: string;              // Identifiant unique
  wikidataId: string;      // Identifiant Wikidata
  label: MultilingualText; // Label multilingue
  description?: MultilingualText; // Description multilingue
  startDate: string;       // Date de début
  endDate: string;         // Date de fin
  parentId: string | null; // ID de la période parente
  temporalLocation: string; // Localisation temporelle
  categories: Category[];   // Catégories associées
  children: Period[];      // Périodes enfants
  createdAt: Date;         // Date de création
  updatedAt: Date;         // Date de mise à jour
}

interface Event {
  id: string;              // Identifiant unique
  wikidataId: string;      // Identifiant Wikidata
  label: MultilingualText; // Label multilingue
  description?: MultilingualText; // Description multilingue
  date: string;            // Date de l'événement
  categories: Category[];   // Catégories associées
  createdAt: Date;         // Date de création
  updatedAt: Date;         // Date de mise à jour
}

interface Category {
  id: string;              // Identifiant unique
  label: MultilingualText; // Label multilingue
  description?: MultilingualText; // Description multilingue
  parentId?: string | null; // ID de la catégorie parente
}

interface MultilingualText {
  fr: string;              // Texte en français
  en: string;              // Texte en anglais
}
```

## Services

### Frontend
- `DatabaseQueryService` : Interaction avec l'API backend
- `WikidataQueryService` : Requêtes vers Wikidata
- `TimelineScalingService` : Calcul des échelles temporelles
- `StoryService` : Gestion des stories
- `DatabaseImportService` : Import des données
- `WikidataSearchService` : Recherche dans Wikidata

### Backend
- `database.ts` : Configuration PostgreSQL
- `routes.ts` : Endpoints API

## Composants Vue

### Navigation
- `BackButton.vue` : Navigation retour
- `Header.vue` : En-tête de page
- `LanguageSelector.vue` : Sélection de langue
- `SearchBar.vue` : Barre de recherche

### Affichage
- `PeriodGrid.vue` : Grille des périodes
- `PeriodCard.vue` : Carte de période
- `EventCard.vue` : Carte d'événement
- `ArrowIcon.vue` : Icône de flèche
- `Favicon.vue` : Favicon

## API Endpoints

### Périodes
- `GET /api/periods` : Récupère toutes les périodes avec leurs catégories

### Événements
- `GET /api/events` : Récupère tous les événements avec leurs catégories et dates Wikidata

### Stories
- `GET /api/stories` : Récupère toutes les stories avec leurs catégories

### Catégories
- `GET /api/categories` : Récupère toutes les catégories

## Configuration

### Technologies Utilisées
- Frontend :
  - Vue 3 avec Composition API
  - TypeScript
  - Vite
  - CSS modulaire
- Backend :
  - Node.js avec Express.js
  - TypeScript
  - PostgreSQL
  - Docker
- Outils :
  - Yarn
  - Docker Compose
  - pgAdmin

### Configuration Requise
- Node.js >= 16
- Yarn >= 1.22
- Docker
- PostgreSQL 16

### Installation
```bash
# Installation des dépendances
yarn install

# Démarrage de la base de données
docker-compose up -d

# Initialisation de la base de données
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < database/init-all.sql

# Démarrage du serveur backend
cd server && yarn dev

# Dans un autre terminal, démarrage du frontend
yarn dev
```

### Scripts Disponibles
- Frontend :
  - `yarn dev` : Lance le serveur de développement
  - `yarn build` : Compile pour la production
  - `yarn preview` : Prévisualise la production
  - `yarn test` : Lance les tests
- Backend :
  - `cd server && yarn dev` : Lance le serveur Express
  - `cd server && yarn build` : Compile TypeScript
  - `cd server && yarn start` : Lance en production

## Tests

### Structure des Tests
- Frontend :
  - Tests des composants Vue
  - Tests des services
  - Tests des utilitaires
- Backend :
  - Tests des routes API
  - Tests des connexions DB
  - Tests des requêtes Wikidata

### Tests Unitaires
- Frontend :
  - Tests des composants avec Vue Test Utils
  - Tests des services avec Vitest
  - Tests des transformations de données
- Backend :
  - Tests des endpoints API
  - Tests des connexions DB
  - Tests des erreurs

## Bonnes Pratiques

### Code
- TypeScript strict
- Documentation des fonctions
- Gestion des erreurs
- Conventions de nommage
- Architecture modulaire
- Séparation des responsabilités

### Frontend
- Composants réutilisables
- Styles modulaires
- Gestion d'état
- Performance
- Accessibilité
- Support multilingue

### Backend
- Documentation API
- Gestion des erreurs HTTP
- Validation des données
- Performance
- Sécurité
- Support multilingue

### Base de données
- Transactions
- Indexation
- Connexions
- Support multilingue
- Contraintes d'intégrité

## État du Projet

### Fonctionnalités Implémentées
- [x] Frontend Vue 3
- [x] Backend Express
- [x] Base de données PostgreSQL
- [x] Intégration Wikidata
- [x] Support multilingue
- [x] Tests unitaires
- [x] Documentation

### Problèmes Connus
- Optimisation des requêtes Wikidata
- Cache des dates d'événements
- Performance des requêtes complexes
- Gestion des états de chargement

### Prochaines Étapes
- Optimisation des performances
- Implémentation du cache
- Tests d'intégration
- Documentation API
- Monitoring
- Sécurité

## Utilitaires

### DateFormatter

Classe utilitaire pour la gestion et la conversion des dates dans différents formats.

#### Formats supportés

- **Dates ISO8601** : Format standard avec support des millisecondes et fuseaux horaires
- **Dates Wikidata** : Format spécifique de Wikidata incluant les dates négatives
- **Dates géologiques** : Support des formats Ga (milliards d'années) et Ma (millions d'années)
- **Dates historiques** : Support des formats BCE/BC et des millénaires
- **Dates relatives** : Support des formats "il y a X ans"

#### Fonctionnalités principales

- **Conversion automatique** : Détection et conversion automatique des formats
- **Normalisation** : Conversion en format ISO8602 pour stockage
- **Formatage intelligent** : 
  - Dates géologiques : affichage en Ga/Ma pour les grandes périodes
  - Dates historiques : affichage en années pour les périodes < 1M ans
  - Support des calculs de durée et de temps écoulé

#### Méthodes principales

- `processDate(date: string)` : Traite une date et retourne tous les formats disponibles
- `formatYearsToGeological(years: number)` : Convertit un nombre d'années en format approprié
- `parseToISO8602(date: string)` : Convertit une date en format ISO8602
- `formatFromISO8602(date: string, format: string)` : Convertit depuis ISO8602 vers le format demandé

### WikidataSearchService

Service de recherche et formatage des données Wikidata.

#### Types de recherche

- **Événements** : Dates ponctuelles
- **Périodes** : Intervalles de temps avec début et fin
- **Personnes** : Personnages historiques avec dates de naissance/décès

#### Formatage des résultats

- **Événements** : "Il y a X ans/Ma/Ga"
- **Périodes** : "Durée (il y a X ans/Ma/Ga)"
- **Personnes** : "Age ans (il y a X ans/Ma/Ga)" ou "Né/Mort il y a X ans/Ma/Ga"

> Note : Le formatage des dates est effectué une seule fois dans le `WikidataSearchService` et les dates formatées sont utilisées directement dans les composants d'affichage pour éviter les doubles formatages.

#### Gestion du cache

- Cache de 5 minutes pour les résultats
- Clé de cache basée sur la requête et les options

## Formatage des Dates

Le formatage des dates est centralisé dans la classe `DateFormatter` qui gère :
- La conversion vers le format ISO8602 pour la base de données
- Le formatage pour l'affichage dans l'interface utilisateur
- La gestion des différents types de dates (périodes, événements, personnes)

#### Format ISO8602
Format utilisé pour stocker les dates dans la base de données :
```
[Échelle de temps][Signe][Valeur][Unité][Précision][Fuseau horaire]
```
- Échelle de temps : G (Géologique), H (Historique), M (Moderne)
- Signe : + ou -
- Valeur : nombre
- Unité : Y (années)
- Précision : 0-8 (année à milliseconde)
- Fuseau horaire : optionnel

#### Conversion des Dates
La conversion est gérée par la méthode `parseToISO8602` qui :
1. Détecte le format d'entrée
2. Convertit en format ISO8602
3. Valide le résultat

#### Formatage pour l'Affichage
Le formatage pour l'affichage est géré par la méthode `formatForSearch` qui :
1. Formate la date selon son type (période, événement, personne)
2. Ajoute le préfixe "Il y a" approprié
3. Inclut des informations supplémentaires selon le type :
   - Pour les personnes : l'âge
   - Pour les périodes : la durée
   - Pour les événements : la date simple

## Architecture du Projet

### Structure des Composants
- `App.vue` : Composant racine
  - `Header.vue` : Navigation et recherche
  - `TimelineView.vue` : Vue principale de la timeline
  - `DatabaseView.vue` : Vue de la base de données
    - `DatabaseCard.vue` : Composant de carte pour afficher les éléments
  - `SearchResults.vue` : Résultats de recherche

### Services
- `WikidataSearchService.ts` : Gestion des recherches Wikidata
- `DatabaseViewService.ts` : Gestion des données de la vue base de données

### Types
- `database.ts` : Types pour les données de la base
  - `Period` : Période historique
  - `Event` : Événement historique
  - `Story` : Histoire
  - `Category` : Catégorie

## Composants Principaux

### DatabaseView.vue
- Affiche les données en trois colonnes : Périodes, Événements, Stories
- Utilise le service DatabaseViewService pour la gestion des données
- Responsive avec grid layout

### DatabaseCard.vue
- Composant réutilisable pour afficher les éléments
- Propriétés :
  - `type` : 'period' | 'event' | 'story'
  - `title` : Titre de l'élément
  - `date` : Date (optionnelle)
  - `categories` : Liste des catégories
- Événements :
  - `edit` : Émis lors du clic sur le bouton d'édition

## Styles
- Utilisation de variables CSS pour la cohérence
- Design responsive
- Animations subtiles pour l'interaction
- Thème sombre/clair supporté

## État du Projet
- Vue base de données implémentée
- Navigation entre les vues fonctionnelle
- Système de recherche Wikidata intégré
- Gestion des catégories en place

## Gestion des données

### Services

#### DatabaseQueryService
- Responsable de la communication avec l'API
- Formate les données reçues de l'API selon les types définis
- Gère les erreurs et le logging des requêtes
- Retourne les données formatées prêtes à être utilisées par les composants

#### DatabaseViewService
- Singleton qui gère l'état global des données
- Utilise des refs Vue pour stocker les données
- Les getters retournent les valeurs des refs (`.value`) et non les refs elles-mêmes
- Charge les données via DatabaseQueryService
- Met à jour les refs avec les données formatées

### Composants

#### DatabaseView
- Utilise DatabaseViewService pour charger les données
- Définit des refs locales pour stocker les données
- Met à jour les refs locales avec les données du service après le chargement
- Affiche les données via des composants DatabaseCard

### Format des données

#### Événements (Event)
```typescript
{
  id: string;
  label: {
    fr: string;
    en: string;
  };
  date: string;
  description?: {
    fr: string;
    en: string;
  };
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Périodes (Period)
```typescript
{
  id: string;
  label: {
    fr: string;
    en: string;
  };
  description?: {
    fr: string;
    en: string;
  };
  startDate: string;
  endDate: string;
  parentId: string | null;
  temporalLocation: string;
  categories: Category[];
  children: Period[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Stories
```typescript
{
  id: number;
  title: {
    fr: string;
    en: string;
  };
  description?: {
    fr: string;
    en: string;
  };
  author: string;
  isPublic: boolean;
  categories: Category[];
  periods: Period[];
  events: Event[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Bonnes pratiques
1. Toujours formater les données reçues de l'API selon les types définis
2. Utiliser des refs Vue pour la réactivité
3. Retourner les valeurs des refs (`.value`) et non les refs elles-mêmes
4. Mettre à jour les refs locales après le chargement des données
5. Utiliser des types stricts pour éviter les erreurs de format
6. Logger les données à chaque étape pour faciliter le débogage

## [2024-06-10] Auto-remplissage Wikidata pour les événements

- Ajout de la méthode `loadEvent(eventId)` dans `WikidataQueryService` :
  - Interroge Wikidata pour récupérer le label, la description et la date d'un événement à partir de son Q-id.
- Dans `EditModal.vue`, si le type est "event" et que le Q-id n'existe pas en base, appel automatique à `wikidataService.loadEvent`.
  - Pré-remplit les champs titre (fr/en), description (fr/en) et date si trouvés.
  - Affiche un toast de succès ou d'erreur selon le résultat.

Ce mécanisme fonctionne de façon similaire à celui déjà en place pour les périodes.

## [2024-06-10] Amélioration de la vérification d'existence des événements

- Modification de la méthode de vérification d'existence des événements
  - Utilisation de l'endpoint `/api/events` au lieu de `/api/events/{qid}`
  - Filtrage des événements par `wikidata_id` côté client
  - Élimination des erreurs 404 dans la console
- Amélioration de la gestion des erreurs et validation des Q-ids
  - Configuration d'Axios pour ignorer les erreurs 404 dans la console
  - Logs uniquement pour les erreurs non-404
- Logs plus détaillés pour le débogage
- Messages d'erreur plus explicites pour l'utilisateur
- Double validation du format Q-id (côté client et service)

## Architecture

### Frontend (Vue.js)
- Composants de base réutilisables :
  - `Button.vue` : Boutons avec 3 variantes (primary, secondary, tertiary)
  - `Input.vue` : Champs de formulaire avec validation et gestion des erreurs
- Composants spécifiques :
  - `DatabaseView.vue` : Vue principale de la base de données
  - `DatabaseCard.vue` : Carte pour afficher les périodes et événements
  - `EditModal.vue` : Modal d'édition avec support Wikidata

### Backend (Node.js)
- API REST avec Express
- Base de données PostgreSQL
- Intégration avec l'API Wikidata

## Services

### DatabaseQueryService
- Gestion des requêtes vers la base de données
- Méthodes CRUD pour les périodes et événements
- Gestion des catégories

### WikidataQueryService
- Requêtes SPARQL vers Wikidata
- Récupération des données des périodes et événements
- Formatage des dates et localisations

## Design System
- Variables CSS pour la cohérence visuelle
- Composants réutilisables
- Gestion des états (hover, focus, disabled)
- Support multilingue (FR/EN)

## Sécurité
- Validation des données côté serveur
- Protection contre les injections SQL
- Gestion des erreurs et logging

## Performance
- Mise en cache des requêtes Wikidata
- Pagination des résultats
- Optimisation des requêtes SQL

## [MAJ 2025-06-12] Optimisations et évolutions techniques majeures

### Optimisation du chargement des données
- Le composant DatabaseView charge désormais uniquement les titres (fr) des périodes et événements au chargement initial.
- Les données complètes sont chargées à la demande lors de l'ouverture d'une modale d'édition.

### Gestion des QID Wikidata
- Vérification d'unicité du QID avant sauvegarde.
- Suppression automatique de l'objet conflictuel en cas de doublon de QID (avec toast utilisateur).

### Amélioration de la récupération des dates pour les événements
- Prise en compte des propriétés Wikidata :
  - P585 (point in time)
  - P580 (date de début)
  - P569 (date de naissance)
  - P1319 (date la plus ancienne)
- Ordre de priorité : P585 > P580 > P569 > P1319.

### Backend : nouvelle route DELETE
- Ajout de la route DELETE /api/events/:id pour permettre la suppression d'un événement par son identifiant technique.

### Robustesse des payloads
- Conversion systématique des champs Vue (Proxy) en objets simples avant envoi au backend.

## Gestion des Stories

### Routes API
- `GET /api/stories` : Récupère la liste des stories
- `POST /api/stories` : Crée une nouvelle story
  - Body : 
    ```typescript
    {
      title: {
        fr: string,
        en: string
      },
      description?: {
        fr: string,
        en: string
      },
      author: string,
      isPublic?: boolean
    }
    ```

### Services
- `DatabaseQueryService`
  - `getListStories()` : Récupère la liste des stories
  - `createStory(storyData)` : Crée une nouvelle story
  - `updateStory(storyId, storyData)` : Met à jour une story existante

### Composants
- `DatabaseView.vue`
  - Gestion de l'affichage des stories
  - Bouton "Add" pour créer une nouvelle story
  - Gestion de la modale d'édition

- `EditModal.vue`
  - Support du type 'story'
  - Champs spécifiques :
    - Titre (FR/EN)
    - Description (FR/EN)
    - Auteur
    - Visibilité (publique/privée)

### Base de données
- Table `stories.stories`
  - `id` : SERIAL PRIMARY KEY
  - `title_fr` : TEXT NOT NULL
  - `title_en` : TEXT NOT NULL
  - `description_fr` : TEXT
  - `description_en` : TEXT
  - `author` : VARCHAR(255) NOT NULL
  - `is_public` : BOOLEAN DEFAULT true
  - `created_at` : TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  - `updated_at` : TIMESTAMP DEFAULT CURRENT_TIMESTAMP

- Tables de liaison
  - `story_periods` : Liaison stories-périodes
  - `story_events` : Liaison stories-événements

## Refactorisation de la gestion des entités

- **Centralisation de la source de vérité** : Toutes les entités (stories, périodes, événements) sont désormais gérées via le singleton `DatabaseViewService`.
- **Suppression des refs locales** : Les listes locales ont été supprimées des composants principaux pour éviter toute désynchronisation.
- **Gestion des mutations** : Après chaque modification (création, édition, suppression), un rechargement global des données est effectué via le singleton.
- **Adaptation des services** : `DatabaseQueryService` et `DatabaseViewService` ont été adaptés pour supporter les nouvelles routes backend et centraliser la logique d'accès aux données.
- **Correction du mapping des champs** : Les méthodes de chargement détaillé garantissent la compatibilité avec la modale d'édition.
- **Suppression de la gestion des catégories dans DatabaseCard.vue**.

---

### API utilisées
- `GET /api/stories/:id` : Détail d'une story (périodes, événements, catégories…)
- `DELETE /api/stories/:id` : Suppression d'une story et de ses liaisons
- `GET/POST/PUT/DELETE` sur `/api/periods`, `/api/events`, `/api/stories`, `/api/stories/:storyId/periods/:periodId`, etc.

---

### Points critiques
- Cohérence entre backend (routes, structure des réponses) et frontend (mapping des champs, centralisation des accès)
- Robustesse de la gestion des mutations et du rechargement des données

## Gestion des dates (événements et périodes)

- Les champs `date` (événements), `start_date` et `end_date` (périodes) sont de type **TEXT** dans la base PostgreSQL.
- Ce choix permet de stocker des dates très anciennes, négatives ou exotiques (ex : `-145000000-01-01T00:00:00Z`) sans erreur, contrairement au type `timestamp`.
- Les migrations SQL assurant cette robustesse sont versionnées dans `server/prisma/migrations/`.
- Toute mention d'un stockage en `timestamp` ou `date` pour ces champs est obsolète et a été supprimée.

## Robustesse de l'API

- Les routes `/api/events` et `/api/periods` acceptent tous les formats de date sans lever d'erreur 500.
- Les mises à jour et créations d'événements/périodes sont fiables, même avec des dates négatives ou non-standards.

## Synchronisation Docker / Beekeeper

- La base utilisée par l'API est celle du conteneur Docker (`wikidata_db`, user `wikidata_user`).
- Pour voir les modifications en temps réel dans Beekeeper, il faut se connecter à cette base.

## Dépendances

### Composants Vue

#### GraphView.vue
- **Emplacement** : `src/components/GraphView.vue`
- **Description** : Composant principal pour la visualisation graphique des données
- **Fonctionnalités** :
  - Navigation en colonnes pour explorer la hiérarchie des périodes
  - Gestion des états de chargement et d'erreur
  - Interactivité avec les éléments de la vue
- **Props** : Aucune pour le moment
- **Événements** : Aucun pour le moment
- **Dépendances** :
  - Design system pour les styles
  - Services pour la gestion des données

## Connexion à la base de données PostgreSQL

- **Type** : PostgreSQL (via Docker)
- **Nom du service Docker** : wikidata_db
- **Image** : postgres:15
- **Nom de la base** : wikidata_db
- **Utilisateur** : wikidata_user
- **Mot de passe** : wikidata_password
- **Port exposé** : 5432 (hôte) → 5432 (conteneur)
- **Schéma principal** : periods
- **Table principale** : periods.periods

### Exemple de connexion locale

```bash
psql -h localhost -p 5432 -U wikidata_user -d wikidata_db
```

### Exemple de connexion depuis un conteneur Docker

```bash
docker exec -it wikidata_db psql -U wikidata_user -d wikidata_db
```

### Variables d'environnement (docker-compose.yml)

```yaml
environment:
  POSTGRES_DB: wikidata_db
  POSTGRES_USER: wikidata_user
  POSTGRES_PASSWORD: wikidata_password
```

## Structure de la table periods.periods

- `id` (varchar, PK)
- `wikidata_id` (varchar)
- `label_fr` (text)
- `label_en` (text)
- `description_fr` (text)
- `description_en` (text)
- `start_date` (text)
- `end_date` (text)
- `temporal_location` (varchar)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `has_parent` (boolean) - Indique si la période est un enfant d'une autre période
- `children` (jsonb) - Liste des IDs des périodes enfants

## Maintenance et intégrité

- Un script SQL de maintenance est disponible dans `database/maintenance.sql` pour garantir la cohérence des champs `children`.
- Les index sont créés automatiquement pour optimiser les requêtes et garantir l'intégrité des relations hiérarchiques.
- La propriété `has_parent` est gérée indépendamment de `children` pour permettre une meilleure flexibilité dans la gestion des relations parent-enfant.

## Problèmes courants et solutions

### Exécution des scripts SQL

#### Problèmes connus
1. **Container non trouvé**
   - Erreur : `Error response from daemon: No such container: api_db`
   - Solution : Vérifier le nom du container avec `docker ps`
   - Le container de base de données est nommé `wikidata_db` et non `api_db`

2. **Utilisateur PostgreSQL incorrect**
   - Erreur : `FATAL: role "postgres" does not exist`
   - Solution : Utiliser l'utilisateur `wikidata_user` au lieu de `postgres`
   - La base de données est nommée `wikidata_db`

3. **Chemin des scripts**
   - Erreur : `psql: error: could not open file "/app/database/script.sql"`
   - Solution : Copier d'abord le script dans le container
   - Utiliser `docker cp` pour copier le script dans `/tmp/` du container

#### Procédure recommandée
1. Copier le script dans le container :
   ```bash
   docker cp chemin/vers/script.sql wikidata_db:/tmp/
   ```

2. Exécuter le script :
   ```bash
   docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db -f /tmp/script.sql
   ```

3. Vérifier les logs :
   ```bash
   docker logs wikidata_db --tail 50
   ```

#### Bonnes pratiques
- Toujours vérifier le nom du container avec `docker ps`
- Utiliser les bons identifiants (utilisateur et base de données)
- Copier les scripts dans `/tmp/` avant de les exécuter
- Vérifier les logs en cas d'erreur
- Sauvegarder la base de données avant d'exécuter des scripts de modification