# Documentation Fonctionnelle

## Objectif
Application d'interaction avec l'API Wikidata

## Fonctionnalités
- À définir selon les besoins spécifiques du projet

## Composants
- GeologicalPeriodCard : Affichage des informations sur les périodes géologiques

## Vue d'ensemble
Le projet est une application web permettant de naviguer dans une timeline géologique interactive, utilisant les données de Wikidata.

## Fonctionnalités Principales

### Navigation
- Affichage de la liste des périodes géologiques
- Navigation dans la hiérarchie des périodes avec period-click
- Bouton de retour pour remonter dans la hiérarchie avec informations temporelles
- Indicateurs visuels pour les périodes avec sous-périodes
- Gestion des états de chargement par période
- Support multilingue (fr, en)
- Tri chronologique des périodes
- Formatage des dates (Ga, Ma, ans)
- Gestion des erreurs avec retry
- Visualisation temporelle avec échelle adaptative

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

1. **Grille des périodes**
   - Affichage chronologique
   - Cartes interactives
   - Indicateurs de chargement

2. **Navigation**
   - Bouton retour avec informations temporelles
   - Affichage du label de la période parent
   - Affichage des dates et de la localisation
   - Indicateurs de progression
   - Gestion des erreurs

3. **États visuels**
   - États de chargement avec spinner
   - États d'erreur avec messages explicites et bouton retry
   - États de succès avec confirmation
   - États de survol sur les éléments interactifs
   - États actifs pour les contrôles

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

## Performance

### Optimisations
1. **Requêtes**
   - Utilisation de DISTINCT pour éviter les doublons
   - Agrégation optimisée des données
   - Optimisation des jointures
   - Requêtes directes vers l'API Wikidata

2. **Chargement progressif**
   - Chargement initial des éons principaux
   - Chargement à la demande des sous-périodes
   - Vérification asynchrone des enfants 

## Validation des Données

### Critères de Validité d'une Période
Une période est considérée comme valide si :
1. Elle possède au moins une date (début ou fin)
2. Elle possède un label dans une des langues configurées
3. Elle est correctement liée à la hiérarchie des périodes

### Gestion des Cas Invalides
- Les périodes sans dates sont automatiquement filtrées
- Les périodes sans label sont ignorées
- Des logs détaillés sont générés pour le débogage
- Des messages d'erreur explicites sont retournés

### Performance
- Filtrage optimisé au niveau SPARQL
- Validation supplémentaire côté client
- Logs détaillés pour le suivi des périodes filtrées 

## Affichage des Dates

### Format d'Affichage
- Très anciennes (≥ 1 milliard d'années) : "X.XX Ga"
- Anciennes (≥ 1 million d'années) : "X.XX Ma"
- Récentes (< 1 million d'années) : "XXXX ans" 

### Visualisation Temporelle
- Affichage des périodes en une seule colonne
- Largeur des cartes proportionnelle à la durée des périodes
- Positionnement relatif basé sur les dates de début
- Gestion des périodes sans date de fin (utilisation de la date actuelle)
- Affichage des dates formatées (Ga, Ma, ans)
- Interface responsive en une seule colonne

### Composants UI

## Recherche Temporelle

### Types de Recherche

1. **Événements**
   - Recherche d'événements ponctuels dans le temps
   - Affichage : "Il y a X ans/Ma/Ga"
   - Exemple : "Big Bang" → "Il y a 13.8 Ga"

2. **Périodes**
   - Recherche d'intervalles de temps
   - Affichage : "Durée (il y a X ans/Ma/Ga)"
   - Exemple : "Jurassique" → "56 Ma (il y a 145 Ma)"

3. **Personnages Historiques**
   - Recherche de personnes avec leurs dates de vie
   - Affichage : "Age ans (il y a X ans)" ou "Né/Mort il y a X ans"
   - Exemple : "Napoléon" → "51 ans (il y a 203 ans)"

### Formatage des Dates

1. **Dates Géologiques**
   - Milliards d'années : "13.8 Ga"
   - Millions d'années : "145 Ma"

2. **Dates Historiques**
   - Années simples pour les périodes < 1M ans
   - Format : "3200 ans"

3. **Dates Modernes**
   - Format standard pour les dates récentes
   - Calcul précis du temps écoulé

### Fonctionnalités de Recherche

1. **Recherche Textuelle**
   - Recherche par nom d'événement/période/personne
   - Support multilingue (français par défaut)
   - Suggestions automatiques

2. **Filtres**
   - Par type (événement/période/personne)
   - Par échelle de temps
   - Par localisation

3. **Résultats**
   - Affichage du nom et de la description
   - Formatage intelligent des dates
   - Indication des lieux associés

## Utilisation

### Exemples de Recherche

1. **Événements Géologiques**
   ```
   Recherche : "Big Bang"
   Résultat : Il y a 13.8 Ga
   ```

2. **Périodes Historiques**
   ```
   Recherche : "Âge du Bronze"
   Résultat : 2200 ans (il y a 3200 ans)
   ```

3. **Personnages**
   ```
   Recherche : "Jules César"
   Résultat : 56 ans (il y a 2067 ans)
   ```

### Notes d'Utilisation

- Les dates sont automatiquement converties dans le format le plus approprié
- Les durées sont calculées précisément pour les périodes
- Le temps écoulé est toujours calculé par rapport à aujourd'hui
- Les lieux sont indiqués quand ils sont disponibles 