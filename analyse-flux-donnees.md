# Analyse du Flux de Données - Projet Timeline Géologique

## 1. État Actuel du Projet

### 1.1 Architecture Générale
- Frontend : Vue.js avec TypeScript
- Services :
  - `WikidataTimelineService` : Gestion des requêtes Wikidata
  - `CacheService` : Mise en cache des données
  - `ProgressiveLoadingService` : Chargement progressif des données
- Composants :
  - `GeologicalPeriods.vue` : Liste principale des périodes
  - `GeologicalPeriodCard.vue` : Affichage individuel des périodes

### 1.2 Flux de Données Actuel

#### 1.2.1 Requête SPARQL
```sparql
SELECT DISTINCT ?startDate ?endDate ?locationLabel ?statement
WHERE {
  wd:${periodId} p:P580 ?statement.
  ?statement ps:P580 ?startDate.
  OPTIONAL { ?statement pq:P518 ?location. }
  OPTIONAL { ?location rdfs:label ?locationLabel. }
  OPTIONAL { ?statement ps:P582 ?endDate. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
}
```

#### 1.2.2 Transformation des Données
```typescript
// Regroupement par statement
const locationMap = new Map<string, TemporalLocation>();
data.results.bindings.forEach(binding => {
  const key = statement || `${startDate}-${endDate}`;
  if (!locationMap.has(key)) {
    locationMap.set(key, {
      startDate,
      endDate,
      locations: []
    });
  }
  const temporalLocation = locationMap.get(key)!;
  if (!temporalLocation.locations.includes(locationLabel)) {
    temporalLocation.locations.push(locationLabel);
  }
});
```

#### 1.2.3 Affichage
- Les données sont affichées dans des cartes
- Chaque carte montre :
  - Le nom de la période
  - Les dates de début et fin
  - Les localisations (regroupées par statement)

### 1.3 Problèmes Identifiés
1. Regroupement incorrect des localisations
2. Perte de la relation individuelle entre dates et localisations
3. Affichage "Globale" pour toutes les instances d'une période

## 2. Structure des Données Wikidata

### 2.1 Exemple : Âge du Bronze (Q11761)
```
Période: Âge du bronze
├── Statement 1
│   ├── Date de début: -3299
│   ├── Date de fin: -1199
│   └── Localisations:
│       ├── Afrique
│       ├── Moyen-Orient
│       └── sous-continent indien
├── Statement 2
│   ├── Date de début: -3199
│   ├── Date de fin: -599
│   └── Localisation: Europe
└── Statement 3
    ├── Date de début: -3099
    ├── Date de fin: -299
    └── Localisation: Asie de l'Est
```

### 2.2 Relations Wikidata
- `P580` : Point de début
- `P582` : Point de fin
- `P518` : Apply to part (localisation)
- `rdfs:label` : Label de la localisation

## 3. Flux de Données Souhaité

### 3.1 Structure de Données
```
Période: Âge du bronze
├── Instance 1
│   ├── Date de début: -3299
│   ├── Date de fin: -1199
│   └── Localisation: Afrique
├── Instance 2
│   ├── Date de début: -3299
│   ├── Date de fin: -1199
│   └── Localisation: Moyen-Orient
├── Instance 3
│   ├── Date de début: -3299
│   ├── Date de fin: -1199
│   └── Localisation: sous-continent indien
├── Instance 4
│   ├── Date de début: -3199
│   ├── Date de fin: -599
│   └── Localisation: Europe
└── Instance 5
    ├── Date de début: -3099
    ├── Date de fin: -299
    └── Localisation: Asie de l'Est
```

### 3.2 Requête SPARQL Modifiée
```sparql
SELECT DISTINCT ?startDate ?endDate ?locationLabel ?statement
WHERE {
  wd:${periodId} p:P580 ?statement.
  ?statement ps:P580 ?startDate.
  OPTIONAL { ?statement ps:P582 ?endDate. }
  {
    # Localisations directes sur les dates
    ?statement pq:P518 ?location.
    ?location rdfs:label ?locationLabel.
  }
  UNION
  {
    # Localisations sur les dates de début
    ?statement ps:P580 ?startDate;
              pq:P518 ?location.
    ?location rdfs:label ?locationLabel.
  }
  UNION
  {
    # Localisations sur les dates de fin
    ?statement ps:P582 ?endDate;
              pq:P518 ?location.
    ?location rdfs:label ?locationLabel.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
}
```

### 3.3 Transformation des Données
```typescript
interface TemporalLocation {
  startDate: string;
  endDate: string;
  location: string;
  statement: string;
}

// Création d'instances individuelles
const instances: TemporalLocation[] = data.results.bindings.map(binding => ({
  startDate: binding.startDate.value,
  endDate: binding.endDate.value,
  location: binding.locationLabel.value,
  statement: binding.statement.value
}));
```

## 4. Points Clés à Considérer

### 4.1 Requête SPARQL
- Récupération des localisations via `pq:P518`
- Association des localisations aux périodes temporelles
- Maintien des relations date/localisation

### 4.2 Transformation des Données
- Création d'instances individuelles
- Préservation des relations temporelles
- Gestion des données manquantes

### 4.3 Affichage
- Affichage distinct des instances
- Association correcte des localisations
- Navigation entre les instances

## 5. Complexité et Défis

### 5.1 Complexité Technique
- Structure hiérarchique des données Wikidata
- Relations multiples entre dates et localisations
- Cohérence temporelle à maintenir

### 5.2 Défis
- Performance avec de nombreuses instances
- Gestion de la mémoire
- Expérience utilisateur fluide

### 5.3 Cas Particuliers
- Données manquantes
- Périodes sans localisation
- Chevauchements temporels 