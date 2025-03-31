# Comparaison des Requêtes SPARQL

## Contexte
Ce document compare deux versions des requêtes SPARQL utilisées pour récupérer les données des périodes géologiques depuis Wikidata.

## Versions Comparées

### Version Originale
```sparql
SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate ?location ?locationLabel
WHERE {
  ${parentFilter}  // Soit les éons principaux, soit les enfants d'un parent
  OPTIONAL { ?item wdt:P580 ?startDate. }
  OPTIONAL { ?item wdt:P582 ?endDate. }
  OPTIONAL { 
    ?item wdt:P17 ?location.
    FILTER(EXISTS { ?location rdfs:label ?locationLabel. })
  }
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${language}".
    ?item rdfs:label ?itemLabel.
    ?location rdfs:label ?locationLabel.
  }
}
ORDER BY DESC(?startDate)
```

### Version Actuelle
```sparql
SELECT DISTINCT ?item ?itemLabel 
    (SAMPLE(?startDate) AS ?debut) 
    (SAMPLE(?endDate) AS ?fin) 
    ?categoryId ?categoryLabel
    (GROUP_CONCAT(DISTINCT ?locationLabel; separator=", ") AS ?locations)
    (COUNT(DISTINCT ?child) AS ?childCount)
WHERE {
  VALUES ?item { ... }  // Liste des éons
  OPTIONAL { ?item wdt:P580 ?startDate. }
  OPTIONAL { ?item wdt:P582 ?endDate. }
  OPTIONAL { ?item wdt:P31 ?categoryId. }
  OPTIONAL { 
    {?item wdt:P17 ?locationEntity}
    UNION {?item wdt:P276 ?locationEntity}
    UNION {?item wdt:P131 ?locationEntity}
  }
  OPTIONAL {
    { ?child wdt:P361 ?item } 
    UNION { ?item wdt:P527 ?child }
  }
  SERVICE wikibase:label { ... }
}
GROUP BY ?item ?itemLabel ?categoryId ?categoryLabel
ORDER BY ?debut
```

## Différences Principales

### 1. Gestion des Catégories
- **Version Originale** : 
  - Pas de gestion des catégories
  - Focus uniquement sur les informations de base
  - Utilise une liste prédéfinie des éons principaux
  - Relation parent-enfant directe via `P361` (partie de)

- **Version Actuelle** :
  - Ajout de `?categoryId` et `?categoryLabel` via `wdt:P31`
  - Permet de catégoriser les périodes (éon, ère, période, etc.)
  - Enrichit les données avec des informations taxonomiques
  - Double vérification des enfants via `P361` et `P527`

### 2. Gestion de la Localisation
- **Version Originale** :
  - Utilise uniquement `wdt:P17` (situé dans)
  - Filtre sur l'existence du label de localisation

- **Version Actuelle** :
  - Utilise trois propriétés :
    - `P17` (situé dans)
    - `P276` (lieu)
    - `P131` (situé dans une entité administrative)
  - Agrège les localisations avec `GROUP_CONCAT`
  - Permet plus de résultats mais potentiellement des doublons

### 3. Gestion des Enfants
- **Version Originale** :
  - Approche directe avec `wdt:P361` (partie de)
  - Liste prédéfinie des éons principaux
  - Pas de vérification de catégorie
  - Plus simple et plus directe

- **Version Actuelle** :
  - Double vérification avec `P361` et `P527`
  - Vérification des catégories
  - Comptage des enfants
  - Plus complexe mais plus riche en informations

### 4. Agrégation
- **Version Originale** :
  - Pas d'agrégation
  - Retourne toutes les lignes distinctes

- **Version Actuelle** :
  - Utilise `SAMPLE` pour les dates
  - Utilise `GROUP_CONCAT` pour les localisations
  - Compte les enfants avec `COUNT(DISTINCT)`
  - Peut potentiellement perdre des informations à cause des agrégations

### 5. Tri
- **Version Originale** :
  - `ORDER BY DESC(?startDate)`
  - Tri décroissant par date de début

- **Version Actuelle** :
  - `ORDER BY ?debut`
  - Tri croissant par date de début
  - Utilise la variable agrégée `?debut`

## Impact sur les Résultats

### Avantages de la Version Actuelle
1. Plus d'informations (catégories, enfants)
2. Meilleure organisation des données
3. Support multilingue amélioré
4. Gestion plus complète des localisations

### Inconvénients de la Version Actuelle
1. Possible perte d'informations à cause des agrégations
2. Résultats potentiellement différents de la version originale
3. Complexité accrue de la requête
4. Performance potentiellement impactée

## Problèmes à Résoudre
1. Aligner les résultats avec la version originale
2. Optimiser les agrégations pour ne pas perdre d'informations
3. Améliorer la gestion des doublons dans les localisations
4. Maintenir la performance malgré la complexité accrue

## Prochaines Étapes
1. Analyser en détail les différences de résultats
2. Proposer des modifications pour harmoniser les résultats
3. Tester les performances des deux versions
4. Documenter les choix techniques 