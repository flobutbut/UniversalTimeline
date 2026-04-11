# Documentation Fonctionnelle

## Objectif
Application d'interaction avec l'API Wikidata

## Fonctionnalités
- À définir selon les besoins spécifiques du projet

## Composants
- **`PeriodCard.vue`** / **`PeriodGrid.vue`** (`src/views/HomeView/`) : affichage des périodes sur la timeline d’accueil

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

### Cartes période (HomeView)
- Composants **`PeriodCard.vue`** + grille **`PeriodGrid.vue`**
- Indicateur de sous-périodes (chevron / `hasChildren`)
- Style aligné sur le design system (`src/styles/variables.css`)

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
**Source de vérité** : tokens dans **`src/styles/variables.css`** (ex. `var(--color-primary)`, surfaces, textes, bordures, thème sombre). Les anciennes valeurs hex de cette section n’ont plus valeur normative.

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
   - Affichage des périodes du **niveau courant** (racines ou enfants selon la navigation / story d’entrée)
   - Chaque carte affiche :
     - Nom de la période
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
   - Retour rapide au niveau racine / précédent selon la pile de navigation

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
   - Chargement initial des périodes racines **ou** des périodes de la story d’entrée (voir `useHomeNavigation` / API)
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

1. L'utilisateur arrive sur la page d’accueil (timeline).
2. Une **grille** de cartes période s’affiche (niveau racine ou enfants de la période courante selon le chargement Pinia / API).
3. L'utilisateur peut parcourir la hiérarchie (clic sur période avec enfants, retour), changer la langue, etc.

### Navigation Approfondie

1. L'utilisateur sélectionne une période avec sous-niveaux
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
   - Timeline d’accueil : **grille** horizontale avec défilement (pas une simple liste verticale unique).
   - Vue **Periods** : navigation en **colonnes** (finder).
   - **Recherche globale** : `GlobalSearch.vue` dans le **header** (`Header.vue`).
   - **Thème clair / sombre** : `ThemeToggle.vue` + `useDocumentTheme`.
   - Filtrage par catégorie : selon les écrans (ex. liste événements) — pas « absent » partout.

## Spécifications Techniques

### API Wikidata
- **REST** : proxy `/api/wikidata/...` (ex. `wbsearchentities`) selon `server/src/api/routes.ts`.
- **SPARQL** : `WikidataQueryService` (dev : proxy Vite `/api/wikidata/sparql` ; prod : endpoint configurable).
- Détail des propriétés P31, P361, dates, etc. : **`Documentation-wikidata-properties.md`**.

### Structure des Données
Voir les types réels **`src/types/database.ts`** (`ListPeriod`, `Period`, `ListEvent`, `ListStory`, …) et la doc technique — ne pas utiliser d’anciens blocs TypeScript inventés ici.

## Améliorations Futures
Pistes produit (hors périmètre strictement « déjà livré ») : filtres avancés supplémentaires, export de données, breadcrumb dédié, historique de navigation persisté, etc. **Recherche globale**, **thème sombre** et **grille / colonnes** sont déjà présents dans l’application actuelle.

## Navigation Hiérarchique

### Description
La navigation se fait de manière hiérarchique, permettant aux utilisateurs d'explorer les périodes géologiques de manière intuitive.

### Fonctionnalités
1. **Navigation Vers l'Avant**
   - Affichage initial piloté par la story d’entrée et l’API (racines ou enfants chargés via Pinia)
   - Possibilité de cliquer sur une période pour voir ses sous-périodes
   - Chargement progressif des sous-périodes
   - Indication visuelle du nombre de sous-périodes disponibles

2. **Navigation Vers l'Arrière**
   - Bouton "Retour" apparaissant dès qu'une sous-période est affichée
   - Retour à la période parente précédente
   - Retour au niveau précédent (pile de parents) ; à la racine, réaffichage des périodes de départ

3. **États de Navigation**
   - Affichage du niveau de navigation actuel
   - Indication visuelle de la période sélectionnée
   - Gestion des états de chargement
   - Gestion des erreurs avec option de réessai

### Scénarios d'Utilisation
1. **Navigation Simple**
   - L'utilisateur voit les périodes du niveau courant (grille).
   - Il clique sur une période avec enfants pour charger le niveau suivant.
   - Le bouton « Retour » remonte d’un cran dans la pile.

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
- Barre de défilement personnalisée et accessible

