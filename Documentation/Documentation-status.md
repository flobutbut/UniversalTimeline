# État du Projet

*Dernière relecture alignée sur le code : 2026-04-11 — pour le détail d’architecture, voir `Documentation-technique.md`.*

## Architecture

### Stack Technologique
- **Frontend** : Vue 3 + TypeScript + Composition API
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : PostgreSQL avec schémas multiples
- **ORM** : Prisma partiel (`server/prisma/schema.prisma`) + **requêtes SQL** principales dans `server/src/api/database.ts` / `routes.ts`
- **Build** : Vite
- **Tests** : Vitest
- **Containerisation** : Docker

### Architecture Modulaire
- **Composables Vue 3** : logique métier extraite et réutilisable
- **Store Pinia** : `useDataStore` (`src/stores/useDataStore.ts`) pour mutualiser périodes, événements, stories et chargements lazy
- **Clients HTTP** : `ApiClient` + services `PeriodApiService`, `EventApiService`, `StoryApiService`, `SearchApiService` (voir `src/services/index.ts`)
- **Types TypeScript** : interfaces dans `src/types/database.ts`
- **Design system** : tokens CSS dans `src/styles/variables.css` (thèmes clair/sombre, gris désaturés, `--color-card` pour les barres de période)
- **`useDocumentTheme`** : application centralisée du thème (`data-theme` + `localStorage`)

## Fonctionnalités Implémentées

### Vues Principales
- **HomeView** : Navigation hiérarchique dans les périodes géologiques
- **DatabaseView** (onglet **Stories**) : Gestion des données avec filtrage des périodes racines
- **Periods.vue** (onglet **Periods**) : Visualisation hiérarchique avec drag & drop

### Composables Vue 3
- **`useDatabaseView`** : logique de la vue DatabaseView avec filtrage
- **`useGraphView`** : logique de la vue Periods (`Periods.vue`) avec colonnes dynamiques
- **`useDatabaseSave`** : sauvegarde avec retry automatique
- **`useDatabaseDelete`** : suppression des données
- **`useGraphDragDrop`** : drag & drop avec validation des cycles
- **`useGraphModals`** : modales de la vue Periods
- **`useEditModal`** : formulaires d’édition centralisés
- **`useHomeNavigation`** : navigation hiérarchique de la timeline (`HomeView.vue`)
- **`useWikidataImport`** : import depuis Wikidata
- **`useParentChildManagement`** : relations hiérarchiques
- **`useDateConversion`** : conversion de dates avec interface réactive
- **`useTimelineScaling`** : layout timeline ; délègue à `TimelineScalingService`
- **`useDocumentTheme`**, **`useToast`**, **`useModalState`**, **`useLoadingState`**, etc. (liste exhaustive : dossier `src/composables/`)

### Services
- **`ApiClient`** : client HTTP partagé
- **`PeriodApiService`**, **`EventApiService`**, **`StoryApiService`**, **`SearchApiService`** : accès REST métier
- **`WikidataQueryService`** : SPARQL + helpers périodes
- **`WikidataSearchService`** : recherche d’entités Wikidata
- **`WikidataStoryService`** : chargement / structuration de contenus story depuis Wikidata
- **`ConflictResolutionService`** : résolution de conflits (import Wikidata, sauvegardes)
- **`TimelineScalingService`**, **`DateConversionService`**, **`DateService`**, **`CategoryService`**, etc. (voir `src/services/`)

### Fonctionnalités Avancées
- **Import Wikidata** : Import de périodes et événements depuis Wikidata
- **Gestion des conflits** : Service de résolution des conflits lors de l'import
- **Drag & Drop** : Déplacement de périodes entre colonnes (vue Periods) et vers les stories (DatabaseView)
- **Modales d'édition** : Création et modification de périodes, événements, stories
- **Recherche** : Filtrage en temps réel dans toutes les vues
- **Validation** : Validation centralisée des formulaires
- **Support multilingue** : Français et anglais

### Base de Données
- **Schémas multiples** : categories, periods, events, stories
- **Relations hiérarchiques** : Parent/enfant entre périodes
- **Support Wikidata** : Intégration avec les Q-IDs
- **Contraintes d'intégrité** : Clés étrangères et UNIQUE
- **Index optimisés** : Performance des requêtes
- **Migrations** : Support UUID pour tous les IDs

### API Endpoints
- **Périodes** : CRUD complet avec recherche par Wikidata ID
- **Événements** : CRUD complet avec récupération automatique des dates
- **Stories** : CRUD complet avec gestion des relations
- **Catégories** : Liste et gestion des catégories

### Performance et UX
- **Données partagées** : Pinia (`useDataStore`) évite de dupliquer les listes entre vues ; le nombre d’appels réseau dépend des écrans (lazy children, `temporal-bounds`, recherche, etc.)
- **Mise à jour dynamique** : rafraîchissement ciblé après modifications
- **Gestion d'erreurs** : Messages d'erreur et notifications utilisateur
- **Interface responsive** : Design adaptatif et moderne
- **Design system** : Composants réutilisables et cohérents

### Fonctionnalités Spéciales
- **Intégration Wikidata** : Récupération automatique des dates d'événements
- **Rate limiting** : Délais entre requêtes Wikidata
- **Retry automatique** : En cas d'erreur 429 (rate limit)
- **Formatage des dates** : Support des dates géologiques, historiques et modernes
- **Gestion des timeouts** : Timeout de 30 secondes avec retry

## Refactoring Terminé

### Composants Principaux
- **EditModal.vue** : Composant simplifié utilisant des composables spécialisés
- **DatabaseView.vue** : Composant simplifié avec logique extraite
- **Periods.vue** : Composant simplifié avec gestion des colonnes dynamiques
- **HomeView.vue** : Composant ultra-simplifié avec navigation extraite

