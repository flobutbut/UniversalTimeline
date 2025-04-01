# Documentation Technique

## Architecture

Le projet utilise Vue 3 avec TypeScript pour créer une interface de navigation des périodes géologiques en utilisant l'API SPARQL de Wikidata.

### Structure du Projet
```
src/
├── components/
│   ├── GeologicalPeriods.vue
│   ├── GeologicalPeriodCard.vue
│   ├── LanguageSelector.vue
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

interface WikidataBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  startDate?: { value: string };
  endDate?: { value: string };
  startLocationLabel?: { value: string };
  endLocationLabel?: { value: string };
  childCount?: { value: string };
  child?: { value: string };
  childLabel?: { value: string };
}
```

## Services

### Service WikidataTimeline (`wikidataTimeline.ts`)
- Gestion des requêtes SPARQL vers l'API Wikidata
- Transformation des données brutes en objets typés
- Gestion des erreurs et des timeouts
- Logging détaillé pour le débogage
- Gestion avancée des dates avec différents formats
- Support multilingue (fr, en)
- Gestion des localisations temporelles

### Système de Logging
Le service utilise un système de logging structuré avec différents niveaux et catégories :

#### Catégories de Logs
1. **[Timeline]** - Logs des interactions utilisateur
   - Préfixé par `##` pour une meilleure visibilité
   - Suit le flux de navigation et les actions utilisateur
   - Affiche les labels des périodes pour une meilleure lisibilité

2. **[API]** - Logs des requêtes et réponses
   - Détails des requêtes SPARQL
   - Tentatives de reconnexion
   - Erreurs d'API

3. **[SPARQL]** - Logs des requêtes SPARQL
   - Génération des requêtes
   - Paramètres utilisés

#### Exemple de Flux de Logs
```
## [Timeline] Chargement initial des éons principaux
[API] Requête SPARQL pour les éons principaux
## [Timeline] Éons principaux chargés: Hadéen, Archéen, Protérozoïque, Phanérozoïque
```

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
- `loadPeriod(periodId: string): Promise<Period>`
- `getChildren(parentId: string): Promise<Period[]>`

### Fonctionnalités
- Retry automatique en cas d'erreur
- Support multilingue (fr, en)
- Requêtes SPARQL optimisées
- Gestion des localisations temporelles

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

### LanguageSelector.vue
Composant pour la sélection de langue.

#### Fonctionnalités
- Sélection de la langue
- Mise à jour de la langue de l'interface

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
- Support multilingue (fr, en)
- Gestion des erreurs
- Timeout de 30 secondes
- Maximum 3 tentatives de retry
- Délai de 1 seconde entre les tentatives

### Système de Gestion des Erreurs
#### Erreurs
- Messages d'erreur localisés
- Codes d'erreur spécifiques
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
  ?startLocationLabel ?endLocationLabel
  (COUNT(DISTINCT ?child) AS ?childCount)
WHERE {
  VALUES ?item { wd:${periodId} }
  
  # Labels
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
    ?item rdfs:label ?itemLabel.
  }

  # Start time avec localisations
  OPTIONAL {
    ?item p:P580 ?startStatement.
    ?startStatement ps:P580 ?startDate.
    OPTIONAL {
      ?startStatement pq:P518 ?startLocation.
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
        ?startLocation rdfs:label ?startLocationLabel.
      }
    }
  }

  # End time avec localisations
  OPTIONAL {
    ?item p:P582 ?endStatement.
    ?endStatement ps:P582 ?endDate.
    OPTIONAL {
      ?endStatement pq:P518 ?endLocation.
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "${this.defaultLanguages.join(',')}".
        ?endLocation rdfs:label ?endLocationLabel.
      }
    }
  }

  # Enfants
  OPTIONAL {
    ?child wdt:P361 ?item.
  }
}
GROUP BY ?item ?itemLabel ?startDate ?endDate ?startLocationLabel ?endLocationLabel
ORDER BY ?startDate
```

### Principales modifications

1. **Construction dynamique** :
   - Liste des éons principaux définie en constantes
   - Filtre parent adaptatif selon le contexte
   - Support multilingue (fr, en)
   - Gestion des localisations temporelles

2. **Optimisation des requêtes** :
   - Optimisation des agrégations avec GROUP_CONCAT
   - Meilleure gestion des labels
   - Vérification de l'existence des labels pour les localisations
   - Support des localisations avec P518

3. **Navigation** :
   - Pile de navigation simplifiée
   - Gestion des états de chargement par période
   - Meilleure gestion des erreurs

4. **Gestion des langues** :
   - Support multilingue (fr, en)
   - Gestion des labels vides ou malformés

## Performance

### Optimisations
1. **Requêtes**
   - Utilisation de DISTINCT pour éviter les doublons
   - Agrégation optimisée des données
   - Optimisation des jointures

2. **Chargement progressif**
   - Chargement initial des éons principaux
   - Chargement à la demande des sous-périodes
   - Vérification asynchrone des enfants

### Monitoring
- Logs des requêtes SPARQL
- Suivi des erreurs
- Métriques de performance

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
- Langues par défaut : fr, en
- Gestion des labels vides ou malformés

### Requête SPARQL
```sparql
SERVICE wikibase:label {
  bd:serviceParam wikibase:language "[fr,en]".
  ?item rdfs:label ?itemLabel.
}
```

### Transformation des données
1. Label disponible dans la langue préférée
2. Label disponible dans une langue de secours
3. Label vide ou malformé -> utilisation de l'ID Wikidata

## Design System

### Architecture
Le design system est composé de trois fichiers principaux :
- `src/styles/variables.css` : Définition des variables CSS (couleurs, espacements, typographie, etc.)
- `src/styles/base.css` : Styles de base et classes utilitaires
- `src/style.css` : Styles spécifiques à l'application et import des autres fichiers

### Variables CSS
- Taille de base : 13px
- Système de couleurs cohérent
- Système d'espacement basé sur 8px
- Typographie responsive
- Breakpoints pour le responsive design

### Classes Utilitaires
- Classes de flexbox et grid
- Classes d'espacement
- Classes de couleurs
- Classes de typographie
- Classes responsives

### Performance
- Utilisation de variables CSS pour une maintenance optimale
- Pas de duplication de code
- Optimisation des sélecteurs CSS
- Support des préfixes vendeurs automatique

### Intégration
Le design system est intégré de manière non intrusive avec l'architecture existante :
- Compatible avec les composants Vue.js
- Respecte la structure de données existante
- S'intègre avec le système de formatage des dates
- Supporte le système de localisation

### Navigation
La navigation est gérée de manière hiérarchique :
- Affichage horizontal des périodes avec défilement
- Bouton de retour pour remonter dans la hiérarchie
- Gestion des états de chargement
- Gestion des erreurs avec retry