### Affichage des Périodes
- Cartes avec informations essentielles
- Dates de début et de fin
- Localisation géographique
- Indicateur de chargement
- État de sélection

### Gestion des États
- Chargement initial des périodes (story d’entrée ou racines API)
- Chargement des sous-périodes
- Messages d'erreur avec option de retry
- Transitions fluides entre les états

### Accessibilité
- Contraste optimisé pour la lisibilité
- Support du mode clair/sombre
- Messages d'état clairs

## Performance

### Optimisations
1. **Requêtes**
   - Utilisation de DISTINCT pour éviter les doublons
   - Agrégation optimisée des données
   - Optimisation des jointures
   - Requêtes directes vers l'API Wikidata

2. **Chargement progressif**
   - Chargement initial des périodes affichées à l’arrivée
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

### Format des Dates
Le système affiche les dates de manière cohérente selon leur type :

1. **Événements** (ex: Extinction du Crétacé)
   - Format : "Il y a X Ma" pour les dates géologiques
   - Format : "Il y a X ans" pour les dates historiques
   - Exemple : "Il y a 66 Ma"

2. **Périodes** (ex: Règne de Louis XIV)
   - Format : "Il y a X ans (durée: Y ans)" pour les dates historiques
   - Format : "Il y a X Ma (durée: Y Ma)" pour les dates géologiques
   - Exemple : "Il y a 310 ans (durée: 77 ans)"

3. **Personnes**
   - Avec dates complètes : "Il y a X ans (Y ans)"
   - Avec date partielle : "Il y a X ans"
   - Exemple : "Il y a 310 ans (77 ans)"

### Règles de Formatage
- Les dates géologiques (> 1 million d'années) utilisent le format Ma (millions d'années)
- Les dates historiques utilisent le format "ans"
- La durée est toujours affichée entre parenthèses pour les périodes
- L'âge est affiché entre parenthèses pour les personnes
- Le préfixe "Il y a" est systématiquement utilisé

### Exemples
- Événement géologique : "Il y a 66 Ma"
- Événement historique : "Il y a 310 ans"
- Période géologique : "Il y a 66 Ma (durée: 1 Ma)"
- Période historique : "Il y a 310 ans (durée: 77 ans)"
- Personne avec dates complètes : "Il y a 310 ans (77 ans)"
- Personne avec date partielle : "Il y a 310 ans"

### Gestion des Erreurs
- En cas d'erreur de formatage, la date brute est affichée
- Les erreurs sont loggées dans la console pour le débogage
- Le système tente de reformater la date jusqu'à 3 fois en cas d'échec

### Performance
- Les résultats de recherche peuvent être mis en cache : **durée à vérifier dans le code** (`SearchApiService` / composables) avant de figer une valeur en spec.
- Les requêtes sont debounced (300ms) pour éviter les appels inutiles
- Timeout de 10 secondes sur les requêtes Wikidata

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

## Vue Base de Données

### Objectif
La vue base de données permet d'afficher et de gérer les données historiques de manière organisée, avec une séparation claire entre les périodes, les événements et les stories.

### Fonctionnalités

#### Affichage des Données
- **Onglet Stories (DatabaseView)** : mise en page en **deux zones** sur le modèle des colonnes finder de la vue **Periods** : colonne gauche (~300px) avec en-tête **Stories** + bouton **Add**, liste scrollable ; colonne droite : panneau de détail de la story sélectionnée (`StoryDetailPanel`).
- Les **stories** de la liste sont des lignes **`FinderItem`** (libellé = titre, sélection, action **Edit** au survol) ; le glisser-déposer n’est pas utilisé pour cette liste.

#### Cartes d'Information
- **Autres vues** (ex. listes périodes / événements ailleurs dans l’app) : chaque élément peut être affiché dans une carte avec titre, date(s), tags de catégories et bouton d’édition selon le contexte.

#### Navigation
- Accès via l’onglet « Stories » dans le header
- Possibilité de basculer entre la vue timeline et la vue Stories

#### Actions
- Édition des éléments via le bouton "Edit"
- Affichage des catégories pour une meilleure organisation
- Gestion des dates selon le type d'élément

