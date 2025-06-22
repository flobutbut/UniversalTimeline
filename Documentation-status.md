# État du Projet

## Architecture

### Stack Technologique
- **Frontend** : Vue 3 + TypeScript + Composition API
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : PostgreSQL avec schémas multiples
- **ORM** : Prisma (pour Events) + requêtes SQL directes
- **Build** : Vite
- **Tests** : Vitest
- **Containerisation** : Docker

### Architecture Modulaire
- **Composables Vue 3** : Logique métier extraite et réutilisable
- **Store partagé** : `useDatabaseDataStore` pour mutualiser le chargement
- **Services spécialisés** : Séparation claire des responsabilités
- **Types TypeScript** : Interface cohérente et type-safe

## Fonctionnalités Implémentées

### Vues Principales
- **HomeView** : Navigation hiérarchique dans les périodes géologiques
- **DatabaseView** : Gestion des données avec filtrage des périodes racines
- **GraphView** : Visualisation hiérarchique avec drag & drop

### Composables Vue 3
- **`useDatabaseDataStore`** : Store partagé pour mutualiser le chargement des données
- **`useDatabaseView`** : Logique de la vue DatabaseView avec filtrage
- **`useGraphView`** : Logique de la vue GraphView avec colonnes dynamiques
- **`useDatabaseSave`** : Sauvegarde avec retry automatique
- **`useDatabaseDelete`** : Suppression des données
- **`useGraphDragDrop`** : Drag & drop avec validation des cycles
- **`useGraphModals`** : Gestion des modales GraphView
- **`useEditModal`** : Formulaires d'édition centralisés
- **`useHomeNavigation`** : Navigation hiérarchique HomeView
- **`useWikidataImport`** : Import depuis Wikidata
- **`useParentChildManagement`** : Relations hiérarchiques
- **`useConflictResolution`** : Résolution des conflits

### Services
- **`DatabaseQueryService`** : Interface PostgreSQL
- **`WikidataQueryService`** : Requêtes SPARQL Wikidata
- **`WikidataSearchService`** : Recherche Wikidata
- **`DatabaseViewService`** : Service spécialisé pour DatabaseView
- **`StoryService`** : Gestion des stories
- **`ConflictResolutionService`** : Résolution des conflits
- **`TimelineScalingService`** : Calculs de positionnement temporel

### Fonctionnalités Avancées
- **Import Wikidata** : Import de périodes et événements depuis Wikidata
- **Gestion des conflits** : Service de résolution des conflits lors de l'import
- **Drag & Drop** : Déplacement de périodes entre colonnes (GraphView) et vers les stories (DatabaseView)
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
- **Chargement optimisé** : Une seule requête pour DatabaseView et GraphView
- **Mise à jour dynamique** : Rafraîchissement automatique après modifications
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
- **GraphView.vue** : Composant simplifié avec gestion des colonnes dynamiques
- **HomeView.vue** : Composant ultra-simplifié avec navigation extraite

### Bénéfices du Refactoring
- **Code maintenable** : Logique métier réutilisable
- **Séparation des responsabilités** : Chaque composable a un rôle précis
- **Réduction de la complexité** : Composants principaux simplifiés
- **Amélioration de la lisibilité** : Code plus clair et organisé
- **Testabilité** : Logique métier isolée et testable

## Métriques de Performance
- **Temps de chargement initial** : < 2s
- **Temps de navigation** : < 1s
- **Temps de réponse base de données** : < 100ms
- **Temps de recherche** : < 500ms
- **Temps d'import** : < 1s
- **Temps de détection de langue** : < 100ms

## Sécurité et Robustesse
- **Validation des données** : Côté client et serveur
- **Gestion des erreurs** : Try/catch robuste avec fallbacks
- **Logs structurés** : Traçabilité complète
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
  - Le frontend filtre maintenant automatiquement les valeurs `null`/`undefined`
  - Transformation des IDs en objets `{ id: string }` pour compatibilité backend
  - Résolution du problème d'insertion des catégories dans les tables de liaison 