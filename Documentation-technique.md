# Documentation Technique

## Architecture

### Vue d'ensemble
L'application utilise une architecture modulaire basée sur Vue 3 avec Composition API, TypeScript et des services spécialisés.

### Structure des dossiers
```
src/
├── components/          # Composants Vue réutilisables
│   ├── base/           # Composants de base (Button, Input, etc.)
│   ├── WikidataImportButton.vue  # Composant spécialisé pour l'import Wikidata
│   └── ...
├── composables/         # Composables Vue 3 (logique métier réutilisable)
│   ├── useEditModal.ts           # Gestion des formulaires d'édition
│   ├── useWikidataImport.ts      # Import des données Wikidata
│   └── useParentChildManagement.ts # Gestion des relations parent/enfant
├── services/           # Services métier
│   ├── DatabaseQueryService.ts   # Accès aux données de la base
│   ├── WikidataQueryService.ts   # Requêtes vers Wikidata
│   ├── ConflictResolutionService.ts # Gestion des conflits
│   └── ...
├── validators/         # Validation des données
│   └── editFormValidators.ts     # Validation centralisée des formulaires
├── types/              # Définitions TypeScript
├── utils/              # Utilitaires
└── views/              # Pages de l'application
```

## Composables Vue 3

### useEditModal
Gère l'état et la logique des formulaires d'édition pour les périodes, événements et stories.

**Fonctionnalités :**
- Gestion réactive du formulaire
- Validation en temps réel
- Préparation des données pour soumission
- Gestion des états de chargement et d'erreur

**Interface :**
```typescript
interface EditFormData {
  qid: string;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  startDate: string;
  endDate: string;
  date: string;
  location: string;
  author: string;
  isPublic: boolean;
  parentId: string | null;
}

interface EditModalState {
  loading: boolean;
  error: string | null;
  isValid: boolean;
  qidError: string;
  qidExistsInBase: boolean;
  existingItem: any;
  directChildrenCount: string;
}
```

### useWikidataImport
Gère l'import et la transformation des données depuis Wikidata.

**Fonctionnalités :**
- Import de périodes et événements depuis Wikidata
- Transformation des données pour le format de l'application
- Gestion des erreurs d'import
- Support multilingue

**Interface :**
```typescript
interface WikidataData {
  label: string | { fr?: string; en?: string };
  description?: { fr: string; en: string };
  date?: string;
  temporalData?: TemporalLocation[];
  children?: any[];
}
```

### useParentChildManagement
Gère les relations hiérarchiques entre les éléments.

**Fonctionnalités :**
- Validation des Q-ids
- Détection de conflits
- Gestion des relations parent/enfant
- Comptage des enfants

## Services

### DatabaseQueryService
Service singleton pour l'accès aux données de la base PostgreSQL.

**Méthodes principales :**
- `getAllPeriods()` : Récupération de toutes les périodes
- `getAllEvents()` : Récupération de tous les événements
- `createPeriod(data)` : Création d'une période
- `updatePeriod(id, data)` : Mise à jour d'une période
- `deletePeriod(id)` : Suppression d'une période
- `loadChildren(periodId)` : Chargement des enfants d'une période

### WikidataQueryService
Service pour les requêtes SPARQL vers Wikidata.

**Méthodes principales :**
- `loadPeriod(periodId)` : Chargement d'une période depuis Wikidata
- `loadEvent(eventId)` : Chargement d'un événement depuis Wikidata
- `buildTemporalQuery(periodId)` : Construction des requêtes temporelles

### ConflictResolutionService
Service pour la gestion des conflits lors de la création/édition.

**Fonctionnalités :**
- Détection de conflits par Q-id
- Résolution automatique des conflits
- Stratégies de résolution personnalisées
- Validation de cohérence des données

**Interface :**
```typescript
interface ConflictInfo {
  hasConflict: boolean;
  existingItem: any;
  conflictType: 'period' | 'event' | 'story';
  message: string;
}

interface ResolutionStrategy {
  action: 'keep' | 'replace' | 'merge' | 'cancel';
  message: string;
  requiresConfirmation: boolean;
}
```

## Validation

### EditFormValidator
Classe statique pour la validation centralisée des formulaires.

**Méthodes :**
- `validateQid(qid)` : Validation du format Q-id
- `validateTitle(title)` : Validation des titres multilingues
- `validateDescription(description)` : Validation des descriptions
- `validateDate(date, fieldName)` : Validation des dates
- `validatePeriod(data)` : Validation complète d'une période
- `validateEvent(data)` : Validation complète d'un événement
- `validateStory(data)` : Validation complète d'une story

**Interface :**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

## Composants

### WikidataImportButton
Composant spécialisé pour l'import de données depuis Wikidata.

**Props :**
- `qid: string` : Q-id Wikidata à importer
- `type: 'period' | 'event'` : Type d'élément à importer

**Events :**
- `import-success(data)` : Import réussi
- `import-error(error)` : Erreur d'import

### EditModal
Composant principal pour l'édition et la création d'éléments.

**Refactoring effectué :**
- Extraction de la logique métier dans des composables
- Utilisation des services de validation et de résolution de conflits
- Simplification du code du composant
- Amélioration de la maintenabilité

## Types de données

### Period
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
  createdAt: Date;
  updatedAt: Date;
}
```

### Event
```typescript
interface Event {
  id: string;
  wikidata_id?: string;
  label: MultilingualText;
  description?: MultilingualText;
  date: string;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

### MultilingualText
```typescript
interface MultilingualText {
  fr: string;
  en: string;
}
```

## Gestion des erreurs

### Stratégie de gestion
1. **Validation côté client** : Utilisation d'EditFormValidator
2. **Gestion des conflits** : ConflictResolutionService
3. **Retry automatique** : Pour les requêtes Wikidata
4. **Feedback utilisateur** : Messages d'erreur explicites

### Logging
- Logs structurés avec préfixes de contexte
- Niveaux de log appropriés (info, warn, error)
- Informations de débogage pour le développement

## Performance

### Optimisations
- **Composables réutilisables** : Évite la duplication de code
- **Validation centralisée** : Réduction des appels de validation
- **Gestion d'état optimisée** : Utilisation de reactive() et computed()
- **Services singleton** : Réduction de l'instanciation

### Monitoring
- Temps de réponse des requêtes
- Utilisation mémoire des composables
- Performance des validations

## Sécurité

### Validation des données
- Validation côté client et serveur
- Sanitisation des entrées utilisateur
- Protection contre les injections SQL

### Gestion des conflits
- Détection automatique des doublons
- Résolution sécurisée des conflits
- Audit des modifications

## Tests

### Stratégie de test
- Tests unitaires pour les composables
- Tests d'intégration pour les services
- Tests de validation pour les formulaires

### Couverture
- Logique métier des composables
- Validation des données
- Gestion des erreurs
- Résolution des conflits

## Stack Technique
- Frontend :
  - Vue.js 3 avec Composition API
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