#### Vue liste événements (`EventsView`)
- Filtre **période** : même **composants de menu** que le `Select` standard (`base-select__dropdown`, options, champ de recherche, ombre et transition). Panneau à **une seule colonne** : les **sous-périodes remplacent** la liste au clic sur une ligne avec enfants ; bouton **retour** (icône) vers le **parent**. Libellé + **dates début/fin** (`DateService`) ; chargement des enfants via l’API. **Toutes les périodes** réinitialise le filtre ; clic en dehors ferme le panneau.
- Survol d’une ligne : fond plus contrasté et liseré bleu vertical à gauche pour repérer la ligne active.
- La colonne **Catégories** occupe tout l’espace horizontal restant (`1fr`) après **Nom**, **Date**, **Modifié** et **Actions**.
- Colonne **Modifié** : date/heure de dernière mise à jour côté serveur (`updated_at`), affichage court en locale française.
- Tri au clic sur l’en-tête : **Date** par ordre chronologique (du plus ancien au plus récent en ordre croissant) ; **Nom** et **Catégories** par ordre alphabétique ; **Modifié** par date/heure de dernière modification (indicateur ▲/▼ sur la colonne active ; un second clic inverse le sens).
- Redimensionnement manuel des colonnes **Nom** et **Date** via les poignées sur l’en-tête (clic sur la poignée ne déclenche pas le tri) ; **Catégories** flexible, **Modifié** et **Actions** à largeur fixe.

### Interface Utilisateur
- Design moderne et épuré
- Responsive pour tous les écrans
- Animations subtiles pour une meilleure expérience utilisateur
- Support du thème sombre/clair

### Intégration
- Utilisation des données Wikidata
- Synchronisation avec la vue timeline
- Gestion cohérente des catégories 

## Flux de données

### Chargement des données
1. L'utilisateur accède à l’onglet **Stories** (`DatabaseView`).
2. Le composant est monté (`v-if` dans `App.vue` lorsque la vue est active).
3. **`useDatabaseView`** s’appuie sur le **store Pinia** `useDataStore` et sur **`StoryApiService` / `EventApiService` / `PeriodApiService`** (client HTTP **`ApiClient`**) pour charger listes et détails.
4. Les réponses sont typées selon **`src/types/database.ts`**.
5. Les stories sont affichées via **`FinderItem`** dans la colonne liste et le détail via **`StoryDetailPanel`**.

*(Les anciens services `DatabaseViewService` / `DatabaseQueryService` ont été retirés du code.)*

### Format des données
- Tous les textes sont multilingues (fr/en)
- Les dates sont au format ISO 8601
- Les catégories sont des objets avec id et label
- Les relations (périodes, événements, stories) sont gérées via des IDs

### Gestion des erreurs
- Les erreurs de l'API sont capturées et loggées
- Les erreurs de formatage sont gérées avec des valeurs par défaut
- Les erreurs sont affichées à l'utilisateur via le composant DatabaseView 

### Auto-remplissage Wikidata pour les événements

- Lors de la création ou l'édition d'un événement, la saisie d'un Q-id inexistant en base déclenche une tentative de récupération automatique des informations principales (titre, description, date) depuis Wikidata.
- Un toast informe l'utilisateur du succès ou de l'échec de l'opération. 

## Fonctionnalités

### Gestion des Périodes et Événements
- Création, modification et suppression
- Validation des données
- Support multilingue (FR/EN)
- Gestion des dates et localisations

### Intégration Wikidata
- Récupération automatique des données
- Bouton "Remplir avec Wikidata"
- Validation des Q-ids
- Gestion des erreurs de connexion

### Interface Utilisateur
- Design system cohérent
- Composants réutilisables
- Validation en temps réel
- Messages d'erreur explicites

### Formulaires
- Validation des champs requis
- Format des dates flexible
- Gestion des catégories
- Support des descriptions multilingues

## Workflows

### Création d'une Période
1. Cliquer sur "Nouvelle période"
2. Remplir le Q-id Wikidata
3. Optionnel : Cliquer sur "Remplir avec Wikidata"
4. Compléter les informations manquantes
5. Valider la création

