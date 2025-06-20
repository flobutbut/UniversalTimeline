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
│   ├── useDatabaseView.ts        # Gestion de la vue DatabaseView
│   ├── useDatabaseSave.ts        # Gestion de la sauvegarde des données
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

### useDatabaseView
Gère l'état et la logique de la vue DatabaseView avec gestion des modales, recherche, drag & drop et sélection de stories.

**Fonctionnalités :**
- Gestion des états de chargement et d'erreur
- Gestion des modales d'ajout et d'édition
- Filtrage des données par recherche
- Gestion du drag & drop pour associer des éléments aux stories
- Sélection et chargement des détails des stories

**Interface :**
```typescript
interface DatabaseViewState {
  loading: boolean;
  error: string | null;
  loadingDetails: boolean;
  loadingError: string | null;
  loadingStoryDetails: boolean;
}

interface ModalState {
  showAddModal: boolean;
  showEditModal: boolean;
  currentType: 'period' | 'event' | 'story';
  currentItem: any;
  currentMode: 'create' | 'edit';
}

interface SearchState {
  periodSearch: string;
  eventSearch: string;
}

interface DragDropState {
  draggedItem: { type: 'period' | 'event', data: any } | null;
  isDragOver: boolean;
}
```

### useDatabaseSave
Gère la logique de sauvegarde des données avec retry automatique et gestion des erreurs de connexion.

**Fonctionnalités :**
- Sauvegarde des périodes, événements et stories
- Retry automatique en cas d'erreur de connexion
- Mise à jour optimiste des listes locales
- Gestion des erreurs et notifications

**Interface :**
```typescript
interface SaveResult {
  loading: boolean;
  handleSave: (formData: any, type: 'period' | 'event' | 'story', mode: 'create' | 'edit', item: any) => Promise<boolean>;
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

### useGraphView
Gère l'état et la logique de la vue GraphView avec gestion des colonnes, sélection et navigation hiérarchique.

**Fonctionnalités :**
- Gestion des états de chargement et d'erreur
- Calcul des colonnes basé sur la sélection hiérarchique
- Gestion de la sélection des périodes
- Chargement des enfants des périodes sélectionnées
- Navigation dans l'arborescence des périodes

**Interface :**
```typescript
interface GraphViewState {
  loading: boolean;
  error: string | null;
}

interface ModalState {
  showEditModal: boolean;
  showAddModal: boolean;
  selectedPeriod: ApiPeriod | null;
  currentColumnIdx: number | null;
}

interface SelectionState {
  selectedIds: string[];
  draggedItemId: string | null;
  dragOverColumnIdx: number | null;
}
```

### useGraphDragDrop
Gère le drag & drop des périodes dans la vue GraphView avec validation des relations hiérarchiques.

**Fonctionnalités :**
- Déplacement de périodes entre colonnes
- Validation des cycles dans la hiérarchie
- Mise à jour des relations parent/enfant
- Gestion des états de drag & drop

**Interface :**
```typescript
interface DragDropFunctions {
  movePeriod: (childId: string, newParentId: string | null, allPeriods: any[], isDescendant: Function) => Promise<void>;
  onDrop: (targetItemId: string, draggedItemId: string | null, allPeriods: any[], isDescendant: Function) => Promise<void>;
  onColumnDrop: (colIdx: number, draggedItemId: string | null, selectedIds: string[], columns: any[][], allPeriods: any[], isDescendant: Function) => Promise<void>;
}
```

### useGraphModals
Gère les modales d'édition et d'ajout de périodes dans la vue GraphView.

**Fonctionnalités :**
- Ouverture et fermeture des modales d'édition et d'ajout
- Chargement des données complètes des périodes
- Soumission des formulaires avec gestion des relations
- Gestion des erreurs et notifications

**Interface :**
```typescript
interface GraphModalState {
  showEditModal: boolean;
  showAddModal: boolean;
  selectedPeriod: ApiPeriod | null;
  currentColumnIdx: number | null;
  loading: boolean;
}
```

### useHomeNavigation
Gère la navigation hiérarchique dans HomeView avec gestion de la pile de navigation et chargement des périodes.

**Fonctionnalités :**
- Navigation hiérarchique dans les périodes géologiques
- Gestion de la pile de navigation (parentStack)
- Chargement des périodes depuis Wikidata
- Retour à la racine avec chargement de la story Planète Terre
- Gestion des états de chargement et d'erreur

**Interface :**
```typescript
interface HomeNavigationState {
  loading: boolean;
  error: string | null;
  parentStack: Period[];
  currentPeriod: Period | null;
  displayedPeriods: Period[];
}
```

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