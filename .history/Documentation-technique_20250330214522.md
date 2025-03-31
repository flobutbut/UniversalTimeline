# Documentation Technique

## Architecture

Le projet utilise Vue 3 avec TypeScript pour créer une interface de navigation des périodes géologiques en utilisant l'API SPARQL de Wikidata.

### Structure du Projet
```
src/
├── components/
│   ├── GeologicalPeriods.vue
│   ├── GeologicalPeriodCard.vue
│   └── LanguageSelector.vue
├── services/
│   └── wikidata.ts
├── types/
│   └── geological.ts
└── utils/
    └── dateFormatter.ts
```

### Structure des Données

#### Types Principaux

```typescript
interface Period {
  id: string;                    // Identifiant Wikidata unique
  label: string;                 // Nom de la période
  startDate?: string;           // Date de début formatée
  endDate?: string;             // Date de fin formatée
  categoryIds: string[];        // IDs des catégories Wikidata
  categoryLabels: string[];     // Labels des catégories
  location?: string;            // Localisation géographique
  childrenPreloaded: boolean;   // Indique si les enfants sont chargés
  children: SimplePeriod[];     // Sous-périodes
  loading: boolean;             // État de chargement
  isMainEon: boolean;          // Indique si c'est un éon principal
}

interface SimplePeriod {
  id: string;                   // Identifiant Wikidata unique
  label: string;                // Nom de la période
  startDate?: string;          // Date de début formatée
  endDate?: string;            // Date de fin formatée
  categoryIds: string[];       // IDs des catégories Wikidata
  location?: string;           // Localisation géographique
  hasChildren: boolean;        // Indique si la période a des sous-périodes
  isMainEon: boolean;         // Indique si c'est un éon principal
}
```

### Services

#### Service Wikidata (`wikidata.ts`)
- Gestion des requêtes SPARQL vers l'API Wikidata
- Transformation des données brutes en objets typés
- Gestion des erreurs et des timeouts
- Système de cache en mémoire
- Logging détaillé pour le débogage
- Gestion avancée des dates avec différents formats

#### Formatage des Dates (`dateFormatter.ts`)
- Classe utilitaire pour le formatage des dates
- Gestion des différents formats de dates :
  - Dates géologiques (années avant le présent)
  - Dates françaises (JJ/MM/AAAA)
  - Dates anglaises (MM/DD/YYYY)
- Conversion automatique des unités :
  - Ga (Giga-années) pour les dates ≥ 1 000 000 000 ans
  - Ma (Méga-années) pour les dates ≥ 1 000 000 ans
  - ans pour les dates < 1 000 000 ans

#### WikidataTimelineService

Service singleton pour gérer les interactions avec l'API Wikidata.

- **Méthodes principales**:
  - `getMainEons(options: QueryOptions): Promise<Period[]>`
  - `getChildren(parentId: string, options: QueryOptions): Promise<SimplePeriod[]>`

- **Fonctionnalités**:
  - Gestion du cache avec expiration
  - Retry automatique en cas d'erreur
  - Support multilingue
  - Requêtes SPARQL optimisées

### Composants

#### GeologicalPeriods.vue

Composant principal qui gère l'affichage et la navigation dans la timeline.

- **Fonctionnalités**:
  - Affichage des éons principaux
  - Navigation dans la hiérarchie des périodes
  - Gestion du chargement progressif
  - Support multilingue
  - Gestion des erreurs

#### GeologicalPeriodCard.vue

Composant de présentation pour chaque période.

- **Fonctionnalités**:
  - Affichage des informations de base
  - Indication visuelle de la sélection
  - Affichage des catégories
  - Gestion des états de chargement
  - Indication de la présence de sous-périodes

#### BackButton
- Bouton de navigation retour
- Affichage conditionnel basé sur la profondeur de navigation
- Styles isolés pour le bouton
- Émission d'événements de clic
- Positionnement dans la barre de contrôle

