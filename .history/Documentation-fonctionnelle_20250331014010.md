# Documentation Fonctionnelle

## Vue d'ensemble

L'application permet de naviguer dans une timeline des périodes géologiques, en commençant par les quatre éons principaux :
- Hadéen
- Archéen
- Protérozoïque
- Phanérozoïque

## Fonctionnalités

### Navigation

1. **Vue principale**
   - Affichage des éons géologiques principaux
   - Chaque carte affiche :
     - Nom de l'éon
     - Dates de début et fin (si disponibles)
     - Localisation (si disponible)
     - Indication du nombre de sous-périodes disponibles

2. **Navigation hiérarchique**
   - Bouton "Retour" pour revenir au niveau précédent
   - Titre dynamique indiquant le niveau actuel
   - Indicateur de chargement pour chaque période

3. **États de chargement**
   - Spinner global pour le chargement initial
   - Spinner individuel pour chaque période en cours de chargement
   - Message d'erreur avec bouton de réessai

### Fonctionnalités

1. **Affichage des périodes**
   - Format de date géologique (ex: "4.5 Ga")
   - Localisation simplifiée
   - Indication visuelle des périodes avec sous-périodes

2. **Navigation**
   - Navigation intuitive entre les niveaux
   - Conservation de l'historique de navigation
   - Retour rapide aux éons principaux

3. **Gestion des erreurs**
   - Messages d'erreur clairs et explicites
   - Possibilité de réessayer le chargement
   - Logs détaillés pour le débogage

### Interface Utilisateur

1. **Contrôles**
   - Sélecteur de langue (FR/EN)
   - Bouton retour pour la navigation
   - Indicateurs de chargement

2. **États Visuels**
   - Carte sélectionnée : bordure bleue et fond légèrement bleuté
   - État de chargement : indicateur de progression
   - Présence de sous-périodes : compteur ou indication
   - Erreurs : messages explicites

3. **Responsive Design**
   - Grille adaptative pour les cartes
   - Espacement optimisé
   - Légendes et textes lisibles

### Gestion des Données

1. **Chargement**
   - Chargement initial des éons principaux
   - Chargement à la demande des sous-périodes
   - Mise en cache des résultats
   - Gestion des erreurs de chargement

2. **Performance**
   - Limitation à 100 sous-périodes par requête
   - Cache de 5 minutes
   - Retry automatique en cas d'erreur
   - Timeout de 30 secondes

3. **Internationalisation**
   - Support multilingue
   - Format de dates localisé
   - Labels et descriptions traduits

## Scénarios d'Utilisation

### Navigation Simple

1. L'utilisateur arrive sur la page
2. Les quatre éons principaux sont affichés
3. L'utilisateur peut :
   - Voir les informations de base de chaque éon
   - Changer la langue
   - Sélectionner un éon pour voir ses sous-périodes

### Navigation Approfondie

1. L'utilisateur sélectionne un éon
2. Les sous-périodes sont chargées progressivement
3. L'utilisateur peut :
   - Voir les détails de chaque sous-période
   - Naviguer plus profondément dans la hiérarchie
   - Revenir en arrière à tout moment

### Gestion des Erreurs

1. En cas d'erreur de chargement :
   - Message d'erreur explicite
   - Possibilité de réessayer
   - Retry automatique après délai

2. En cas de timeout :
   - Message d'erreur approprié
   - Option de réessayer manuellement
   - Timeout de 30 secondes

## Limitations

1. **Données**
   - Maximum 100 sous-périodes par requête
   - Certaines périodes peuvent manquer de données
   - Localisation géographique parfois incomplète

2. **Performance**
   - Temps de chargement dépendant de la connexion
   - Latence possible avec l'API Wikidata
   - Cache limité à 5 minutes

3. **Interface**
   - Navigation uniquement verticale
   - Pas de recherche directe
   - Pas de filtrage par catégorie

## Spécifications Techniques

### API Wikidata
- Utilisation de l'API REST Wikidata
- Endpoint : `/api/wikidata/w/api.php`
- Paramètres :
  - `action`: wbsearchentities
  - `search`: "période géologique"
  - `language`: fr/en
  - `format`: json
  - `type`: item
  - `limit`: 20
  - `continue`: offset

### Structure des Données
```typescript
interface GeologicalPeriod {
  id: string;
  label: string;
  description?: string;
}
```

### Cache
- Durée de validité : 5 minutes
- Clé de cache : combinaison de limit/offset/language
- Invalidation automatique

### Pagination
- 20 éléments par page
- Navigation Précédent/Suivant
- Désactivation des boutons aux limites

## Améliorations Futures
1. Ajout d'une barre de recherche
2. Filtres avancés
3. Tri personnalisé
4. Plus d'informations par période
5. Visualisation temporelle
6. Export des données
7. Mode sombre
8. Historique de navigation
9. Breadcrumb pour la navigation

## Navigation Hiérarchique

### Description
La navigation se fait de manière hiérarchique, permettant aux utilisateurs d'explorer les périodes géologiques de manière intuitive.

### Fonctionnalités
1. **Navigation Vers l'Avant**
   - Affichage initial des éons principaux
   - Possibilité de cliquer sur une période pour voir ses sous-périodes
   - Chargement progressif des sous-périodes
   - Indication visuelle du nombre de sous-périodes disponibles

2. **Navigation Vers l'Arrière**
   - Bouton "Retour" apparaissant dès qu'une sous-période est affichée
   - Retour à la période parente précédente
   - Retour aux éons principaux si on est au début de la navigation

3. **États de Navigation**
   - Affichage du niveau de navigation actuel
   - Indication visuelle de la période sélectionnée
   - Gestion des états de chargement
   - Gestion des erreurs avec option de réessai

### Scénarios d'Utilisation
1. **Navigation Simple**
   - L'utilisateur voit les éons principaux
   - Il clique sur un éon pour voir ses sous-périodes
   - Il peut revenir aux éons principaux avec le bouton "Retour"

2. **Navigation Profonde**
   - L'utilisateur peut naviguer dans plusieurs niveaux de sous-périodes
   - Le bouton "Retour" permet de remonter la hiérarchie
   - L'historique de navigation est conservé

3. **Gestion des Erreurs**
   - En cas d'erreur de chargement, un message explicite est affiché
   - Un bouton "Réessayer" permet de relancer le chargement
   - La navigation reste cohérente même en cas d'erreur 