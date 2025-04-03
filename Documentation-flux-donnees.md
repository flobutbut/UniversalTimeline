# Documentation des Flux de Données

## Table des matières
1. [Flux de démarrage](#flux-de-démarrage)
2. [Flux de navigation](#flux-de-navigation)
3. [Flux de gestion des erreurs](#flux-de-gestion-des-erreurs)
4. [Flux de chargement des détails](#flux-de-chargement-des-détails)
5. [Flux de gestion de la langue](#flux-de-gestion-de-la-langue)
6. [Optimisations](#optimisations)

## Flux de démarrage

```mermaid
graph TD
    A[App.vue] --> B[GeologicalPeriods.vue]
    B --> C[WikidataQueryService.loadPeriod]
    C --> D[Requête SPARQL Wikidata]
    D --> E[Transformation Period]
    E --> F[Affichage GeologicalPeriodCard]
```

1. App.vue se charge
2. GeologicalPeriods.vue est initialisé
3. WikidataQueryService.loadPeriod() est appelé
4. Requête SPARQL à Wikidata
5. Transformation des données en Period[]
6. Affichage des éons dans GeologicalPeriodCard[]

## Flux de navigation

### Clic sur une période
```mermaid
graph TD
    A[Click utilisateur] --> B[GeologicalPeriodCard.vue]
    B --> C[Événement 'select']
    C --> D[GeologicalPeriods.selectPeriod]
    D --> E[WikidataQueryService.getChildren]
    E --> F[Requête SPARQL]
    F --> G[Transformation]
    G --> H[Mise à jour navigation]
    H --> I[Affichage enfants]
```

### Navigation arrière
```mermaid
graph TD
    A[Click retour] --> B[GeologicalPeriods.goBack]
    B --> C[Retrait navigationStack]
    C --> D[Chargement parent]
    D --> E[Mise à jour affichage]
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

## Flux de chargement des détails

```mermaid
graph TD
    A[Période sélectionnée] --> B[Chargement parallèle]
    B --> C[Données de base]
    B --> D[Localisations]
    B --> E[Enfants]
    C --> F[Fusion données]
    D --> F
    E --> F
    F --> G[Mise à jour affichage]
```

## Flux de gestion de la langue

```mermaid
graph TD
    A[Changement langue] --> B[Mise à jour config]
    B --> C[Rechargement données]
    C --> D[Mise à jour labels]
```

## Optimisations

### Chargement Progressif
- Observation des éléments visibles
- Gestion des états de chargement
- Préchargement intelligent

### Gestion des Erreurs
- Retries automatiques (max 3)
- Messages d'erreur explicites
- Possibilité de rechargement
- Logs détaillés

### Performance
- Requêtes parallèles
- Chargement à la demande
- Gestion de la mémoire
- Timeout de 30 secondes

## Notes techniques

### Types de données principaux
```typescript
interface Period {
  id: string;              // Identifiant Wikidata
  label: string;           // Nom de la période
  temporalData: TemporalLocation[]; // Données temporelles avec localisations
  hasChildren: boolean;    // Indique si la période a des sous-périodes
  isMainEon: boolean;      // Indique si c'est un éon principal
  categoryIds: string[];   // IDs des catégories
  categoryLabels: string[]; // Labels des catégories
  children: Period[];      // Liste des périodes enfants
  loading: boolean;        // État de chargement
  childrenPreloaded: boolean; // État de préchargement des enfants
  locations: string[];     // Liste des localisations
  directLocations: string[]; // Localisations directes
}

interface TemporalLocation {
  startDate?: string;      // Date de début formatée
  endDate?: string;        // Date de fin formatée
  location: string;        // Localisation associée
}
```

### Services clés
- WikidataQueryService : Gestion des données et requêtes SPARQL
- DatabaseQueryService : Gestion des données de la base de données locale
- TimelineScalingService : Calcul des positions et dimensions des périodes
- StoryService : Gestion des stories géologiques
- DatabaseService : Opérations CRUD sur la base de données
- DatabaseImportService : Import des données depuis Wikidata
- WikidataSearchService : Recherche dans Wikidata

### Points d'attention
- Gestion de la mémoire
- Performance des requêtes
- Expérience utilisateur
- Gestion des erreurs
- Support multilingue (fr, en) 