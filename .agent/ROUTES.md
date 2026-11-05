> Mis à jour le : 2026-10-29 — lot 8, vérifié sur le code et les tests locaux

# Routes (Vue Router)

`src/router/index.ts` crée le routeur avec `createWebHistory()`. `routes.ts` associe les chemins aux vues par import différé. `App.vue` les affiche dans RouterView ; le composant factice AppRouteShell et le rendu manuel par chemin ont été retirés.

| Chemin | Nom | Vue | Description |
|---|---|---|---|
| `/` | `landing` | `LandingView.vue` | Accueil public, démonstration de durées et présentation de la plateforme |
| `/voyage` | `landing-scroll` | `ScrollLandingView.vue` | Second concept public : zoom temporel lié au scroll, du cosmos à une seconde |
| `/timeline` | `timeline` | `HomeView.vue` | Grille timeline et navigation hiérarchique |
| `/database` | `database` | `DatabaseView/DatabaseView.vue` | Onglet Stories |
| `/periods` (alias `/graph`) | `graph` | `AdminView/AdminView.vue` → `GraphView/Periods.vue` | Catalogue Périodes dans le menu Administration, réservé aux admins (`meta.admin`) ; les deux URL existantes sont conservées |
| `/events` | `events` | `AdminView/AdminView.vue` → `EventsView/EventsView.vue` | Catalogue Événements dans le menu Administration, réservé aux admins (`meta.admin`) |
| `/admin` | `admin` | `AdminView/AdminView.vue` | Admin seulement : menu à gauche (Tableau de bord, Utilisateurs, lien Design system), `?section=users` pour la liste, `&user=<uuid>` pour la fiche et ses actions |
| `/profile` | `profile` | `ProfileView.vue` | Profil du compte : nom d’utilisateur et avatar, données et confidentialité (conditions, export, cookies, suppression), session ; `SidebarLayout`, `?section=privacy|session` |
| `/legal/:page` | `legal` | `LegalView.vue` | Public : mentions légales, confidentialité, cookies, conditions (`src/lib/legalDocuments.ts`) |
| `/reset-password` | `password-reset` | `PasswordResetView.vue` | Public : demande de lien (`resetPasswordForEmail`, réponse neutre) ; avec `token_hash` + `type=recovery`, retire le jeton de l’URL, `verifyOtp` puis nouveau mot de passe (`updateUser`). Lien depuis « Mot de passe oublié ? » de `/login` |
| `/contact` | `contact` | `ContactView.vue` | Public : adresse `CONTACT_EMAIL` et sujets pré-remplis par `mailto:`, même menu latéral que les pages légales (`legalMenu`) |
| `/design-system` | `design-system` | `DesignSystemView/DesignSystemView.vue` | Démonstration des composants |
| `/:pathMatch(.*)*` | `not-found` | `NotFoundView.vue` | Page introuvable, lien vers la timeline, aucun onglet actif |

## État et cycle de vie

Les tableaux du catalogue et des utilisateurs partagent `CatalogueTable` : colonnes ajustées à la largeur disponible, poignées souris/clavier, double-clic pour ajuster au contenu. Périodes, Événements et Utilisateurs proposent des cases de sélection ; « Tout sélectionner » vise uniquement les lignes affichées et autorisées, et les filtres retirent les lignes masquées de la sélection. Les actions groupées passent par les API existantes : suppression confirmée avec bilan des refus, ajout/retrait d’une frise en une transaction pour les fiches, suspension/réactivation des comptes ordinaires et export CSV. Les administrateurs et le compte courant sont exclus des actions groupées sur les utilisateurs. Une réponse d’écriture incertaine arrête le lot et impose un rechargement, sans renvoi automatique.

- `navigation.ts` expose `NavigationView`, les onglets et la correspondance avec les noms de routes. La navigation principale propose Exploration, Frises et Administration (admins). Périodes et Événements sont chargés à la demande dans le menu Administration ; leurs URL, paramètres de recherche et gardes restent conservés. Design system est aussi accessible depuis ce menu. L’onglet Administration reste actif pour ces trois destinations (`PARENT_VIEWS`).
- `useAppNavigation` dérive l’onglet actif de la route résolue. Il conserve la page précédente pendant le chargement, expose un message avec Réessayer en cas d’erreur, ignore les erreurs tardives de navigations abandonnées et désinscrit ses gardes à la destruction du shell.
- RouterView utilise son slot pour placer le composant de page dans KeepAlive. `include="HomeView"` et `max=1` conservent uniquement la timeline. Son nom est explicite dans `defineOptions` ; la clé est le nom de route pour éviter une réinitialisation lors des changements de query/hash.
- Le breadcrumb des stories, les snapshots de périodes par story, la période courante et la pile de navigation de la timeline survivent aux changements d’onglet et aux retours navigateur. Les autres pages sont démontées en quittant leur route. Le cache reste en mémoire : un rechargement complet redémarre la timeline ; aucun lien profond vers une période n’est ajouté ici.
- Une entrée directe sur Stories, Periods, Events ou Design system ne monte pas HomeView et ne lance pas ses lectures. Les données propres à ces pages et à l’en-tête continuent de suivre leur cycle normal.