### Modification d'une Période
1. Cliquer sur l'icône d'édition
2. Modifier les informations
3. Optionnel : Cliquer sur "Remplir avec Wikidata"
4. Valider les modifications

### Création d'un Événement
1. Cliquer sur "Nouvel événement"
2. Remplir le Q-id Wikidata
3. Optionnel : Cliquer sur "Remplir avec Wikidata"
4. Compléter les informations manquantes
5. Valider la création

### Modification d'un Événement
1. Cliquer sur l'icône d'édition
2. Modifier les informations
3. Optionnel : Cliquer sur "Remplir avec Wikidata"
4. Valider les modifications 

## [MAJ 2025-06-12] Fonctionnalités et expérience utilisateur

- Lors de l'édition ou de la création d'un événement/période, le QID Wikidata est vérifié pour éviter les doublons.
- Si un doublon est détecté, l'objet conflictuel est supprimé automatiquement et l'utilisateur est informé par un toast.
- Les dates des événements sont récupérées intelligemment depuis Wikidata (point in time, date de début, date de naissance, date la plus ancienne).
- L'utilisateur peut éditer un événement même si la date Wikidata n'est pas renseignée (champ éditable).
- L'interface est plus rapide grâce au chargement différé des données détaillées. 

## Gestion des Stories

### Création d'une Story
1. Dans la vue principale, cliquer sur le bouton "Add" dans la colonne Stories
2. Remplir le formulaire :
   - Titre en français (obligatoire)
   - Titre en anglais (optionnel, utilise le titre français par défaut)
   - Description en français (optionnel)
   - Description en anglais (optionnel)
   - Auteur (obligatoire)
   - Visibilité (publique par défaut)
3. Cliquer sur "Créer" pour sauvegarder la story

### Modification d'une Story
1. Cliquer sur le bouton d'édition d'une story existante
2. Modifier les champs souhaités
3. Cliquer sur "Mettre à jour" pour sauvegarder les modifications

### Affichage des Stories
- Colonne liste dédiée (structure **finder-column** comme la vue Periods) : une ligne **`FinderItem`** par story (titre ; ligne de dates peut rester vide selon le composant).
- Le détail (périodes / événements liés, actions) est dans le panneau de droite après sélection d’une story.
- Édition : bouton **Edit** sur la ligne (finder) ou flux modale existant.

### Gestion des erreurs
- Affichage d'un message d'erreur en cas d'échec de création/modification
- Validation des champs obligatoires avant soumission
- Gestion des erreurs de connexion au serveur 

## Fonctionnalités principales (mise à jour)

- Création, édition, suppression de stories, périodes, événements
- Association/dissociation de périodes et événements à une story via drag & drop
- Ouverture de la modale d'édition depuis la vue centralisée (DatabaseView.vue)
- Toutes les modifications sont immédiatement reflétées dans l'interface grâce au rechargement global
- Les **catégories** restent disponibles dans les formulaires et listes (ex. `EventsView`, modales d’édition) via `CategoryService` / colonnes dédiées.

### Expérience utilisateur
- L'utilisateur interagit avec une interface cohérente, sans désynchronisation
- Les modifications sont fiables et persistantes
- Les composants secondaires seront améliorés dans une prochaine étape 

## Saisie et gestion des dates

- L'utilisateur peut saisir n'importe quel format de date pour les événements et les périodes, y compris des dates négatives ou exotiques (ex : `-145000000-01-01T00:00:00Z`).
- Il n'y a plus de limitation ni d'erreur lors de la saisie ou de la modification de ces champs.
- L'interface et l'API sont synchronisées pour accepter et restituer ces formats de date. 

## Vue Periods (finder / colonnes)

### Description
L’onglet « Periods » ouvre la vue graphique : relations hiérarchiques entre les périodes géologiques sous forme d’arbre interactif.

### Fonctionnalités actuelles
- Colonnes type **finder** (`Periods.vue`, `FinderItem`, `useGraphView`) — **pas** de graphe D3.js dans ce composant.
- Drag & drop et chargement lazy des enfants via API / store.
- Gestion des états de chargement et des erreurs.
- Interface alignée sur le design system.

### Fonctionnalités à venir
- Filtres / options / export / édition avancée des relations selon roadmap (hors périmètre minimal actuel)

