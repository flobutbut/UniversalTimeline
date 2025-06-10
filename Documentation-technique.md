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