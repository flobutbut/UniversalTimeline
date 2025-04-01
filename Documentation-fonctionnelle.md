# Documentation Fonctionnelle

## Vue d'ensemble
L'application permet de naviguer dans la hiérarchie des périodes géologiques en utilisant les données de Wikidata. Elle offre une interface utilisateur intuitive et responsive.

## Fonctionnalités Principales

### Navigation
- Affichage de la liste des périodes géologiques
- Navigation dans la hiérarchie des périodes
- Bouton de retour pour remonter dans la hiérarchie
- Indicateurs visuels pour les périodes avec sous-périodes

### Interface Utilisateur
- Design system cohérent
- Icônes Lucide pour une meilleure expérience utilisateur
- Responsive design
- Animations fluides
- Favicon personnalisé

### Personnalisation
- Sélection de la langue d'affichage
- Thème visuel cohérent
- Typographie optimisée

## Composants UI

### GeologicalPeriodCard
- Affichage des informations de la période
- Indicateur de sous-périodes
- Style cohérent avec le design system
- Animations au survol

### ArrowIcon
- Indicateur visuel pour les sous-périodes
- Style cohérent avec le design system
- Animation au survol

### BackButton
- Navigation vers le niveau supérieur
- Style cohérent avec le design system
- Icône de retour

### LanguageSelector
- Sélection de la langue d'affichage
- Style cohérent avec le design system
- Liste déroulante des langues disponibles

## Design System

### Typographie
- Police de base : -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif
- Tailles de police : xs (9.75px) à 3xl (24.375px)
- Interlignage : 1.5

### Couleurs
- Primaire : #2563eb
- Secondaire : #64748b
- Success : #22c55e
- Warning : #f59e0b
- Error : #ef4444
- Background : #ffffff
- Surface : #f8fafc
- Text : #1e293b
- Text Light : #64748b
- Border : #e2e8f0

### Espacement
- Base : 8px
- Multiplicateurs : 0.5x à 8x
- Système cohérent pour les marges et paddings

### Bordures et Ombres
- Rayons de bordure : sm (4px) à full (9999px)
- Ombres : sm à xl
- Transitions : fast (150ms) à slow (350ms)

## Interactions Utilisateur
- Hover effects sur les cartes
- Transitions fluides
- Retours visuels sur les actions
- Navigation intuitive

## Fonctionnalités

### Navigation

1. **Vue principale**
   - Affichage des éons géologiques principaux
   - Chaque carte affiche :
     - Nom de l'éon
     - Dates de début et fin avec leurs localisations respectives
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
   - Localisations temporelles avec dates associées
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
   - Gestion des erreurs de chargement

2. **Performance**
   - Retry automatique en cas d'erreur
   - Timeout de 30 secondes
   - Maximum 3 tentatives de retry

3. **Internationalisation**
   - Support multilingue (FR/EN)
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
2. Les sous-périodes sont chargées avec leurs localisations temporelles
3. L'utilisateur peut :
   - Voir les dates et localisations détaillées
   - Naviguer plus profondément dans la hiérarchie
   - Revenir en arrière avec le bouton retour

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
   - Certaines périodes peuvent manquer de données
   - Localisation géographique parfois incomplète
   - Support multilingue limité à FR/EN

2. **Performance**
   - Temps de chargement dépendant de la connexion
   - Latence possible avec l'API Wikidata
   - Maximum 3 tentatives de retry

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

### Structure des Données
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
```

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

## Interface Utilisateur

### Design System
L'application utilise un design system cohérent avec les caractéristiques suivantes :
- Taille de base de police : 13px
- Système de couleurs harmonieux et accessible
- Espacement cohérent basé sur 8px
- Typographie responsive et lisible
- Support du mode sombre/clair

### Navigation
- Header fixe avec titre et sélecteur de langue
- Affichage horizontal des périodes avec défilement fluide
- Bouton retour pour remonter dans la hiérarchie
- Indicateurs de chargement
- Messages d'erreur avec option de retry

### Composants
- Cartes de période géologique avec effets de survol
- Sélecteur de langue avec états actifs/inactifs
- Bouton retour avec animation
- Indicateurs de chargement
- Messages d'erreur et de succès

### Responsive Design
L'interface s'adapte à différentes tailles d'écran :
- Mobile : 1 colonne avec défilement horizontal
- Tablette : 2 colonnes avec défilement horizontal
- Desktop : 3-4 colonnes avec défilement horizontal
- Grand écran : 4 colonnes avec défilement horizontal

### États Visuels
- États de chargement avec spinner
- États d'erreur avec messages explicites et bouton retry
- États de succès avec confirmation
- États de survol sur les éléments interactifs
- États actifs pour les contrôles

### Accessibilité
- Contraste suffisant pour la lisibilité
- Focus visible sur les éléments interactifs
- Structure sémantique HTML
- Support des lecteurs d'écran
- Navigation au clavier
- Barre de défilement personnalisée et accessible

### Affichage des Périodes
- Cartes avec informations essentielles
- Dates de début et de fin
- Localisation géographique
- Indicateur de chargement
- État de sélection

### Gestion des États
- Chargement initial des éons
- Chargement des sous-périodes
- Messages d'erreur avec option de retry
- Transitions fluides entre les états

### Accessibilité
- Contraste optimisé pour la lisibilité
- Support du mode clair/sombre
- Navigation au clavier
- Messages d'état clairs 