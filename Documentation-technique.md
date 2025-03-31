# Documentation Technique

## Architecture

Le projet utilise Vue 3 avec TypeScript pour créer une interface de navigation des périodes géologiques en utilisant l'API SPARQL de Wikidata.

### Structure du Projet
```
src/
├── components/
│   ├── GeologicalPeriods.vue
│   ├── GeologicalPeriodCard.vue
│   └── BackButton.vue
├── services/
│   └── wikidataTimeline.ts
├── types/
│   └── geological.ts
└── utils/
    └── dateFormatter.ts
```

## Structure de données

### Types principaux

```typescript
interface Period {
  id: string;              // Identifiant Wikidata
  label: string;           // Nom de la période
  startDate?: string;      // Date de début formatée
  endDate?: string;        // Date de fin formatée
  location?: string;       // Localisation principale
  hasChildren: boolean;    // Indique si la période a des sous-périodes
  isMainEon: boolean;      // Indique si c'est un éon principal
  categoryIds: string[];   // IDs des catégories (maintenant vide)
  categoryLabels: string[]; // Labels des catégories (maintenant vide)
  childrenPreloaded: boolean; // État de préchargement des enfants
  children: Period[];      // Liste des périodes enfants
  loading: boolean;        // État de chargement
}

interface SimplePeriod {
  id: string;              // Identifiant Wikidata
  label: string;           // Nom de la période
  startDate?: string;      // Date de début formatée
  endDate?: string;        // Date de fin formatée
  location?: string;       // Localisation principale
  hasChildren: boolean;    // Indique si la période a des sous-périodes
  isMainEon: boolean;      // Indique si c'est un éon principal
  categoryIds: string[];   // IDs des catégories (maintenant vide)
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  languages?: string[];    // Cascade de langues pour les labels
}
```

## Services

### Service WikidataTimeline (`wikidataTimeline.ts`)
- Gestion des requêtes SPARQL vers l'API Wikidata
- Transformation des données brutes en objets typés
- Gestion des erreurs et des timeouts
- Système de cache en mémoire
- Logging détaillé pour le débogage
- Gestion avancée des dates avec différents formats
- Cascade de langues (fr, en, es, de)
- Mécanisme de secours pour les labels

### Formatage des Dates (`dateFormatter.ts`)
- Classe utilitaire pour le formatage des dates
- Gestion des différents formats de dates :
  - Dates géologiques (années avant le présent)
  - Dates françaises (JJ/MM/AAAA)
  - Dates anglaises (MM/DD/YYYY)
- Conversion automatique des unités :
  - Ga (Giga-années) pour les dates ≥ 1 000 000 000 ans
  - Ma (Méga-années) pour les dates ≥ 1 000 000 ans
  - ans pour les dates < 1 000 000 ans

### Méthodes principales
- `getMainEons(options: QueryOptions): Promise<Period[]>`
- `getChildren(parentId: string, options: QueryOptions): Promise<SimplePeriod[]>`

### Fonctionnalités
- Gestion du cache avec expiration
- Retry automatique en cas d'erreur
- Support multilingue avec cascade de langues
- Requêtes SPARQL optimisées
- Mécanisme de secours pour les labels

## Composants

### GeologicalPeriods.vue
Composant principal qui gère l'affichage et la navigation dans la timeline.

#### Fonctionnalités
- Affichage des éons principaux
- Navigation dans la hiérarchie des périodes
- Gestion du chargement progressif
- Support multilingue
- Gestion des erreurs
- Contraste optimisé

### GeologicalPeriodCard.vue
Composant de présentation pour chaque période.

#### Fonctionnalités
- Affichage des informations de base
- Indication visuelle de la sélection
- Affichage des catégories
- Gestion des états de chargement
- Indication de la présence de sous-périodes
- Contraste optimisé

### BackButton.vue
Composant de navigation retour.

#### Fonctionnalités
- Affichage conditionnel basé sur la profondeur de navigation
- Styles isolés pour le bouton
- Émission d'événements de clic
- Contraste optimisé

## Configuration

### Technologies Utilisées
- Vue 3 avec Composition API
- TypeScript
- Axios pour les requêtes HTTP
- SPARQL pour les requêtes Wikidata