## Authentification et hébergement

Les gardes de navigation concernent le chargement des pages ; aucune authentification ou autorisation n’est ajoutée dans ce lot (A01 dans le suivi). Avec createWebHistory, l’hébergement doit servir index.html pour les URL front directes. La page introuvable est rendue côté client ; le serveur Vite renvoie donc HTTP 200 pour son document HTML.

Références : [imports différés Vue Router](https://router.vuejs.org/guide/advanced/lazy-loading), [cache KeepAlive de Vue](https://vuejs.org/guide/built-ins/keep-alive).


## Accès préparés (lots 17–18)

`/login` et `/forbidden` sont des vues publiques différées. `/timeline` et la page introuvable restent publics. Les autres routes exigent un compte ; `/design-system` exige en plus le rôle admin vérifié. `main.ts` installe `installAccessGuard` avant le routeur ; App retire immédiatement une page qui perd son autorisation et réinitialise le KeepAlive au changement d’identité. Ces règles s’activent avec le mode annoncé par `/api/access` ; le mode historique reste local uniquement.

## Landing page (30 octobre 2026)

La route publique `/` utilise `meta.landing` pour afficher son propre en-tête et son conteneur défilable. L’en-tête applicatif relie sa marque à cet accueil. `LandingTimeDemo` propose quatre échelles linéaires (Terre, dinosaures, Homo sapiens, inventions), à partir de repères arrondis et sourcés dans `src/lib/landingTimeline.ts`, distincts du catalogue chargé en direct. La vue initiale part de la formation de la Terre (4,54 milliards d’années), avec les traces de vie, les dinosaures non aviens et notre espèce. Les durées restent proportionnelles même sous le pixel ; un trait de repérage de 1 px est affiché séparément si nécessaire. Les pixels indiqués sont mesurés par ResizeObserver. La page utilise les tokens du design system, Button, Tabs et ThemeToggle, sans palette locale ; les thèmes clair/sombre restent partagés avec l’application. La page ne lance aucune lecture du catalogue. Les liens vers `/timeline` et `/login?mode=signup&redirect=/database` utilisent les parcours existants ; les comptes vérifiés accèdent directement à `/database`. HomeView reste la seule page mise en cache.

## Variante au scroll (31 octobre 2026)

`/voyage` conserve le premier concept sur `/`. Treize étapes sourcées dans `src/lib/scrollJourney.ts` vont du Big Bang à des durées familières (80 ans illustratifs, journée, minute, seconde). `useScrollJourney` mesure le défilement natif dans un conteneur local, borne sa progression et interpole les durées en logarithme ; chaque axe dessiné par `ScrollTimeLens` reste linéaire et ancré au présent. Les contrôles permettent aussi de sauter à une étape. Un dernier écran de défilement maintient le cadre d’une seconde avant la sortie ; un redimensionnement conserve la progression sans ramener un lecteur de la transcription dans l’animation. La préférence de réduction des animations remplace le zoom continu par des paliers ; une transcription complète est disponible via Lecture directe. rAF, ResizeObserver et listeners sont nettoyés au démontage. Les CTA utilisent uniquement des frises publiques confirmées par StoryApiService (IDs existants vérifiés), avec repli explicite vers l’explorateur en cas d’absence/erreur. Les durées illustratives proposent de créer sa propre frise. Aucun nouveau paramètre de zoom ni lien profond vers une période n’est inventé dans la timeline.


## Frises — mise à jour Figma du 31 octobre 2026

`/database` présente une barre d’onglets (`StoryTabsBar`) : l’onglet Accueil affiche toutes les frises en cartes ou en liste (`StoryGallery`, choix mémorisé dans le navigateur), chaque frise ouverte a son onglet fermable. `/database?story=<id>` ouvre une frise détenue par le compte courant et l’ajoute aux onglets ; fermer l’onglet actif passe à sa voisine, puis à l’accueil. `useStoryTabs` garde les IDs ouverts en sessionStorage et retire ceux qui ne figurent plus dans la liste accessible chargée. Les liens de frises associées utilisent cette cible. Recherche locale ; « Ajouter un filtre » (`StoryFilters`) ouvre visibilité, tags (catégories portées par les frises chargées, une frise passe si elle porte l’un d’eux) et période couverte, chaque filtre actif devient une puce retirable. La miniature des cartes ne garde que les racines et leurs enfants directs, sur 4 lignes au plus. La liste affiche les dates techniques transportées par l’API, sinon un tiret. Les paramètres sont accessibles par l’onglet Settings du détail.

`GET /api/stories` joint `preview_periods` et `preview_events` (IDs, bornes temporelles et parent pour les périodes) pour les compteurs et les miniatures sans requête par carte.

`PUT /api/stories/:storyId/root-period` reçoit `{ periodId }`. Transaction sous le principal existant : verrou de propriété, vérification de la période, conservation de la branche déjà associée sous cette racine, retrait des autres associations de périodes, insertion de la racine et nettoyage des ancres de périodes retirées. Catalogue, événements et relations de frises sont conservés. Aucune migration de schéma.

`POST /api/stories/:parentId/child-stories` accepte en complément `anchor: { anchorType: "period" | "event", anchorId }`. La cible doit appartenir à la frise parente ; rattachement et ancrage sont atomiques.


Le switch « Périodes additionnelles » conserve les racines propres à la frise et complète leurs descendants avec le catalogue et `WikidataQueryService.loadPeriodChildrenByWikidataId` (enfants directs P361, requête SPARQL existante avec cache et annulation). Il interroge les périodes du chemin ouvert, ou les racines de la frise en l’absence de sélection, même si des enfants locaux existent. Les suggestions Wikidata restent locales à cette frise, sont dédupliquées par Q-id et ne sont pas enregistrées lors de la détection. Sans Q-id, seuls les enfants locaux sont chargés.

Le « + » d’une suggestion ouvre EditModal prérempli ; après confirmation, la période est créée sous son parent enregistré puis son véritable ID est associé à la frise. Une période Wikidata déjà présente est réutilisée sans modifier son catalogue. Les descendants virtuels sont explorables mais leur parent doit être importé avant leur ajout. Une erreur conserve le formulaire ; une nouvelle tentative explicite recherche à nouveau le Q-id pour éviter de recréer une période déjà enregistrée. Les changements de frise annulent la publication des lectures tardives et les écritures déjà engagées restent attachées à leur cible initiale.


Le détail de frise conserve son en-tête et ses onglets fixes. La zone en dessous (aperçu, filtres et navigation) défile verticalement, avec 128 px d’espace après les colonnes. Les colonnes prennent la hauteur de la plus longue, déterminée par leur contenu, sans hauteur minimale imposée ni défilement vertical interne ; seule la page défile verticalement. Le défilement horizontal des colonnes reste disponible. L’aperçu affiche toujours toutes les périodes et tous les événements de la frise, indépendamment de l’exploration des colonnes, des filtres et de l’onglet actif. Les bornes de l’axe restent calculées sur la frise complète.


## Timeline — frises associées aux périodes

Toutes les périodes, mères, enfants et racines, portent un badge textuel « 1 frise » / « 2 frises » lorsqu’elles ont des frises associées ; aucun badge à zéro. Les rattachements à la frise entière sans ancre sont proposés depuis ses périodes racines, tandis que les ancres de périodes et d’événements conservent leur propre périmètre. `useTimelineAssociatedStories` lit les enfants et leurs ancres une seule fois par frise via `getStory`, puis répartit les liens par période ; changer de niveau ne lance pas de lecture par carte. Les périodes sans date suivent le même parcours. Le badge ouvre un overlay ancré, avec choix explicite de la frise, état vide, chargement et erreur réessayable. Sélectionner une entrée réutilise `selectStory` et ses snapshots de navigation ; le fil d’Ariane restaure la frise et le niveau précédents. Échap ou un clic extérieur ferme l’overlay ; changer de contexte ou quitter la timeline annule les lectures tardives et ferme le panneau. Les titres sont des boutons natifs distincts des badges, pour explorer une période sans déclencher le choix de frise, et réciproquement. Aucun nouveau rattachement ni modification des données n’est réalisé par ce parcours.

Les emplacements de frises utilisent `storyRelationLocations` : racine explicite (`atRoot`), période ou événement. Seuls les anciens liens sans champ `atRoot` et sans aucune ancre conservent une racine implicite ; filtrer une ancre absente ne crée jamais de racine. L’éditeur, le drag des colonnes et la navigation appliquent cette règle. Les liens événementiels restent dans les événements. Le serveur refuse les déplacements et changements de présentation depuis une racine inexistante (409), sans modifier les autres emplacements. Le sélecteur du breadcrumb propose les racines, puis les périodes visibles, sans liens uniquement événementiels. L’audit en lecture seule `database/audits/story-relation-locations.sql` recense les liens événementiels seuls et les ancres absentes pour examen manuel, sans réparation automatique.
