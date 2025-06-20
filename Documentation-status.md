# État du Projet

## Dernières Mises à Jour
- **Refactoring du composant EditModal** : Extraction de la logique métier dans des composables réutilisables
- Ajout des composants de base (Button, Input)
- Amélioration de l'interface utilisateur
- Correction de la gestion des Q-ids Wikidata
- Optimisation des requêtes SPARQL

## État Actuel du Projet

### Architecture
- Architecture en cours de refonte :
  - Migration progressive vers une architecture basée sur des bases de données PostgreSQL
  - Système d'import manuel via barre de recherche
  - Import automatique lors de la sélection d'une période/événement
  - API REST pour l'accès aux données
  - **Nouveau : Architecture modulaire avec composables Vue 3**
- Performance optimisée via :
  - Requêtes SQL optimisées
  - Mise en cache des données fréquemment utilisées
  - Chargement progressif des données
  - Gestion des connexions à la base de données

### Services Implémentés

#### WikidataQueryService
- ✅ Gestion des requêtes SPARQL vers Wikidata
- ✅ Transformation des données avec support des localisations temporelles
- ✅ Gestion des erreurs et retries
- ✅ Support multilingue (fr, en)
- ✅ Logging structuré
- ✅ Chargement progressif des données
- ✅ Gestion des requêtes parallèles
- ✅ Optimisation des types pour les périodes
- ✅ Support des localisations temporelles
- ✅ Formatage des dates
- 🔄 Ajout de la recherche globale
- 🔄 Intégration avec la base de données
- ✅ Tests unitaires pour WikidataQueryService

#### DatabaseService
- ✅ Configuration des bases de données PostgreSQL
- ✅ Gestion des connexions et pools
- ✅ Méthodes CRUD pour les périodes
- ✅ Gestion des catégories
- ✅ Support des transactions
- 🔄 Implémentation des méthodes pour les événements
- 🔄 Implémentation des méthodes pour les stories
- 🔄 Système de détection des doublons

#### TimelineScaling
- ✅ Calcul de la durée totale des périodes
- ✅ Calcul des positions relatives
- ✅ Calcul des largeurs relatives
- ✅ Génération des styles CSS
- ✅ Conversion des dates
- ✅ Correction de la mise à l'échelle des périodes du début/centre
- 🔄 Support des événements sur la frise
- 🔄 Gestion des superpositions d'événements

### **Nouveaux Composables et Services (Refactoring EditModal et GraphView)**

#### Composables Vue 3
- ✅ **useEditModal** : Gestion de l'état du formulaire d'édition
- ✅ **useWikidataImport** : Import et transformation des données Wikidata
- ✅ **useParentChildManagement** : Gestion des relations parent/enfant
- ✅ **useDatabaseView** : Gestion de la vue DatabaseView (NOUVEAU ✅)
- ✅ **useDatabaseSave** : Gestion de la sauvegarde des données (NOUVEAU ✅)
- ✅ **useGraphView** : Gestion de la vue GraphView (NOUVEAU ✅)
- ✅ **useGraphDragDrop** : Gestion du drag & drop dans GraphView (NOUVEAU ✅)
- ✅ **useGraphModals** : Gestion des modales dans GraphView (NOUVEAU ✅)
- ✅ **useHomeNavigation** : Gestion de la navigation dans HomeView (NOUVEAU ✅)

#### Services de Validation et Résolution
- ✅ **EditFormValidator** : Validation centralisée des formulaires
- ✅ **ConflictResolutionService** : Gestion des conflits lors de la création/édition

#### Composants Spécialisés
- ✅ **WikidataImportButton** : Composant dédié à l'import Wikidata

### Refactoring des Composants Principaux

#### EditModal.vue - TERMINÉ ✅
**Avant :** Composant monolithique avec logique métier mélangée
**Après :** Composant simplifié utilisant des composables spécialisés

