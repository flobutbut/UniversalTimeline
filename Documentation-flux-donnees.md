# Documentation des Flux de Données

## Table des matières
1. [Flux de démarrage](#flux-de-démarrage)
2. [Flux de navigation](#flux-de-navigation)
3. [Flux de chargement progressif](#flux-de-chargement-progressif)
4. [Flux de gestion des erreurs](#flux-de-gestion-des-erreurs)
5. [Flux de mise en cache](#flux-de-mise-en-cache)
6. [Flux de chargement des détails](#flux-de-chargement-des-détails)
7. [Flux de gestion de la langue](#flux-de-gestion-de-la-langue)
8. [Optimisations](#optimisations)

## Flux de démarrage

```mermaid
graph TD
    A[App.vue] --> B[GeologicalPeriods.vue]
    B --> C[WikidataTimelineService.getMainEons]
    C --> D{CacheService}
    D -->|Cache miss| E[Requête SPARQL Wikidata]
    D -->|Cache hit| F[Données du cache]
    E --> G[Transformation SimplePeriod]
    F --> G
    G --> H[Mise en cache]
    H --> I[Affichage GeologicalPeriodCard]
```

1. App.vue se charge
2. GeologicalPeriods.vue est initialisé
3. WikidataTimelineService.getMainEons() est appelé
4. CacheService vérifie si les éons sont en cache
5. Si pas en cache → Requête SPARQL à Wikidata
6. Transformation des données en SimplePeriod[]
7. Mise en cache des résultats
8. Affichage des éons dans GeologicalPeriodCard[]

## Flux de navigation

### Clic sur une période
```mermaid
graph TD
    A[Click utilisateur] --> B[GeologicalPeriodCard.vue]
    B --> C[Événement 'select']
    C --> D[GeologicalPeriods.selectPeriod]
    D --> E[ProgressiveLoadingService]
    E --> F[WikidataTimelineService.getChildren]
    F --> G{CacheService}
    G -->|Cache miss| H[Requête SPARQL]
    G -->|Cache hit| I[Données du cache]
    H --> J[Transformation]
    I --> J
    J --> K[Mise en cache]
    K --> L[Mise à jour navigation]
    L --> M[Affichage enfants]
```

### Navigation arrière
```mermaid
graph TD
    A[Click retour] --> B[GeologicalPeriods.goBack]
    B --> C[Retrait navigationStack]
    C --> D{CacheService}
    D -->|Cache miss| E[Chargement parent]
    D -->|Cache hit| F[Données du cache]
    E --> G[Mise à jour affichage]
    F --> G
```

## Flux de chargement progressif

```mermaid
graph TD
    A[Observation cartes] --> B[Carte visible]
    B --> C[ProgressiveLoadingService]
    C --> D{CacheService}
    D -->|Cache miss| E[Chargement détails]
    D -->|Cache hit| F[Données du cache]
    E --> G[Mise à jour état]
    F --> G
    G --> H[Affichage progressif]
```

## Flux de gestion des erreurs

```mermaid
graph TD
    A[Détection erreur] --> B[Capture erreur]
    B --> C[Log erreur]
    C --> D[Mise à jour état]
    D --> E[Affichage message]
    E --> F[Proposition rechargement]
```

## Flux de mise en cache

```mermaid
graph TD
    A[Données Wikidata] --> B[Transformation]
    B --> C[Génération clé]
    C --> D[Vérification durée]
    D --> E[Stockage cache]
    E --> F[Mise à jour stats]
```

## Flux de chargement des détails

```mermaid
graph TD
    A[Période sélectionnée] --> B[ProgressiveLoadingService]
    B --> C[Chargement parallèle]
    C --> D[Données de base]
    C --> E[Localisations]
    C --> F[Enfants]
    D --> G[Fusion données]
    E --> G
    F --> G
    G --> H[Mise en cache]
    H --> I[Mise à jour affichage]
```

## Flux de gestion de la langue

```mermaid
graph TD
    A[Changement langue] --> B[Mise à jour config]
    B --> C[Invalidation cache]
    C --> D[Rechargement données]
    D --> E[Mise à jour labels]
```

## Optimisations

### Système de Cache
- Durée de validité configurable
- Taille maximale limitée
- Statistiques de performance
- Nettoyage automatique

### Chargement Progressif
- Observation des éléments visibles
- Priorisation des chargements
- Gestion de la file d'attente
- Préchargement intelligent

### Gestion des Erreurs
- Retries automatiques
- Messages d'erreur explicites
- Possibilité de rechargement
- Logs détaillés

### Performance
- Requêtes parallèles
- Mise en cache optimisée
- Chargement à la demande
- Gestion de la mémoire

## Notes techniques

### Types de données principaux
```typescript
interface SimplePeriod {
  id: string;
  label: string;
  startDate?: string;
  endDate?: string;
  locations: string[];
  hasChildren: boolean;
}

interface Period extends SimplePeriod {
  children: Period[];
  temporalLocations: TemporalLocation[];
  loading: boolean;
  childrenPreloaded: boolean;
}
```

### Services clés
- WikidataTimelineService : Gestion des données
- CacheService : Optimisation des performances
- ProgressiveLoadingService : Chargement intelligent

### Points d'attention
- Gestion de la mémoire
- Performance des requêtes
- Expérience utilisateur
- Gestion des erreurs 