### État d'avancement
- [x] Structure de base
- [x] Intégration avec le design system
- [x] Implémentation de la navigation en colonnes
- [x] Gestion des données
- [x] Interactivité
- [ ] Export des données
- [ ] Modification des relations

## Gestion hiérarchique des périodes (backend et frontend)

- Stockage PostgreSQL côté schémas `periods` / `public` selon migrations — **référence** : `database/supabase-init.sql` + `database/migrations/` et requêtes dans `server/src/api/routes.ts`.
- L’API expose typiquement un **`parent_id`** (ou équivalent) pour le positionnement dans le graphe ; le store / `ListPeriod` peuvent inclure `parentId`, `hasChildren`, liste `children`, etc.
- La vue **Periods** charge les enfants via **`PeriodApiService`** / **`useDataStore`** ; des lignes **virtuelles Wikidata** peuvent apparaître avant persistance en base.

## Gestion des relations parent/enfant

- Hiérarchie **telle que renvoyée par l’API** et consommée par le front : voir **`src/types/database.ts`** et les mappeurs dans `routes.ts`.
- Le drag & drop appelle **`PeriodApiService.updateParent`** puis met à jour le store (`useGraphDragDrop`).

## Gestion des dates dans Wikidata

### Propriétés de date utilisées
- `P580` (start time) : Date de début
- `P582` (end time) : Date de fin
- `P571` (inception) : Date de formation/création
- `P585` (point in time) : Pour les événements ponctuels
- `P1619` (earliest date) : Pour la date la plus ancienne
- `P1620` (latest date) : Pour la date la plus récente

### Ordre de priorité des dates
1. Pour la date de début : earliestDate > formationDate > startDate > pointInTime
2. Pour la date de fin : latestDate > endDate > TODAY

## Gestion des conflits de Q-id

### Comportement actuel
- Lors de la création ou modification d'une période/événement avec un Q-id existant
- Le système détecte automatiquement le conflit
- L'élément existant est automatiquement supprimé
- Un message de confirmation est affiché à l'utilisateur
- La création/modification se poursuit normalement

### Cas d'utilisation
- Création d'une nouvelle période avec un Q-id existant
- Modification d'une période existante avec un nouveau Q-id déjà utilisé
- Import de données depuis Wikidata avec des Q-id en conflit

## Gestion Multilingue

### Labels
- Tous les labels dans l'application sont gérés en français et en anglais
- L'interface utilisateur affiche par défaut les labels en français
- Les données sont stockées avec leurs versions française et anglaise

### Composants
- Les composants d'affichage doivent toujours gérer les labels dans les deux langues
- L'affichage par défaut est en français
- Les composants d'édition doivent permettre la saisie dans les deux langues

### Import de données
- Les données importées de Wikidata sont automatiquement converties en format multilingue
- Si une traduction n'est pas disponible, la version française est utilisée comme fallback

### Base de données
- Les labels sont stockés avec leurs versions française et anglaise
- Les requêtes API retournent toujours les deux versions des labels

## Gestion des identifiants

### Système d'identification
- Chaque entité (période, événement, catégorie, story) possède un identifiant unique (UUID)
- Les UUIDs sont générés automatiquement lors de la création
- Les IDs Wikidata (Q-id) sont conservés comme référence externe
- Les relations entre entités utilisent les UUIDs

### Avantages du système
- Garantie d'unicité des identifiants
- Pas de conflit lors de la création
- Sécurité accrue
- Facilité de réplication de base de données
- Possibilité de modifier les noms/labels sans impact sur les relations

### Cas d'utilisation

#### Création d'une période
1. L'utilisateur remplit le formulaire
2. Le système génère un UUID
3. La période est créée avec :
   - UUID généré
   - Q-id Wikidata
   - Labels et descriptions
   - Dates et localisation
   - Relations (parent/enfant)

#### Création d'un événement
1. L'utilisateur remplit le formulaire
2. Le système génère un UUID
3. L'événement est créé avec :
   - UUID généré
   - Q-id Wikidata
   - Labels et descriptions
   - Date
   - Catégories

#### Création d'une story
1. L'utilisateur remplit le formulaire
2. Le système génère un UUID
3. La story est créée avec :
   - UUID généré
   - Titre et description
   - Auteur
   - Visibilité
   - Périodes et événements associés