#### LanguageSelector
- Sélection de la langue d'affichage (FR/EN)
- Support du v-model pour la liaison bidirectionnelle
- Styles isolés pour le sélecteur
- Gestion des événements de changement
- Intégration dans la barre de contrôle

### Types

#### GeologicalPeriod
```typescript
interface GeologicalPeriod {
  id: string;
  label: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  parentPeriod?: GeologicalPeriod;
  childPeriods: GeologicalPeriod[];
}
```

## Technologies Utilisées
- Vue 3 avec Composition API
- TypeScript
- Axios pour les requêtes HTTP
- SPARQL pour les requêtes Wikidata

## Configuration Proxy

Le projet utilise un proxy Vite pour éviter les problèmes CORS avec l'API Wikidata.

## Configuration Requise
- Node.js >= 16
- Yarn >= 1.22

## Installation
```bash
yarn install
```

## Scripts Disponibles
- `yarn dev` : Lance le serveur de développement
- `yarn build` : Compile le projet pour la production
- `yarn preview` : Prévisualise la version de production
- `yarn test` : Lance les tests unitaires
- `yarn test:coverage` : Lance les tests avec couverture
- `yarn test:ui` : Lance l'interface utilisateur des tests

## Configuration

### Vite
Le projet utilise Vite comme bundler avec la configuration suivante :
- Proxy configuré pour l'API Wikidata (`/api/wikidata/*` -> `https://www.wikidata.org`)
- Gestion des en-têtes CORS et User-Agent via le proxy
- Support du HMR (Hot Module Replacement)

### API Wikidata
- Utilisation de l'API REST Wikidata via le proxy local
- Endpoint : `/api/wikidata/w/api.php`
- Paramètres de requête :
  - `action`: wbsearchentities
  - `format`: json
  - `language`: fr/en
  - `type`: item
  - `limit`: 20 (par défaut)

## Architecture Technique

### Service Wikidata
- Implémentation du pattern Singleton
- Gestion des requêtes SPARQL vers l'API Wikidata
- Support multilingue (fr, en)
- Pagination des résultats
- Gestion des erreurs
- Système de cache en mémoire
  - Durée de vie : 5 minutes
  - Clé de cache basée sur les options de requête
  - Invalidation automatique
  - Cache distinct par combinaison d'options

### Système de Gestion des Erreurs
#### WikidataError
- Classe d'erreur personnalisée avec :
  - Message d'erreur localisé
  - Code d'erreur spécifique
  - Erreur d'origine (pour le debugging)

#### Codes d'Erreur
- `RATE_LIMIT` : Limite de requêtes dépassée
- `SERVICE_UNAVAILABLE` : Service indisponible
- `INVALID_REQUEST` : Requête mal formée
- `INVALID_RESPONSE` : Réponse API invalide
- `INVALID_PERIOD_DATA` : Données de période incomplètes
- `API_ERROR` : Erreur de communication
- `UNKNOWN_ERROR` : Erreur non catégorisée

#### Mécanisme de Retry
- Configuration :
  - Maximum 3 tentatives
  - Délai de 1 seconde entre les tentatives
  - Timeout de 10 secondes par requête
- Erreurs retentées :
  - Erreurs réseau
  - Code 429 (Rate Limit)
  - Codes 503/504 (Service Unavailable)

#### Validation des Données
- Vérification de la structure de réponse
- Validation des champs obligatoires
- Transformation sécurisée des données

### Architecture des Composants
#### GeologicalPeriods
- Gestion de l'état global
- Coordination des sous-composants
- Gestion des données et des erreurs
- Affichage conditionnel des états

#### GeologicalPeriodCard
- Affichage d'une période
- Gestion des interactions
- Styles isolés
- Émission d'événements

#### BackButton
- Navigation retour
- Affichage conditionnel
- Styles isolés
- Émission d'événements