### Bénéfices du Refactoring
- **Code maintenable** : Logique métier réutilisable
- **Séparation des responsabilités** : Chaque composable a un rôle précis
- **Réduction de la complexité** : Composants principaux simplifiés
- **Amélioration de la lisibilité** : Code plus clair et organisé
- **Testabilité** : Logique métier isolée et testable

## Métriques de Performance
Objectifs produit **non mesurés** automatiquement dans le dépôt (pas de bench continu) — à prendre comme **cibles** : chargement initial, navigation, recherche, import ; voir aussi `Documentation-technique.md` section Performance.

## Sécurité et Robustesse
- **Validation des données** : Côté client et serveur
- **Gestion des erreurs** : Try/catch robuste avec fallbacks
- **Logs** : côté serveur, usage principal de `console` ; pas de pipeline unique de logging structuré documenté dans le dépôt
- **Retry automatique** : Pour les opérations critiques
- **Sanitisation** : Nettoyage des entrées utilisateur

## Tests
- **Tests unitaires** : Composables Vue 3
- **Tests unitaires** : Services métier
- **Tests unitaires** : Validateurs
- **Tests unitaires** : Utilitaires

## Documentation
- **Documentation technique** : Architecture et dépendances
- **Documentation base de données** : Schémas et API
- **Documentation fonctionnelle** : Fonctionnalités utilisateur
- **Diagrammes** : Mermaid pour les dépendances

## État Actuel
Le projet est **stable et fonctionnel** avec toutes les fonctionnalités principales implémentées. L'architecture modulaire permet une maintenance facile et des évolutions futures.

### Corrections Récentes (2025-06-22)
- **Format des catégories** : Correction du format d'envoi des catégories au backend
  - Le frontend filtre maintenant automatiquement les valeurs `null`/undefined`
  - Transformation des IDs en objets `{ id: string }` pour compatibilité backend
  - Résolution du problème d'insertion des catégories dans les tables de liaison
- **Chargement des catégories** : Correction du chargement des catégories dans la modale d'édition
  - Correction des routes API `/periods`, `/events` et `/stories` pour gérer les catégories multiples
  - Correction des services frontend `getListPeriods()`, `getListEvents()` et `getListStories()`
  - Les catégories sont maintenant pré-remplies dans la modale d'édition
- **Données stories** : Ajout du préchargement de l'auteur et du statut public/privé
  - L'auteur et le statut `isPublic` sont maintenant chargés et affichés dans la modale
  - Correction de la route `/stories` pour inclure les catégories

### Corrections Récentes (2025-06-24)
- **Ajout dynamique dans la vue Periods** : Correction de l'ajout de périodes dans les colonnes appropriées
  - **Problème résolu** : Les périodes s'ajoutaient toujours dans la colonne racine au lieu de la colonne correspondante
  - **Cause identifiée** : `useDatabaseSave` ajoutait les périodes sans les propriétés `hasParent` et `children` nécessaires
  - **Solution implémentée** : Création manuelle avec les bonnes propriétés dès le départ
  - **Fonctionnement** : 
    - Colonne 0 (racines) : `hasParent: false` → Période apparaît dans la colonne 0
    - Colonne 1+ (enfants) : `hasParent: true` → Période apparaît dans la colonne correspondante
  - **Utilisation de `useParentChildManagement`** : Gestion correcte des relations parent-enfant
  - **Réactivité** : les colonnes se mettent à jour via le store Pinia (`useDataStore`)

### Ajouts Récentes (2025-06-25)
- **Système de sauvegarde et restauration** : Scripts automatisés pour la base de données
  - **Script de sauvegarde** : `database/backup_database.sh` avec nommage automatique et personnalisé
  - **Script de restauration** : `database/restore_database.sh` avec confirmation et vérifications
  - **Documentation complète** : `database/README_backup.md` avec guide d'utilisation
  - **Fonctionnalités** :
    - ✅ Sauvegarde complète avec structure et données PostgreSQL
    - ✅ Vérification de l'état des conteneurs Docker
    - ✅ Nommage automatique avec timestamp
    - ✅ Support des noms personnalisés pour les sauvegardes importantes
    - ✅ Demande de confirmation avant restauration
    - ✅ Affichage des informations détaillées (taille, date, emplacement)
    - ✅ Liste des sauvegardes disponibles
  - **Bonnes pratiques** : Sauvegardes régulières avant déploiements et modifications importantes

### Ajouts Récentes (2025-06-26)
- **Service de conversion de dates** : Gestion complète des formats temporels
  - **Service principal** : `DateConversionService` avec API complète
  - **Composable Vue 3** : `useDateConversion` pour utilisation réactive
  - **Composant de démonstration** : `DateConverter.vue` pour tester les conversions
  - **Formats supportés** :
    - ✅ **ISO8601** : `-3600000000-01-01T00:00:00Z` (dates très anciennes)
    - ✅ **Moderne** : `18 avril 1923` (dates récentes)
    - ✅ **BCE** : `800 BCE`, `-800` (dates historiques)
    - ✅ **Géologique** : `4 Ma`, `4.5 Ga`, `40 ka` (dates préhistoriques)
  - **Fonctionnalités** :
    - ✅ Détection automatique du format d'entrée
    - ✅ Conversion bidirectionnelle entre tous les formats
    - ✅ Gestion des plages de dates avec calcul de durée
    - ✅ Formatage contextuel (timeline, détail, recherche)
    - ✅ Validation des dates et gestion d'erreurs
    - ✅ Support multilingue (français par défaut)
  - **Tests complets** : Suite de tests unitaires avec Vitest
  - **Documentation** : README détaillé avec exemples d'utilisation
  - **Intégration** : Export dans l'index des services pour utilisation globale 