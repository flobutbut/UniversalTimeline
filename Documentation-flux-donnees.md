# Documentation des Flux de Données

## Architecture Actuelle

### Vue d'ensemble
L'application utilise une architecture modulaire basée sur des composables Vue 3 avec un store partagé pour mutualiser le chargement des données entre les vues.

### Store Partagé
```typescript
// useDatabaseDataStore.ts
const periods = ref<ListPeriod[]>([]);
const events = ref<ListEvent[]>([]);
const stories = ref<ListStory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
```

## Flux de Démarrage

```mermaid
graph TD
    A[App.vue] --> B[Router]
    B --> C[HomeView.vue]
    C --> D[useHomeNavigation]
    D --> E[WikidataQueryService.loadPeriod]
    E --> F[Requête SPARQL Wikidata]
    F --> G[Transformation Period]
    G --> H[Affichage PeriodCard]
    
    B --> I[DatabaseView.vue]
    I --> J[useDatabaseView]
    J --> K[useDatabaseDataStore]
    K --> L[DatabaseViewService.loadListData]
    L --> M[DatabaseQueryService]
    M --> N[PostgreSQL]
    
    B --> O[GraphView.vue]
    O --> P[useGraphView]
    P --> K
```

1. **App.vue** se charge avec le router
2. **HomeView** : Navigation hiérarchique dans les périodes géologiques
3. **DatabaseView** : Gestion des données avec store partagé
4. **GraphView** : Visualisation hiérarchique avec drag & drop

## Flux de Navigation (HomeView)

### Clic sur une période
```mermaid
graph TD
    A[Click utilisateur] --> B[PeriodCard.vue]
    B --> C[Événement 'select']
    C --> D[PeriodGrid.handlePeriodClick]
    D --> E[HomeView.handlePeriodClick]
    E --> F[useHomeNavigation]
    F --> G[WikidataQueryService.loadPeriod]
    G --> H[Requête SPARQL]
    H --> I[Transformation Period]
    I --> J[Mise à jour parentStack]
    J --> K[Affichage enfants]
```

### Navigation arrière
```mermaid
graph TD
    A[Click retour] --> B[BackButton.vue]
    B --> C[HomeView.goBack]
    C --> D[Retrait parentStack]
    D --> E[Chargement parent]
    E --> F[Mise à jour affichage]
```

## Flux de Données (DatabaseView/GraphView)

### Chargement initial
```mermaid
graph TD
    A[DatabaseView/GraphView] --> B[useDatabaseDataStore]
    B --> C[ensureDataLoaded]
    C --> D[DatabaseViewService.loadListData]
    D --> E[DatabaseQueryService]
    E --> F[PostgreSQL]
    F --> G[Store partagé]
    G --> H[Affichage]
```

### Mise à jour des données
```mermaid
graph TD
    A[Modification] --> B[useDatabaseSave]
    B --> C[DatabaseQueryService]
    C --> D[PostgreSQL]
    D --> E[Store partagé]
    E --> F[DatabaseViewService]
    F --> G[Mise à jour UI]
```

## Flux de Gestion des Erreurs

```mermaid
graph TD
    A[Détection erreur] --> B[Capture erreur]
    B --> C[Log erreur]
    C --> D[Mise à jour état]
    D --> E[Affichage message]
    E --> F[Proposition rechargement]
    F --> G[Retry automatique]
```

## Flux de Drag & Drop (GraphView)

```mermaid
graph TD
    A[Drag start] --> B[useGraphDragDrop]
    B --> C[Validation cycle]
    C --> D[DatabaseQueryService.updatePeriodParent]
    D --> E[PostgreSQL]
    E --> F[Store partagé]
    F --> G[Mise à jour UI]
```

## Flux d'Import Wikidata

```mermaid
graph TD
    A[Import Wikidata] --> B[useWikidataImport]
    B --> C[WikidataQueryService]
    C --> D[Requête SPARQL]
    D --> E[ConflictResolutionService]
    E --> F[DatabaseQueryService.create]
    F --> G[PostgreSQL]
    G --> H[Store partagé]
```