**Extractions effectuées :**
- `useEditModal.ts` : Gestion de l'état du formulaire
- `useWikidataImport.ts` : Import des données Wikidata
- `useParentChildManagement.ts` : Gestion des relations parent/enfant
- `EditFormValidator.ts` : Validation centralisée
- `ConflictResolutionService.ts` : Gestion des conflits
- `WikidataImportButton.vue` : Composant spécialisé

#### DatabaseView.vue - TERMINÉ ✅
**Avant :** Composant monolithique de 751 lignes avec logique métier mélangée
**Après :** Composant simplifié utilisant des composables spécialisés

**Extractions effectuées :**
- `useDatabaseView.ts` : Gestion de l'état, modales, recherche, drag & drop
- `useDatabaseSave.ts` : Logique de sauvegarde avec retry automatique

#### GraphView.vue - TERMINÉ ✅
**Avant :** Composant complexe de 638 lignes avec logique de navigation hiérarchique et drag & drop
**Après :** Composant simplifié utilisant des composables spécialisés

**Extractions effectuées :**
- `useGraphView.ts` : Gestion de l'état, colonnes, sélection hiérarchique
- `useGraphDragDrop.ts` : Logique de drag & drop avec validation des cycles
- `useGraphModals.ts` : Gestion des modales d'édition et d'ajout

#### HomeView.vue - TERMINÉ ✅
**Avant :** Composant simple mais avec logique de navigation mélangée (134 lignes)
**Après :** Composant ultra-simplifié avec logique extraite dans un composable

**Extractions effectuées :**
- `useHomeNavigation.ts` : Gestion de la navigation hiérarchique et chargement des périodes

**Bénéfices du refactoring :**
- Code plus maintenable et testable
- Logique métier réutilisable
- Séparation claire des responsabilités
- Réduction de la complexité des composants principaux
- Amélioration de la lisibilité et de la maintenabilité

### Fonctionnalités Implémentées
- ✅ Affichage de la liste des périodes géologiques
- ✅ Navigation dans la hiérarchie des périodes avec period-click
- ✅ Gestion des états de chargement par période
- ✅ Retour à la racine avec BackButton
- ✅ Optimisation des performances
- ✅ Amélioration du bouton retour avec informations temporelles
- ✅ Support multilingue (fr, en)
- ✅ Gestion des erreurs avec retry
- ✅ Formatage des dates (Ga, Ma, ans)
- ✅ Visualisation temporelle avec TimelineScaling
- ✅ Design system complet
- ✅ Icônes Lucide intégrées
- ✅ Favicon personnalisé
- ✅ Mise à l'échelle automatique des durées
- ✅ Configuration des bases de données PostgreSQL
- ✅ Structure des tables et relations
- ✅ Système de catégories
- ✅ Design system cohérent
- ✅ Composants réutilisables
- ✅ Intégration Wikidata
- ✅ Gestion des périodes et événements
- ✅ Support multilingue
- ✅ Validation des données
- ✅ **Gestion modulaire des formulaires d'édition**
- ✅ **Validation centralisée des données**
- ✅ **Gestion améliorée des conflits**

### Fonctionnalités en Cours
- 🔄 Implémentation de la barre de recherche globale
  - Support multilingue (fr, en)
  - Détection automatique de la langue de recherche
  - Affichage cohérent des résultats dans la langue de recherche
  - Gestion des entités sans traduction
- 🔄 Système d'import progressif via recherche
- 🔄 Gestion des doublons lors de l'import
- 🔄 Mise à jour de l'interface pour utiliser la base de données
- 🔄 Implémentation des événements sur la frise
- 🔄 Système de création et gestion des stories
- 🔄 Tests unitaires pour les nouveaux services
- 🔄 Documentation des nouvelles fonctionnalités
- 🔄 Optimisation des performances de chargement
- 🔄 Amélioration de la gestion des erreurs
- 🔄 Tests de la navigation period-click
- 🔄 Tests unitaires
- 🔄 Documentation des composants
- 🔄 Amélioration de la visualisation temporelle
- Amélioration de la gestion des erreurs
- Optimisation des performances
- Tests unitaires

