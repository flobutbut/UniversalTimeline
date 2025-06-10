# État du Projet

## Dernière Mise à Jour
- Date : 2024-04-02
- Version : 1.1.0
- Statut : En développement

## État Actuel du Projet

### Architecture
- Architecture en cours de refonte :
  - Migration progressive vers une architecture basée sur des bases de données PostgreSQL
  - Système d'import manuel via barre de recherche
  - Import automatique lors de la sélection d'une période/événement
  - API REST pour l'accès aux données
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
- ⏳ Support des ères géologiques
- ⏳ Filtres de recherche avancés
- ⏳ Interface de visualisation temporelle
- ⏳ Export des résultats 
- [ ] Mettre à jour les tests unitaires pour le nouveau formatage
- [ ] Ajouter des tests d'intégration pour vérifier l'affichage
- [ ] Vérifier la cohérence sur tous les types de dates
- [ ] Optimiser les performances du formatage 

## Fonctionnalités Implémentées ✅

### Vue Timeline
- Affichage de la timeline avec les événements
- Navigation temporelle
- Filtrage par catégories
- Recherche Wikidata
- Sauvegarde des éléments

### Vue Base de Données
- Affichage en trois colonnes (Périodes, Événements, Stories)
- Cartes d'information avec titre, date et catégories
- Bouton d'édition pour chaque élément
- Navigation entre les vues
- Design responsive

## En Cours de Développement 🚧

### Vue Base de Données
- Implémentation de la fonctionnalité d'édition
- Amélioration de la gestion des catégories
- Optimisation des performances pour de grandes quantités de données

## À Faire 📝

### Général
- Tests unitaires et d'intégration
- Documentation utilisateur
- Optimisation des performances
- Gestion des erreurs et des cas limites

### Vue Base de Données
- Filtrage avancé
- Tri des éléments
- Export des données
- Gestion des conflits de données

## Problèmes Connus ⚠️

### Vue Base de Données
- Le bouton d'édition n'a pas encore de fonctionnalité implémentée
- Les catégories ne sont pas encore cliquables pour le filtrage
- Pas de pagination pour de grandes quantités de données 