### Configuration Requise
- Node.js >= 16
- Yarn >= 1.22

### Installation
```bash
yarn install
```

### Scripts Disponibles
- `yarn dev` : Lance le serveur de développement
- `yarn build` : Compile le projet pour la production
- `yarn preview` : Prévisualise la version de production
- `yarn test` : Lance les tests unitaires
- `yarn test:coverage` : Lance les tests avec couverture
- `yarn test:ui` : Lance l'interface utilisateur des tests

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
- Support multilingue avec cascade de langues (fr, en, es, de) via la propriété privée `defaultLanguages`
- Pagination des résultats
- Gestion des erreurs
- Système de cache en mémoire
  - Durée de vie : 5 minutes (300000 ms)
  - Clé de cache : `{languages}-{parentId}-{categoryId}`
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
  - Timeout de 30 secondes par requête
- Erreurs retentées :
  - Erreurs réseau
  - Code 429 (Rate Limit)
  - Codes 503/504 (Service Unavailable)

#### Validation des Données
- Vérification de la structure de réponse
- Validation des champs obligatoires
- Transformation sécurisée des données

## Tests

### Structure des Tests
- Tests unitaires dans le dossier `__tests__/`
- Tests des composants Vue avec Vue Test Utils
- Tests du service Wikidata
- Tests des utilitaires de formatage

### Tests Unitaires du Service
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

### Tests des Composants
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

## Bonnes Pratiques

### Tests
- Tests unitaires pour les services
- Tests d'intégration pour les composants
- Mocks pour les dépendances externes
- Couverture de code > 80%

### Code
- Utilisation de TypeScript strict
- Documentation des fonctions
- Gestion des cas d'erreur
- Respect des conventions de nommage
- Composants réutilisables
- Styles isolés

### UI/UX
- Design responsive
- États de chargement
- Messages d'erreur clairs
- Navigation intuitive
- Transitions fluides
- Hiérarchie visuelle claire
- Contraste optimisé

## Propriétés Wikidata

### Localisation
- P276 (situé dans) : Première tentative, résultats incomplets
- P706 (situé sur le territoire géographique) : Deuxième tentative, résultats non concluants

La gestion de la localisation des périodes géologiques et archéologiques reste un défi à résoudre. Les propriétés testées ne donnent pas les résultats escomptés. 

### Requêtes SPARQL

La requête principale est construite dynamiquement en fonction des paramètres :

```sparql
# Définition des éons principaux (constantes dans le code)
VALUES ?item { 
  wd:Q104460  # Hadéen
  wd:Q104168  # Archéen
  wd:Q104162  # Protérozoïque
  wd:Q101313  # Phanérozoïque
}

# Requête principale
SELECT DISTINCT 
  ?item ?itemLabel 
  ?startDate ?endDate 
  (COALESCE(GROUP_CONCAT(DISTINCT ?locationLabel; separator=", "), "Globale") AS ?locations)
  (COUNT(DISTINCT ?child) AS ?childCount)
WHERE {
  # Filtre parent dynamique
  ${parentId ? `?item wdt:P361 wd:${parentId}.` : `VALUES ?item { wd:${mainEons.join(' wd:')} }`}
  
  # Dates
  OPTIONAL { ?item wdt:P580 ?startDate. }
  OPTIONAL { ?item wdt:P582 ?endDate. }
  
  # Localisation (avec vérification des labels)
  OPTIONAL { 
    {
      # Localisations directes
      { ?item wdt:P17 ?locationEntity }
      UNION { ?item wdt:P276 ?locationEntity }
      UNION { ?item wdt:P131 ?locationEntity }
    }
    UNION {
      # Localisations avec P518 (apply to part)
      ?item p:P518 ?statement.
      ?statement ps:P518 ?locationEntity.
      OPTIONAL { ?statement pq:P518 ?partEntity. }
    }
    UNION {
      # Localisations indirectes via les parties
      ?item wdt:P527 ?partEntity.
      { ?partEntity wdt:P17 ?locationEntity }
      UNION { ?partEntity wdt:P276 ?locationEntity }
      UNION { ?partEntity wdt:P131 ?locationEntity }
    }
    FILTER(EXISTS { ?locationEntity rdfs:label ?locationLabel. })
  }
  
  # Vérification des enfants
  OPTIONAL {
    ?child wdt:P361 ?item.
  }
  
  # Labels avec cascade de langues dynamique
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${languages.join(',')}".
    ?item rdfs:label ?itemLabel.
    ?locationEntity rdfs:label ?locationLabel.
  }
}
GROUP BY ?item ?itemLabel ?startDate ?endDate
ORDER BY ?startDate
LIMIT 100
```