### Gestion des relations

#### Relations parent/enfant
- Une période peut avoir un parent
- Une période peut avoir plusieurs enfants
- Les relations sont gérées via les UUIDs
- La modification d'une relation met à jour :
  - Le champ `hasParent` de l'enfant
  - Le champ `children` du parent

#### Relations avec les catégories
- Les périodes et événements peuvent avoir plusieurs catégories
- Les catégories peuvent avoir un parent
- Les relations utilisent les UUIDs
- La modification des catégories met à jour les relations

### Gestion des erreurs

#### Conflits d'IDs
- Les conflits d'UUIDs sont impossibles (génération unique)
- Les conflits de Q-id Wikidata sont gérés :
  - Vérification avant création
  - Message d'erreur explicite
  - Option de remplacement

#### Erreurs de relation
- Vérification de l'existence des UUIDs
- Validation des relations parent/enfant
- Messages d'erreur explicites
- Rollback automatique en cas d'erreur

### Maintenance

#### Sauvegarde
- Les sauvegardes incluent tous les UUIDs
- Les relations sont préservées
- La restauration est possible sans conflit

#### Migration
- Les anciens IDs sont convertis en UUIDs
- Les relations sont préservées
- Les données sont cohérentes

#### Monitoring
- Suivi des créations/modifications
- Logs des erreurs
- Statistiques d'utilisation

## Navigation dans l'arborescence

### Navigation à la souris
- Sous chaque libellé de période, une **ligne secondaire** affiche la **date de début et la date de fin** (format lisible via `DateService`) ; les valeurs manquantes ou non renseignées apparaissent comme « — ».
- Cliquer sur une période pour la sélectionner
- Les périodes enfants apparaissent dans la colonne suivante
- Cliquer sur une période dans une colonne enfant pour voir ses propres enfants
- Pendant le chargement des enfants (API puis Wikidata), la colonne cible affiche *Loading child periods from Wikidata…* ; une fois terminé, si la liste est vide : *No child periods*. La colonne racine vide affiche *Aucune période racine*.
- Le chevron (>) indique qu'une période a des enfants

### Enfants absents en base (Wikidata)
- Si la période n’a pas encore d’enfants chargés dans l’application et qu’aucune ligne enfant n’est renvoyée par l’API (ou que `has_children` est faux sans lignes), mais que la période possède un identifiant Wikidata (`Q…`), les enfants directs sont chargés depuis Wikidata (relation « part of », P361).
- Le finder n’exécute qu’**une** requête SPARQL pour lister ces enfants (avec leurs libellés), afin d’éviter les centaines d’appels simultanés que Wikidata refuse (erreur 429) — cas typique de l’Empire romain (Q2277), qui a de très nombreux « enfants » P361.
- Seules les entités classées côté Wikidata comme **périodes temporelles** (géochronologie, chronostratigraphie, période historique ou archéologique — voir `Documentation-wikidata-properties.md`) sont retenues ; les provinces, villes ou autres « parties » non temporelles sont ignorées.
- Ces entrées sont affichées dans le finder avec un identifiant technique préfixé `wikidata:` ; elles ne sont pas créées automatiquement en base PostgreSQL tant qu’on ne les enregistre pas via l’édition / création habituelle.
- Dans la liste, une **bordure gauche bleue** et un **chevron bien visible** signalent une période **en base** avec sous-niveaux possibles ; les seules lignes **Wikidata** (id `wikidata:…`) utilisent une **bordure grise**, un chevron plus discret et un **libellé rouge saturé** (`--color-wikidata-label`, harmonisé au bleu primaire ; variante plus claire sur la ligne sélectionnée). Au survol, ces lignes proposent **Add** (création en base avec brouillon prérempli) au lieu de **Edit**.

### Déplacement des périodes
- Glisser-déposer une période vers une autre pour la déplacer
- Glisser-déposer une période vers une colonne pour la déplacer à ce niveau
- Impossible de déplacer un parent dans un de ses propres descendants

### Actions disponibles
- Bouton "Edit" : Modifier une période
- Bouton "Add" : Ajouter une nouvelle période dans la colonne sélectionnée