### Fonctionnalités récemment ajoutées
- [x] Gestion complète des stories (création, modification, affichage)
- [x] Interface utilisateur pour la gestion des stories
- [x] API backend pour les stories
- [x] Intégration avec la base de données
- [x] **Refactoring du composant EditModal avec architecture modulaire**

### Performance
- Temps de chargement initial : < 2s
- Temps de navigation : < 1s
- Utilisation mémoire : Optimale
- Timeout API : 30 secondes
- Maximum 3 tentatives de retry
- Délai entre les tentatives : 1 seconde
- Temps de réponse base de données : < 100ms
- Temps de recherche : < 500ms
- Temps d'import : < 1s
- Temps de détection de langue : < 100ms

## Problèmes et Solutions

### Problèmes Connus
1. Implémentation de la barre de recherche
   - Impact : Élevé
   - Priorité : Haute
   - Statut : En cours de développement
   - Problèmes spécifiques :
     - Filtrage des entités temporelles :
       - Périodes : présence de P580 (start time) ET P582 (end time)
       - Événements : présence de P585 (point in time)
     - Support multilingue (fr, en)
     - Gestion des entités sans traduction

2. Gestion des doublons lors de l'import
   - Impact : Moyen
   - Priorité : Haute
   - Statut : En cours de développement

3. Implémentation des événements sur la frise
   - Impact : Moyen
   - Priorité : Moyenne
   - Statut : En cours de développement

4. Format des dates à standardiser
   - Impact : Moyen
   - Priorité : Moyenne
   - Statut : En cours de développement

5. Gestion des timeouts Wikidata
   - Impact : Moyen
   - Priorité : Moyenne
   - Statut : En cours de développement

6. Performance des requêtes complexes
   - Impact : Moyen
   - Priorité : Moyenne
   - Statut : En cours de développement

### Problèmes Résolus
1. **Localisation**
   - ✅ Erreur 400 sur les requêtes SPARQL
   - ✅ Problèmes d'agrégation dans les requêtes
   - ✅ Gestion des sous-périodes
   - ✅ Performance des requêtes
   - ✅ Navigation hiérarchique
   - ✅ Affichage du bouton de retour

2. **Performance**
   - ✅ Chargement progressif des données
   - ✅ Gestion des requêtes parallèles
   - ✅ Optimisation des types pour les périodes
   - ✅ Support des localisations temporelles
   - ✅ Correction de la mise à l'échelle des périodes

3. **Maintenance**
   - ✅ Séparation des responsabilités
   - ✅ Code plus testable
   - ✅ Documentation à jour
   - ✅ Correction des interfaces TypeScript
   - ✅ Suppression du code obsolète

4. **Base de données**
   - ✅ Configuration des bases PostgreSQL
   - ✅ Structure des tables
   - ✅ Système de catégories
   - ✅ Relations entre les tables
   - ✅ Correction de la gestion des relations parent/enfant (fusion vs remplacement des enfants)

5. **Architecture des composants**
   - ✅ **Refactoring du composant EditModal**
   - ✅ **Extraction de la logique métier dans des composables**
   - ✅ **Centralisation de la validation**
   - ✅ **Amélioration de la gestion des conflits**
   - ✅ **Composants spécialisés et réutilisables**