#### LanguageSelector
- Sélection de langue
- Support v-model
- Styles isolés
- Gestion des événements

### Tests

#### Structure des Tests
- Tests unitaires dans le dossier `__tests__/`
- Tests des composants Vue avec Vue Test Utils
- Tests du service Wikidata
- Tests des utilitaires de formatage

#### Tests Unitaires du Service
- Test du pattern Singleton
- Test des requêtes avec options par défaut
- Test des requêtes avec options personnalisées
- Tests de gestion des erreurs :
  - Erreurs HTTP (429, 503, 504)
  - Erreurs de validation des données
  - Mécanisme de retry
  - Timeouts
  - Erreurs réseau
- Mock des appels API avec Vitest

#### Tests des Composants
- Test de l'état de chargement initial
- Test de l'affichage des données
- Tests de gestion des erreurs :
  - Affichage des messages d'erreur
  - Fonctionnement du bouton de retry
  - États d'erreur spécifiques
  - Transitions d'état
- Test du changement de langue
- Test de la navigation hiérarchique
- Utilisation de Vue Test Utils pour le montage et les interactions

### Points d'Attention
1. Gestion des erreurs
   - Classe `WikidataError` personnalisée avec codes d'erreur spécifiques
   - Système de retry automatique (3 tentatives, délai de 1s)
   - Timeout des requêtes (10s)
   - Gestion des erreurs HTTP (429, 503, 504)
   - Validation des données de réponse
   - Interface utilisateur réactive avec messages contextuels
   - Bouton de réessai pour les erreurs récupérables

2. Système de Cache
   - Cache en mémoire avec Map
   - Durée de vie configurable (5 minutes par défaut)
   - Clé de cache basée sur les paramètres de requête
   - Invalidation automatique des entrées expirées
   - Cache distinct pour chaque combinaison d'options
   - Réduction des appels API redondants

3. Limites de l'API
   - Pagination côté serveur (20 éléments par page)
   - Gestion des timeouts
   - Cache des requêtes

4. Validation des données
   - Typage strict avec TypeScript
   - Vérification des données reçues
   - Formatage des dates

5. Performance
   - Lazy loading des données
   - Optimisation des requêtes SPARQL
   - Mise en cache des résultats

## Bonnes Pratiques
1. Tests
   - Tests unitaires pour les services
   - Tests d'intégration pour les composants
   - Mocks pour les dépendances externes
   - Couverture de code > 80%

2. Code
   - Utilisation de TypeScript strict
   - Documentation des fonctions
   - Gestion des cas d'erreur
   - Respect des conventions de nommage
   - Composants réutilisables
   - Styles isolés

3. UI/UX
   - Design responsive
   - États de chargement
   - Messages d'erreur clairs
   - Navigation intuitive
   - Transitions fluides
   - Hiérarchie visuelle claire

## Propriétés Wikidata testées

### Localisation
- P276 (situé dans) : Première tentative, résultats incomplets
- P706 (situé sur le territoire géographique) : Deuxième tentative, résultats non concluants

La gestion de la localisation des périodes géologiques et archéologiques reste un défi à résoudre. Les propriétés testées ne donnent pas les résultats escomptés. 

## Requêtes SPARQL