## Flux de Gestion de la Langue

```mermaid
graph TD
    A[Changement langue] --> B[LanguageSelector]
    B --> C[Mise à jour config]
    C --> D[Rechargement données]
    D --> E[Mise à jour labels]
```

## Optimisations

### Store Partagé
- **Mutualisation** : DatabaseView et GraphView partagent les mêmes données
- **Chargement unique** : Une seule requête pour les deux vues
- **Mise à jour dynamique** : Rafraîchissement automatique après modifications

### Chargement Progressif
- **Store partagé** : Évite les requêtes multiples
- **Chargement lazy** : Données à la demande
- **Mise à jour ciblée** : Seules les données modifiées sont rafraîchies

### Gestion des Erreurs
- **Retries automatiques** : Maximum 3 tentatives
- **Messages d'erreur explicites** : Feedback utilisateur clair
- **Possibilité de rechargement** : Bouton retry
- **Logs détaillés** : Traçabilité complète

### Performance
- **Requêtes parallèles** : Chargement simultané des données
- **Chargement à la demande** : Données chargées quand nécessaire
- **Gestion de la mémoire** : Optimisation des références
- **Timeout** : 30 secondes avec retry

## Types de Données Principaux

### Types Base de Données
```typescript
interface ListPeriod {
  id: string;
  label: MultilingualText;
  startDate: string;
  endDate: string;
  categories: Category[];
}

interface ListEvent {
  id: string;
  label: MultilingualText;
  date: string;
  categories: Category[];
}

interface ListStory {
  id: string;
  title: MultilingualText;
  categories: Category[];
}
```

### Types Wikidata
```typescript
interface Period {
  id: string;
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  startDate: string;
  endDate: string;
  hasParent: boolean;
  children: string[];
  temporalLocation: string;
  categories: Category[];
}

interface TemporalLocation {
  startDate?: string;
  endDate?: string;
  location: string;
}
```

## Services Clés

### Accès aux Données
- **`DatabaseQueryService`** : Interface PostgreSQL
- **`WikidataQueryService`** : Requêtes SPARQL Wikidata
- **`WikidataSearchService`** : Recherche Wikidata

### Logique Métier
- **`DatabaseViewService`** : Service spécialisé pour DatabaseView
- **`StoryService`** : Gestion des stories
- **`ConflictResolutionService`** : Résolution des conflits
- **`TimelineScalingService`** : Calculs de positionnement temporel

### Composables
- **`useDatabaseDataStore`** : Store partagé
- **`useDatabaseView`** : Logique DatabaseView
- **`useGraphView`** : Logique GraphView
- **`useHomeNavigation`** : Navigation HomeView
- **`useDatabaseSave`** : Sauvegarde avec retry
- **`useDatabaseDelete`** : Suppression
- **`useGraphDragDrop`** : Drag & drop
- **`useGraphModals`** : Modales GraphView
- **`useEditModal`** : Formulaires d'édition
- **`useWikidataImport`** : Import Wikidata
- **`useParentChildManagement`** : Relations hiérarchiques
- **`useConflictResolution`** : Résolution des conflits

## Points d'Attention

### Performance
- **Store partagé** : Évite les requêtes multiples
- **Chargement lazy** : Données à la demande
- **Mise à jour ciblée** : Rafraîchissement sélectif
- **Filtrage client** : Recherche temps réel

### Gestion de la Mémoire
- **Références partagées** : Évite la duplication
- **Nettoyage automatique** : Gestion des cycles
- **Optimisation des watchers** : Évite les fuites

### Expérience Utilisateur
- **Chargement optimisé** : Feedback visuel
- **Gestion des erreurs** : Messages clairs
- **Support multilingue** : Français et anglais
- **Interface responsive** : Design adaptatif

### Sécurité
- **Validation des données** : Côté client et serveur
- **Sanitisation** : Nettoyage des entrées
- **Gestion des erreurs** : Try/catch robuste
- **Logs structurés** : Traçabilité complète 