### Principales modifications

1. **Construction dynamique** :
   - Liste des éons principaux définie en constantes
   - Filtre parent adaptatif selon le contexte
   - Cascade de langues construite dynamiquement
   - Valeur par défaut "Globale" pour les localisations manquantes

2. **Optimisation des requêtes** :
   - Optimisation des agrégations avec GROUP_CONCAT
   - Meilleure gestion des labels avec cascade de langues
   - Vérification de l'existence des labels pour les localisations
   - Support des localisations avec P518 et des relations indirectes

3. **Navigation** :
   - Pile de navigation simplifiée
   - Gestion des états de chargement par période
   - Meilleure gestion des erreurs

4. **Gestion des langues** :
   - Cascade de langues (fr, en, es, de)
   - Mécanisme de secours pour les labels
   - Gestion des labels vides ou malformés

## Performance

### Cache
Le système utilise un cache en mémoire avec les caractéristiques suivantes :
- Durée de vie : 5 minutes
- Clé de cache : `{language}-{parentId}-{categoryId}`
- Invalidation automatique après la durée de vie
- Stockage des résultats en mémoire

### Optimisations
1. **Requêtes**
   - Utilisation de DISTINCT pour éviter les doublons
   - Limitation du nombre de résultats (100 par requête)
   - Agrégation optimisée des données
   - Optimisation des jointures

2. **Cache**
   - Mise en cache des résultats fréquents
   - Réduction des appels à l'API
   - Invalidation intelligente
   - Cache distinct par combinaison d'options

3. **Chargement progressif**
   - Chargement initial des éons principaux
   - Chargement à la demande des sous-périodes
   - Vérification asynchrone des enfants

### Monitoring
- Logs des requêtes SPARQL
- Suivi des erreurs
- Métriques de performance
- État du cache

## Navigation

### Structure
- Pile de navigation (`navigationStack`) pour gérer l'historique
- État du parent courant (`currentParent`)
- Sélection de période (`selectedPeriod`)

### Flux
1. **Chargement Initial**
   - Affichage des éons principaux
   - `currentParent` initialisé à `null`

2. **Navigation Vers une Sous-période**
   - Mise à jour de `currentParent` avec l'ID de la période sélectionnée
   - Ajout de l'état précédent dans la pile de navigation
   - Chargement des sous-périodes si nécessaire

3. **Retour**
   - Restauration de l'état précédent depuis la pile
   - Mise à jour de `currentParent` avec l'ID du parent précédent
   - Réinitialisation si retour aux éons principaux

### États
- **Chargement** : Indicateur visuel pendant le chargement des données
- **Erreur** : Affichage des messages d'erreur avec option de réessai
- **Sélection** : Mise en évidence de la période sélectionnée
- **Navigation** : Bouton de retour conditionnel 

## Styles et Thème
- Utilisation de variables CSS pour les couleurs
- Support du mode clair/sombre
- Contraste optimisé pour l'accessibilité
- Transitions et animations fluides 

## Gestion des langues

### Configuration
- Langues par défaut : fr, en, es, de
- Mécanisme de secours : utilisation de l'ID Wikidata si aucun label n'est disponible
- Gestion des labels vides ou malformés

### Requête SPARQL
```sparql
SERVICE wikibase:label {
  bd:serviceParam wikibase:language "[fr,en,es,de]".
  ?item rdfs:label ?itemLabel.
}
```

### Transformation des données
1. Label disponible dans la langue préférée
2. Label disponible dans une langue de secours
3. Label vide ou malformé -> utilisation de l'ID Wikidata