### Relations parent/enfant
- La relation parent/enfant est gérée uniquement via :
  - `has_parent` (booléen) sur l'enfant
  - `children` (array d'IDs) sur le parent
- Il n'y a plus de champ `parentId` dans la base ou les types.

### Architecture Modulaire (Nouveau)
- **Composables Vue 3** :
  - `useEditModal` : Gestion de l'état du formulaire
  - `useWikidataImport` : Import des données Wikidata
  - `useParentChildManagement` : Gestion des relations hiérarchiques

- **Services de Validation** :
  - `EditFormValidator` : Validation centralisée
  - `ConflictResolutionService` : Gestion des conflits

- **Composants Spécialisés** :
  - `WikidataImportButton` : Import Wikidata
  - `EditModal` : Interface utilisateur simplifiée

## Plan de Développement

### Court Terme
1. **Implémentation de la Barre de Recherche**
   - Création du composant de recherche
   - Intégration dans le header
   - Requête SPARQL de recherche
   - Affichage des résultats

2. **Système d'Import Progressif**
   - Import lors de la sélection
   - Gestion des doublons
   - Feedback utilisateur
   - Tests d'import

3. **Corrections et Améliorations**
   - Optimisation des performances
   - Amélioration de la gestion des erreurs
   - Mise en place des tests
   - Documentation utilisateur
   - Animation de transition dans la navigation entre deux périodes
   - Gestion des périodes trop petites
   - Amélioration de l'affordance du bouton retour

4. **Tests**
   - ✅ Tests unitaires pour WikidataQueryService
     - Tests du singleton
     - Tests de chargement des périodes
     - Tests de chargement des stories
     - Tests de gestion des erreurs
   - ✅ Tests des composants Vue
   - 📅 Tests d'intégration
   - 📅 Tests de performance
   - 📅 Tests de recherche et d'import

### Moyen Terme
1. **Enrichissement des Données**
   - Création de liens entre les catégories
   - Récupération des liens Wikipedia dans les requêtes
   - Composant tooltip pour les détails des événements/périodes
   - Système de stories

2. **Gestion des Événements**
   - ✅ Requêtes des événements
   - 🔄 Ajout des événements sur la frise
   - 📅 Création de story/branches (périodes + événements)
   - 📅 Ajout du breadcrumb des branches/Story

3. **Interface Utilisateur**
   - Amélioration des animations
   - Optimisation des transitions
   - Tests de responsive design
   - Amélioration de l'accessibilité
   - Support du mode sombre
   - Filtres de recherche
   - Zoom sur les périodes

### Long Terme
- 🎯 Système de recommandations basé sur l'historique
- 🎯 Export des données
- 🎯 API publique pour les données

## Notes Techniques
- Vue 3 + TypeScript
- Vite
- Lucide Icons
- Design System personnalisé
- API Wikidata avec proxy local
- Support multilingue (fr, en)
- PostgreSQL (5 bases distinctes)
- Docker pour l'environnement de développement
- PGAdmin pour la gestion des bases

## Formatage des Dates

### Implémentation
✅ Centralisation du formatage dans `DateFormatter`
✅ Simplification du code de formatage
✅ Gestion unifiée des différents types de dates

### Fonctionnalités
✅ Format ISO8602 pour la base de données
✅ Formatage adapté pour l'affichage
✅ Gestion des dates géologiques, historiques et modernes
✅ Support des périodes, événements et personnes

### Points d'Attention
⚠️ Vérifier la cohérence des dates importées de Wikidata
⚠️ Surveiller les performances du formatage

### Prochaines Étapes
- Optimiser la détection des formats de dates
- Ajouter des tests unitaires pour le formatage
- Améliorer la gestion des fuseaux horaires

## En Cours de Développement
- 🔄 Amélioration de la précision des dates
- 🔄 Optimisation des performances de recherche
- 🔄 Support multilingue complet

## Prochaines Étapes
1. Implémentation du cache Wikidata
2. Ajout des tests unitaires
3. Documentation API
4. Monitoring des performances

## À Faire
- Documentation API
- Tests d'intégration
- Monitoring
- Cache Wikidata

## Problèmes Connus
- Format des dates à standardiser
- Gestion des timeouts Wikidata
- Performance des requêtes complexes

## Corrections récentes

### 2024-04-04
- Correction du problème d'affichage des données dans DatabaseView
  - Modification des getters dans DatabaseViewService pour retourner les valeurs des refs
  - Ajout du formatage des données dans DatabaseQueryService
  - Mise à jour des refs locales dans DatabaseView après le chargement
  - Documentation des bonnes pratiques pour la gestion des données

### Problèmes connus
- Aucun problème majeur connu actuellement

### Améliorations prévues
- Ajout de tests unitaires pour les services
- Amélioration de la gestion des erreurs
- Optimisation des performances de chargement des données 

- [x] Auto-remplissage Wikidata pour les périodes
- [x] Auto-remplissage Wikidata pour les événements (titre, description, date) 

## [MAJ 2025-06-12] État des évolutions récentes

- Optimisation du chargement initial (listes légères, chargement différé des détails).
- Robustesse accrue sur la gestion des QID Wikidata (unicité, suppression automatique en cas de conflit).
- Suppression automatique fonctionnelle via la nouvelle route DELETE côté backend.
- Récupération des dates d'événements enrichie (P585, P580, P569, P1319).
- Payloads nettoyés avant envoi au backend.

## Prochaines étapes
- [ ] Ajout de la gestion des catégories pour les stories
- [ ] Implémentation de la liaison stories-périodes
- [ ] Implémentation de la liaison stories-événements
- [ ] Amélioration de l'interface utilisateur pour la gestion des stories 

## État du projet (mise à jour)

- ✅ Architecture centralisée en place (singleton DatabaseViewService)
- ✅ Gestion robuste des mutations (création, édition, suppression)
- ✅ Synchronisation UI/données garantie
- ✅ Refactorisation des services et composants principaux terminée
- 🔜 Suppression du code mort à venir
- 🔜 Audit des composants secondaires (PeriodGrid, PeriodCard, EventCard)

Le projet est stable et prêt pour le nettoyage final avant d'autres évolutions.

# Documentation de statut

## État du projet

- La gestion des dates (événements et périodes) est désormais robuste : tous les champs sont en TEXT, il n'y a plus d'erreur 500 liée au format des dates.
- Les migrations SQL nécessaires ont été appliquées et sont versionnées dans le dossier `server/prisma/migrations/`.
- Plus aucune limitation connue sur le format des dates dans l'API.
- Le projet est à jour et synchronisé sur la branche `Database_view`. 

## Vue Graphique
- [x] Création du composant de base
- [x] Intégration dans l'application
- [x] Gestion des états (chargement, erreur)
- [x] Implémentation de la navigation en colonnes
- [x] Gestion des données
- [ ] Tests unitaires
- [ ] Tests d'intégration

## Dépendances
- [x] Design system
- [x] Services de gestion des données

# Documentation de statut

## État du projet

- La gestion des dates (événements et périodes) est désormais robuste : tous les champs sont en TEXT, il n'y a plus d'erreur 500 liée au format des dates.
- Les migrations SQL nécessaires ont été appliquées et sont versionnées dans le dossier `server/prisma/migrations/`.
- Plus aucune limitation connue sur le format des dates dans l'API.
- Le projet est à jour et synchronisé sur la branche `Database_view`. 

## Vue Graphique
- [x] Création du composant de base
- [x] Intégration dans l'application
- [x] Gestion des états (chargement, erreur)
- [x] Implémentation de la navigation en colonnes
- [x] Gestion des données
- [ ] Tests unitaires
- [ ] Tests d'intégration

## État de la base de données (avril 2024)

- La table periods.periods a été mise à jour pour :
  - Supprimer la colonne `parent_id` (remplacée par `children`)
  - Conserver `has_parent` (boolean) qui indique si la période a des enfants
  - Utiliser `children` (jsonb) pour stocker la liste des IDs des enfants directs
- Un script de maintenance (`database/maintenance.sql`) permet de corriger et vérifier l'intégrité de ces champs.
- Les requêtes de vérification utilisent désormais `label_fr` pour l'affichage.
- Les informations de connexion sont documentées dans la documentation technique. 

## État de la Gestion Multilingue

### Composants mis à jour
- [x] FinderItem
- [x] PeriodCard
- [x] BackButton
- [x] GraphView
- [x] DatabaseView

### Services mis à jour
- [x] DatabaseQueryService
- [x] WikidataQueryService
- [x] DatabaseImportService

### Types mis à jour
- [x] MultilingualText
- [x] Period
- [x] Event
- [x] Category

### Points d'attention
- Vérifier que tous les nouveaux composants respectent le typage MultilingualText
- S'assurer que les imports de Wikidata convertissent correctement les labels
- Maintenir la cohérence des labels dans la base de données 

# Documentation Status

## État actuel du projet

### Base de données
- ✅ Migration vers UUIDs complétée
- ✅ Structure des tables optimisée
- ✅ Index et contraintes en place
- ✅ Relations parent/enfant fonctionnelles

### Frontend
- ✅ Types TypeScript mis à jour pour les UUIDs
- ✅ Services de création mis à jour
- ✅ Composants adaptés aux nouveaux types
- ✅ Gestion des erreurs améliorée

### Backend
- ✅ API adaptée aux UUIDs
- ✅ Validation des données
- ✅ Gestion des erreurs
- ✅ Logs et monitoring

## Fonctionnalités implémentées

### Gestion des données
- ✅ Création de périodes avec UUIDs
- ✅ Création d'événements avec UUIDs
- ✅ Création de catégories avec UUIDs
- ✅ Création de stories avec UUIDs
- ✅ Relations parent/enfant
- ✅ Gestion des catégories

### Interface utilisateur
- ✅ Formulaire de création
- ✅ Formulaire d'édition
- ✅ Affichage des relations
- ✅ Gestion des erreurs
- ✅ Messages de confirmation

### Navigation et interaction
- ✅ Navigation à la souris
- ✅ Glisser-déposer des périodes
- ✅ Sélection des périodes
- ✅ Indication visuelle des enfants

### Gestion des périodes
- ✅ Création de périodes
- ✅ Modification de périodes
- ✅ Déplacement de périodes
- ✅ Vérification des relations parent/enfant

### Interface utilisateur
- ✅ Affichage en colonnes
- ✅ Modales d'édition et de création
- ✅ Messages de confirmation
- ✅ Indicateurs de chargement

## Prochaines étapes

### Court terme
- [ ] Tests unitaires pour la génération d'UUIDs
- [ ] Tests d'intégration pour les relations
- [ ] Documentation des cas d'utilisation
- [ ] Optimisation des performances

### Moyen terme
- [ ] Interface d'administration
- [ ] Gestion des utilisateurs
- [ ] Système de permissions
- [ ] Export/Import de données

### Long terme
- [ ] API publique
- [ ] Documentation API
- [ ] Système de cache
- [ ] Monitoring avancé

## Problèmes connus
- Aucun problème majeur identifié après la migration vers les UUIDs

## Notes de maintenance
- Les sauvegardes de base de données sont maintenant plus robustes grâce aux UUIDs
- La réplication de base de données est simplifiée
- Les conflits d'IDs sont éliminés 

## Dernières modifications
- Correction de la gestion des relations entre périodes lors de la modification d'un Q-id Wikidata
- Amélioration de la gestion des erreurs dans l'interface de modification
- Ajout de logs pour faciliter le débogage
- Optimisation de la synchronisation entre le frontend et le backend

## Prochaines étapes
- Tests approfondis de la gestion des relations
- Amélioration de la validation des données
- Optimisation des performances

# Documentation de Statut

## État actuel du projet

### ✅ Fonctionnalités complètement implémentées

#### Architecture et refactoring
- **Refactoring complet** : Extraction de la logique métier dans des composables Vue 3
- **Store partagé** : `useDatabaseDataStore` pour mutualiser le chargement des données
- **Services nettoyés** : Suppression des services non utilisés (déplacés dans `trash/`)
- **Types corrigés** : Correction des types `storyId` (string au lieu de number)
- **Documentation technique** : Diagramme Mermaid des dépendances ajouté

#### Vues principales
- **HomeView** : Navigation hiérarchique dans les périodes géologiques
- **DatabaseView** : Gestion des données avec filtrage des périodes racines uniquement
- **GraphView** : Visualisation hiérarchique avec drag & drop fonctionnel

#### Fonctionnalités avancées
- **Import Wikidata** : Import de périodes et événements depuis Wikidata
- **Gestion des conflits** : Service de résolution des conflits lors de l'import
- **Drag & Drop** : Déplacement de périodes entre colonnes (GraphView) et vers les stories (DatabaseView)
- **Modales d'édition** : Création et modification de périodes, événements, stories
- **Recherche** : Filtrage en temps réel dans toutes les vues
- **Validation** : Validation centralisée des formulaires

#### Performance et UX
- **Chargement optimisé** : Une seule requête pour DatabaseView et GraphView
- **Mise à jour dynamique** : Rafraîchissement automatique après modifications
- **Gestion d'erreurs** : Messages d'erreur et notifications utilisateur
- **Interface responsive** : Design adaptatif et moderne

### 🔄 Fonctionnalités en cours de développement

#### Améliorations mineures
- Optimisation des performances de chargement
- Amélioration de l'interface utilisateur
- Tests unitaires supplémentaires

### 📋 Fonctionnalités planifiées

#### Fonctionnalités avancées
- Export des données
- Gestion des permissions utilisateur
- API REST complète
- Tests d'intégration

#### Améliorations UX
- Mode sombre/clair
- Animations et transitions
- Interface mobile optimisée
- Raccourcis clavier

## Dernières modifications

### Session actuelle (Refactoring et optimisations)
- ✅ **Mutualisation du chargement** : DatabaseView et GraphView partagent maintenant le même store
- ✅ **Corrections GraphView** : Modales d'édition fonctionnelles pour toutes les périodes
- ✅ **Filtrage des périodes** : DatabaseView affiche seulement les périodes racines
- ✅ **Mise à jour dynamique** : Vue qui se rafraîchit automatiquement après modifications
- ✅ **Documentation** : Diagramme Mermaid des dépendances ajouté

### Architecture technique

#### Composables Vue 3
- `useDatabaseDataStore` : Store partagé pour les données
- `useDatabaseView` : Logique de la vue DatabaseView
- `useGraphView` : Logique de la vue GraphView
- `useGraphDragDrop` : Gestion du drag & drop
- `useGraphModals` : Gestion des modales GraphView
- `useHomeNavigation` : Navigation dans HomeView
- `useWikidataImport` : Import depuis Wikidata
- `useParentChildManagement` : Gestion des relations hiérarchiques
- `useConflictResolution` : Résolution des conflits
- `useDatabaseSave` : Sauvegarde des données

#### Services
- `DatabaseQueryService` : Accès aux données PostgreSQL
- `WikidataQueryService` : Requêtes vers Wikidata
- `StoryService` : Gestion des stories
- `ConflictResolutionService` : Résolution des conflits
- `TimelineScalingService` : Calculs de positionnement temporel
- `WikidataSearchService` : Recherche dans Wikidata

## Prochaines étapes

1. **Tests et validation** : Tester toutes les fonctionnalités après le refactoring
2. **Optimisations** : Améliorer les performances si nécessaire
3. **Documentation** : Compléter la documentation utilisateur
4. **Déploiement** : Préparer le déploiement en production

## Notes techniques

- **Framework** : Vue 3 avec Composition API
- **Base de données** : PostgreSQL avec schémas multiples
- **API** : Express.js avec routes REST
- **Types** : TypeScript strict
- **Architecture** : Modulaire avec séparation des responsabilités