### Requête des Éons Principaux

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?item ?itemLabel 
    (SAMPLE(?startDate) AS ?debut) 
    (SAMPLE(?endDate) AS ?fin) 
    ?categoryId ?categoryLabel
    (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
    (COUNT(DISTINCT ?child) AS ?childCount)
WHERE {
  VALUES ?item { 
    wd:Q123456  # Hadean
    wd:Q234567  # Archean
    wd:Q345678  # Proterozoic
    wd:Q456789  # Phanerozoic
  }
  
  # Dates
  OPTIONAL { ?item wdt:P580 ?startDate. }
  OPTIONAL { ?item wdt:P582 ?endDate. }
  
  # Catégories
  OPTIONAL { 
    ?item wdt:P31 ?categoryId.
  }
  
  # Localisation
  OPTIONAL { 
    {?item wdt:P17 ?locationEntity}
    UNION {?item wdt:P276 ?locationEntity}
    UNION {?item wdt:P131 ?locationEntity}
  }
  
  # Vérifie s'il y a des enfants
  OPTIONAL {
    { ?child wdt:P361 ?item } 
    UNION { ?item wdt:P527 ?child }
  }
  
  # Labels
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "fr".
    ?item rdfs:label ?itemLabel.
    ?categoryId rdfs:label ?categoryLabel.
    ?locationEntity rdfs:label ?locationLabel.
  }
}
GROUP BY ?item ?itemLabel ?categoryId ?categoryLabel
ORDER BY ?debut
```

### Requête des Sous-périodes

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?child ?childLabel 
    (SAMPLE(?startDate) AS ?debut) 
    (SAMPLE(?endDate) AS ?fin) 
    ?categoryId ?categoryLabel
    (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
    (EXISTS { 
      { ?grandchild wdt:P361 ?child } 
      UNION { ?child wdt:P527 ?grandchild }
    } AS ?hasChildren)
WHERE {
  # Relation parent-enfant
  { ?child wdt:P361 wd:PARENT_ID }
  UNION { wd:PARENT_ID wdt:P527 ?child }
  
  # FILTRE: S'assurer que c'est une période temporelle
  {
    ?child wdt:P31 ?periodType.
    VALUES ?periodType {
      wd:Q123456  # Eon
      wd:Q234567  # Era
      wd:Q345678  # Period
      wd:Q456789  # Epoch
      wd:Q567890  # Age
    }
  }
  UNION {
    ?child wdt:P31 ?childType.
    ?childType wdt:P279+ wd:Q345678.  # Sous-classe de Period
  }
  
  # Dates
  OPTIONAL { ?child wdt:P580 ?startDate. }
  OPTIONAL { ?child wdt:P582 ?endDate. }
  
  # Catégories
  OPTIONAL { ?child wdt:P31 ?categoryId. }
  
  # Localisation
  OPTIONAL { 
    {?child wdt:P17 ?locationEntity}
    UNION {?child wdt:P276 ?locationEntity}
    UNION {?child wdt:P131 ?locationEntity}
  }
  
  # Labels
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "fr".
    ?child rdfs:label ?childLabel.
    ?categoryId rdfs:label ?categoryLabel.
    ?locationEntity rdfs:label ?locationLabel.
  }
}
GROUP BY ?child ?childLabel ?categoryId ?categoryLabel ?hasChildren
ORDER BY ?debut
LIMIT 100
```

## Gestion des Erreurs

Le service gère plusieurs types d'erreurs :

1. **Erreurs de Rate Limiting (429)**
   - Retry automatique avec délai
   - Message utilisateur explicite

2. **Erreurs de Service (503)**
   - Retry automatique
   - Message utilisateur explicite

3. **Erreurs de Connexion**
   - Timeout après 30 secondes
   - Retry automatique

4. **Erreurs de Format**
   - Validation des données
   - Transformation sécurisée

## Cache

- **Durée**: 5 minutes
- **Clé**: `language-parentId-categoryId`
- **Structure**: Map<string, CacheEntry>
- **Invalidation**: Automatique après expiration

## Performance

### Optimisations

1. **Requêtes SPARQL**
   - Utilisation de GROUP_CONCAT pour les locations
   - Limitation à 100 résultats par requête
   - Filtrage des types de périodes

2. **Cache**
   - Mise en cache des résultats
   - Invalidation automatique
   - Réduction des appels API

3. **Chargement Progressif**
   - Chargement à la demande des sous-périodes
   - Indication visuelle du chargement
   - Gestion des états de chargement

### Monitoring

- Logs des requêtes SPARQL
- Suivi des erreurs
- Métriques de performance
- État du cache 