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

#### WikidataService

Service singleton qui gère les requêtes vers l'API SPARQL de Wikidata.

- **Endpoint**: `/api/wikidata/sparql`
- **Cache**: 5 minutes
- **Timeout**: 30 secondes
- **Retry**: 3 tentatives avec 1 seconde de délai
- **Logging**: Système de logging détaillé pour le débogage des requêtes et des transformations

#### Requêtes SPARQL

La requête principale utilise les IDs Wikidata suivants pour les éons :
- Hadéen (Q104460)
- Archéen (Q104168)
- Protérozoïque (Q104162)
- Phanérozoïque (Q101313)

La navigation hiérarchique utilise la propriété P361 (partie de) pour récupérer les sous-périodes.

### Composants

#### GeologicalPeriods (Composant Principal)
- Gestion de l'état global de l'application
- Coordination des sous-composants
- Gestion des données et des erreurs
- Affichage conditionnel des états (chargement, erreur)
- Styles CSS modulaires avec scoped
- Gestion de la navigation hiérarchique
- Support multilingue (FR/EN)

#### GeologicalPeriodCard
- Affichage d'une période géologique individuelle
- Gestion des interactions utilisateur
- Styles isolés pour la carte
- Émission d'événements de clic
- Affichage des dates formatées
- Gestion des états de survol

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