> Généré le : 2026-04-11 — Source : analyse du code source

# Changelog — documentation agent

## [2026-11-01] — Mise en production Vercel

`vercel.json` en services (`app` Vite avec repli SPA, `server` Express) : `/api/*` vers l’API, le reste vers le front, sans binding. Nouvelle entrée `server/src/vercel.ts` (app exportée, vérification de la base au chargement) et `buildCommand: tsc --noEmit` pour que Vercel n’utilise pas le `dist/` à plat. `testConnection` consigne désormais le code d’erreur (sans message ni URL). Base via le Session pooler IPv4 sur Vercel (`ENOTFOUND` avec l’hôte direct IPv6). Domaine `universaltimeline.net` (Hostinger) relié, `www` en 308, HTTPS actif. Vérifié en production : `/api/access` 200, `/api/account` 401, recherche de stories 200, 404 API, routes SPA rechargées, timeline chargée dans le navigateur. 1079 tests et types validés. Inscription/connexion non testées en production (aucun compte créé).

## [2026-11-01] — Frises en onglets

La colonne latérale des frises est retirée au profit d’onglets (Accueil + frises ouvertes, fermeture au clic ou clic milieu). La galerie désactivée est réactivée et mise à jour selon Figma : cartes (miniature, titre, compteurs, bornes) et liste (Frise, Début – Fin, Last edit, Création, sans date inventée). Filtres : bouton « Ajouter un filtre » et puces retirables. Miniature des cartes (`layoutCompactLanes`) : racines et enfants directs seulement, 4 lignes au plus, écart constant de 2 px, ligne d’événements dessous ; la vue complète garde toutes les périodes. Filtre Tags (catégories des frises, au moins un tag choisi) dans le panneau, une puce par tag. Icônes Figma ajoutées à DesignIcon (accueil 18 px, liste, fermetures) ; grille via `mdi:view-grid`. 1079 tests, types validés, recette navigateur desktop/mobile en lecture seule.

## [2026-11-01] — Fil d’Ariane continu entre frises

Audit : doublons dus aux frises enfants qui commencent par leur période d’ancrage (titre par défaut identique), au fil qui juxtaposait titres de frises et périodes de la seule frise courante, aux suggestions calculées sur tout le chemin (Mars ouvrait « Big Bang ») et à une frise d’entrée supposée à l’ouverture par lien. Correction : un chemin continu par frise (`buildTimelineBreadcrumb`, sans icône : « Frise : » lu seulement), fusion du repère avec une racine de même nom ou avec la période d’où part la frise ; suggestions limitées à la période cliquée ; lignée réelle via `parent_story_id` ajouté à la liste des frises (`storyAncestorIds`, arrêt à un parent inaccessible, cycle ignoré). Le repère d’une frise quittée ouvre sa vue d’ensemble, ses périodes rouvrent le niveau choisi. 1072 tests, types front/serveur validés ; recette navigateur sur l’API locale en lecture seule. Données non modifiées.

## [2026-10-31] — Frises : design system et écrans Figma

Tokens d’usage clair/sombre, styles typographiques compacts et boutons 28/36/44 px avec état Toggled. Galerie avec miniatures temporelles réelles, recherche et filtre de visibilité ; ouverture par URL et retour galerie. Onglets au-dessus de la timeline, en-têtes de colonnes avec actions sous le titre, panneaux Tags/Settings branchés sur l’édition existante et liens de frises associées. Sélecteur de racine avec persistance transactionnelle et conservation du choix en cas d’erreur. Ajout de frise depuis une colonne ou un événement ancré dans la même transaction. SVG Figma locaux. Vérification navigateur en clair/sombre, mobile 390 px, tablette 1024 px et desktop ; aucun contenu utilisateur modifié pour ces vérifications. `yarn verify` : 950 tests, configuration, symboles inutilisés et builds frontend/API réussis. Tests PostgreSQL réels sur une base locale jetable pour les nouvelles opérations et leurs refus ; aucune migration ni modification de configuration distante.

## [2026-10-30] — UI11 : diagnostic et erreurs d’inscription

Refus récents de mots de passe faibles et compte de test absent constatés en lecture seule. Service d’e-mail intégré confirmé dans Supabase, SMTP personnalisé restant à configurer ; aucun fournisseur/domaine d’envoi retrouvé dans la documentation locale. Messages d’inscription traduits par code autorisé, aide du mot de passe accessible, alias `+` préservé et erreurs inconnues neutres. Douze régressions ajoutées ; 874 tests/68 fichiers, quatre contrôles de configuration, types/inutilisés et builds réussis sans réseau. Aucun compte créé, e-mail envoyé, paramètre Supabase ou donnée distante modifié. Livraison de confirmation non validée, en attente du fournisseur/domaine.

## [2026-10-30] — UI10 : marqueurs liés opaques

Transparence retirée des marqueurs liés par catégorie. Opacité calculée de 1 vérifiée sur les cinq événements liés à Eukaryota dans le navigateur. CSS uniquement, pas de suite globale relancée.

## [2026-10-30] — UI09 : mise en évidence des catégories d’événements

Lecture des événements de story corrigée pour inclure les catégories, en réutilisant la jointure existante du détail et l’agrégation partagée ; champs de liste historiques conservés, événements non catégorisés inclus et requête redondante retirée. Quatre régressions API/HomeView, 862 tests/68 fichiers, configuration, types/inutilisés et builds réussis. API locale seule rechargée, 14 événements catégorisés confirmés en lecture anonyme ; Eukaryota/Explosion cambrienne vérifiés dans les deux sens et à la désélection. UX03 résolu, UX04 navigation par thème reste ouvert. Aucun schéma ni contenu distant modifié.


## [2026-10-30] — UI08 : audit UX exploration

Audit expert de la frise, du passage aux stories et des catégories, documenté dans AUDIT-UX-EXPLORATION.md. Périmètre confirmé : catalogue et découvertes externes. Dix constats classés P1/P2, avec impasses de navigation, deux stories enfants sans ancre, catégories omises sur les 14 événements transmis à la frise, absence de choix de parcours dans la lecture et enfants du catalogue exclus par la story. Proposition de catalogue libre, thèmes transversaux, parcours guidés et découverte externe progressive ; quatre lots proposés, maquette avant refonte. Recette UI et lectures anonymes de l’API locale ; aucun code applicatif, contenu ou paramètre distant modifié. Tests UI07 non relancés pour cette passe documentaire.


## [2026-10-29] — UI07 : fil d’Ariane complet

StoryBreadcrumb étendu aux périodes de la navigation courante : ancêtres cliquables, liste ordonnée, niveau courant annoncé et focus clavier restauré après chargement. Retour multi-niveaux sans doublon de pile, annulation des résultats tardifs, vue d’ensemble de la story et snapshots inter-stories conservés. Chemin dans le flux et libellés adaptables aux petits espaces. 858 tests/67 fichiers dont 13 nouveaux, quatre tests de configuration, types/inutilisés et builds validés sans réseau ; recette réelle jusqu’à Terre et retours directs réussis. Sélecteur de catégories non implémenté, à discuter. Aucune modification de données ni publication.

## [2026-10-29] — UI06 : transition horizontale sans saut de hauteur

Correction de la régression UI05 : retour à la ligne retiré de la classe d’interaction immédiate. Les cartes restent sur une ligne pendant l’élargissement ; repli séparé uniquement pour un texte dépassant toute la frise, après atteinte effective de la largeur disponible, sans délai fixe. Deux scénarios de transition ajoutés, 845 tests/65 fichiers, quatre tests de configuration, types/inutilisés et builds validés. Mesures navigateur en cours d’animation : carte 52 px, couloir 56 px et axe immobiles, clavier/survol et retour vérifiés. Infobulle toujours désactivée et conservée. Aucun changement de données ni publication.

## [2026-10-29] — UI05 : agrandissement du texte et infobulle désactivée

Infobulle UI04 conservée avec son rendu, ses styles et ses tests, mais désactivée par défaut via la prop PeriodGrid.periodTooltips. Agrandissement existant étendu au besoin réel du nom et des dates tronqués, au survol comme au clavier ; même projection pour les périodes et les événements, largeur des cartes déjà lisibles conservée, retour à l’échelle initiale, repli des textes très longs et hauteur adaptée. Mesures séparées dans useTimelinePeriodExpansion. 843 tests/65 fichiers, quatre tests de configuration, types/inutilisés et builds front/API réussis hors réseau. Recette Hadéen et Phanérozoïque sans infobulle, marqueurs sur l’axe, échelle restaurée. Aucun changement de données ni publication.

## [2026-10-29] — UI04 : projection des périodes et infobulle complète

Deux bornes projetées et tronquées ensemble : un enfant commençant avant la fenêtre parent ne conserve plus une largeur hors fenêtre. Raccord Hadéen/Archéen vérifié sans chevauchement (ancien dépassement 6,43 px). Infobulle unique avec nom et dates complets, priorité à la dernière interaction souris/clavier, relation ARIA, Échap, maintien au survol du contenu, suivi des cartes animées et nettoyage au cache. Agrandissement des petites périodes conservé. 835 tests/64 fichiers dont 24 nouveaux, 4 tests de configuration, types/inutilisés et builds front/API validés hors réseau. Données chronologiques conservées, aucun changement distant.

## [2026-10-29] — UI03 : périodes feuilles et navigation

Mention Sans sous-période supprimée. FLIP extrait dans usePeriodFlip et réservé à une destination réellement atteinte ; timers/styles annulés sur retour, remplacement, désactivation et destruction. Niveau courant conservé pendant les chargements, retour maintenu depuis un niveau vide et focus transmis à la barre parent après une entrée clavier, sans voler un autre focus. 811 tests/62 fichiers, 4 tests de configuration, types stricts/inutilisés et builds front/API validés dans l’image de contrôle sans réseau. La passe native ciblée avait subi quatre expirations de démarrage de workers ; elle n’est pas comptée comme validation complète. Recette réelle hiérarchie, pages, précédent/suivant et cache réussie ; données inchangées, aucun push. Les contrôles TypeScript auparavant bloqués sont validés par la passe finale.

## [2026-10-29] — UI02 : superposition des infobulles d’événements

Priorité explicite du contexte de chaque EventCard : repos, sélection, focus interne, puis survol. L’infobulle survolée passe devant celle verrouillée indépendamment de leur ordre dans la page. Cas réel avec recouvrement et sélection conservée vérifié, ainsi que le focus clavier avec pointeur hors des marqueurs. Aucun changement métier ou de données.

## [2026-10-29] — UI01 : alignement des événements de la timeline

Marqueurs EventCard ancrés explicitement au centre de l’axe, hors du flux typographique du bouton. Déplacement observé corrigé de 5 px ; douze marqueurs contrôlés dans le navigateur, y compris un sélectionné avec sa fiche. Les centres coïncident avec l’axe (tolérance 0,001 px). Aucun changement métier ou de données.

## [2026-10-29] — Lot 28 : continuation Dashboard Auth

Après reconnexion de l’utilisateur, protection des mots de passe compromis activée et enregistrée ; page Attack Protection ENABLED et advisor sécurité sans alerte. Après confirmation explicite, Site URL corrigé vers http://127.0.0.1:5173 et unique redirection exacte http://127.0.0.1:5173/login enregistrée. Les valeurs persistent après rechargement. Front 200, API connectée et accès activés, /api/account anonyme 401. Aucun changement d’abonnement, de compte, de rôle, de données ou de schéma ; aucun e-mail de test. Domaine de production et reprise du projet réel encore à définir.

## [2026-10-29] — Lot 28 : installation et validation finale locale

Baseline vide compatible avec les dix tables et 21 policies, garde de replay, séquences minimales et routine historique exclue. Vérification vierge/CI commune sans .env du poste : 798 tests/60 fichiers, 4 configuration et 85 PostgreSQL 17 avec restauration de données fictives ; builds/audits réussis. Image API de production démarrée avec TLS/Auth sur la baseline, refus d’Auth absent/false et CA non reconnue, arrêt propre vérifiés. Revue locale de configuration expurgée, garde de production et guide de mise en service. Aucun changement Supabase distant ni publication. Dashboard déconnecté : URL Auth/protection des mots de passe et futur domaine restent à finaliser avant exposition. Aucun autre lot de nettoyage planifié ; phase UI/UX distincte à cadrer avec l’utilisateur.

## [2026-10-29] — Lot 27 : maintenance et sélection globale

40 fichiers historiques archivés en .txt avec intégrité SHA-256 ; anciens runners et dépendances Prisma/ts-node/Axios serveur retirés. Runtime Docker à plusieurs étapes, non privilégié et lecture seule, construit et démarré avec PostgreSQL TLS jetable ; refus de CA et arrêt gracieux vérifiés. GlobalSearch relié aux vues protégées via routes nommées, chemin/focus des périodes et détail canonique des événements, brouillons Wikidata explicites, reprise et annulation testées. 786 tests/59 fichiers, 48 intégrations PostgreSQL locales et builds réussis ; audits JS sans avis. Un lot reste estimé (28 : démarrage neuf/CI/Auth/documentation). Aucune mutation Supabase ni publication. Voir SUIVI-AUDIT et database/README pour les limites de la baseline et des sauvegardes.

## [2026-10-29] — Lot 26 : clavier et mise en page

Suggestions Wikidata maintenues dans le dialogue et exposées dans AX ; navigation de suggestions mutualisée avec GlobalSearch. Relations de contrôles, focus visible/restauré, actions sans survol, liens natifs/évitement, tableau Events triable et redimensionnable au clavier. Navigation/barres/formulaires adaptés aux écrans étroits, dont les filtres d’une story sélectionnée. 768 tests/57 fichiers, builds et contrôles navigateur à 320/768/1024/1280 px ; deux lots estimés restants. Ce contrôle ciblé ne constitue pas une certification WCAG.

## [2026-10-29] — Lot 25 : transport public Wikidata et reprises

Transport SPARQL/MediaWiki commun, caches mémoire publics limités et expirables, annulation indépendante des lecteurs. Lecture/reprises bornées dans shared/readOperation, sans retry d’écriture. Import période sans N+1, compteur inconnu explicite et reprise des compléments ; lecteur historique borné mais script Prisma non exécuté. README, CLAUDE, ARCHITECTURE, CONVENTIONS, OPERATIONS et SUIVI-AUDIT alignés ; 749 tests/56 fichiers, builds front/API et vérifications locales réussis. Trois lots restent estimés.

## [2026-04-17] — Doc agent : `/timeline`, type `StoryPeriodNavSnapshot`, tests ; fusion changelog navigation Home (2026-04-16)

Contexte : clôture de session — aligner **ROUTES**, **DATA-MODELS**, **OPERATIONS** (et rappel dans **ARCHITECTURE**) avec la navigation timeline déjà décrite en partie dans **COMPONENTS** / **ARCHITECTURE** ; éviter trois entrées **2026-04-16** redondantes sur le même sujet.

Décision : enrichissement des fichiers ci-dessus ; **CHANGELOG** — les entrées « Breadcrumb timeline », « Revue session : … », « Extraction StoryBreadcrumb » du **2026-04-16** sont remplacées par **une** entrée consolidée (faits regroupés, sans perte d’information utile).

Fichiers touchés : `.agent/ROUTES.md`, `.agent/DATA-MODELS.md`, `.agent/OPERATIONS.md`, `.agent/ARCHITECTURE.md`, `.agent/CHANGELOG-AGENT.md`.

## [2026-04-16] — PM2 : `yarn daemon:up` (serveurs survivants à l’agent)

Contexte : l’utilisateur veut demander le lancement des serveurs et **ne plus s’en préoccuper** ; les shells d’agent coupent `yarn dev:all` en arrière-plan.

Décision : **`pm2`** en `devDependencies`, `ecosystem.config.cjs` (`chronologie-api`, `chronologie-ui`), scripts **`daemon:up`** / **`daemon:down`** / **`daemon:restart`** / **`daemon:logs`** / **`daemon:status`** ; `scripts/daemon-up.sh` libère **3000** et **5173** avant PM2. Mise à jour **README**, **OPERATIONS**, **CLAUDE** (règle agent : privilégier `yarn daemon:up`).

## [2026-04-16] — Dev : `scripts/dev-all.sh`, proxy API en `127.0.0.1`

Contexte : `yarn dev:all` lancé depuis l’agent en arrière-plan se voyait envoyer **SIGTERM** (~1–2 min ou fin de tâche) ; l’utilisateur croyait que « ça ne fonctionne pas » alors que les serveurs avaient été arrêtés. Ports parfois encore occupés (`EADDRINUSE`).

Décision : script racine **`scripts/dev-all.sh`** + script Yarn **`dev:all:fresh`** ; proxy Vite **`/api`** → **`http://127.0.0.1:3000`** ; **OPERATIONS** / **README** / **CLAUDE** — avertissement explicite sur les tâches d’agent vs terminal persistant.

## [2026-04-16] — `yarn test` : passe unique (`vitest run`)

Contexte : l’agent lançait souvent `yarn test` après chaque modification ; le script pointait sur **`vitest`** (watch par défaut) — processus long, surveillance fichiers et charge en parallèle de Vite / API, friction voire impression que « les serveurs sautent ».

Décision : **`yarn test`** → **`vitest run`** ; **`yarn test:watch`** → ancien comportement interactif. `OPERATIONS.md` et `README.md` mis à jour.

## [2026-04-16] — Vite dev : `host` explicite

Contexte : en dev, l’UI pouvait être inaccessible selon l’URL (`127.0.0.1` vs `localhost`) ; une page d’erreur Chrome (`chrome-error://…`) provoquait ensuite des messages « Unsafe attempt to load URL » si le serveur Vite ne tournait pas.

Décision : `server.host: '0.0.0.0'`, `port: 5173`, `strictPort: true` dans `vite.config.ts`.

## [2026-04-16] — API dev : arrêt gracieux (tsx watch)

Contexte : `tsx watch` affichait « Previous process hasn't exited yet. Force killing... » puis le processus API pouvait se terminer brutalement (pool `pg` et serveur HTTP encore ouverts).

Décision : sur `SIGINT` / `SIGTERM`, fermer d’abord le serveur HTTP (`httpServer.close()`), puis `closePool()` dans `server/src/index.ts`.

## [2026-04-16] — Navigation timeline Home : `StoryBreadcrumb`, snapshots, `homeStoryPeriodNav`, tests

Contexte : fil d’Ariane des stories en markup inline dans `HomeView` ; retour breadcrumb remettant la navigation périodes à la racine ; premier chargement sans le même comportement **`expandSingleRoot`** qu’après `selectStory` ; `Promise.all` à trois branches peu lisible ; logique de navigation à isoler et à tester.

Décision :

- **UI** : composant **`StoryBreadcrumb.vue`** (`items`, emit **`navigate(index)`**) ; **`HomeView`** l’utilise à la place du markup inline ; logique dans **`useHomeNavigation`**.
- **Snapshots** : à la descente **`selectStory`**, mémoriser pour la story quittée **`parentStackIds`** + **`currentPeriodId`** ; au retour breadcrumb (**`navigateToBreadcrumb`**), recharger la story cible et réappliquer le snapshot sur les périodes chargées (repli racine si IDs absents) via **`resolvePeriodNavFromSnapshot`** dans **`src/lib/homeStoryPeriodNav.ts`** (**`storyChildrenOf`**, type **`StoryPeriodNavSnapshot`**).
- **Ouverture racine unique** : après **`selectStory`**, une seule racine avec enfants ouvre niveau racine + enfants (**`expandSingleRoot`**) ; au premier affichage, **`HomeView`** appelle **`loadInitialData(undefined, true)`** au **`onMounted`** pour le même comportement.
- **Retour arrière** : **`goBack`** à la racine des périodes avec **`storyStack`** non vide → story parente ; clic barre parent (racine unique enfant, même état qu’après **`expandSingleRoot`**) → **`navigateToBreadcrumb`** avec restauration plutôt que seulement vider **`currentPeriod`**.
- **Chargement** : **`loadInitialData`** — **`Promise.all`** sur périodes story, événements story et **`ensureStoriesLoaded`** ; troisième promesse nommée explicitement et consommée (ex. **`void`** sur **`_storiesReady`**) pour clarté.
- **Tests** : **`src/lib/__tests__/homeStoryPeriodNav.test.ts`**, **`src/composables/__tests__/useHomeNavigation.test.ts`**.

Fichiers touchés (code, indicatif) : `src/components/StoryBreadcrumb.vue`, `src/views/HomeView.vue`, `src/composables/useHomeNavigation.ts`, `src/lib/homeStoryPeriodNav.ts`, fichiers de test listés.

## [2026-04-15] — Design system : unification icônes Iconify, nomenclature size, nettoyage Button

Contexte : audit design system — incohérences de bibliothèques d'icônes (`lucide-vue-next` + FontAwesome + Iconify coexistaient), prop `compact` toujours présente sur certains composants, prop `icon` string (FontAwesome) sur Button, labels boutons retournant à la ligne.

Décision :

**Icônes — unification sur Iconify :**
- Suppression de `lucide-vue-next` de tous les fichiers (`ChevronDown/Left/Right` → `mdi:chevron-*`, `Plus` → `mdi:plus`, `X` → `mdi:close`).
- Suppression des `<i class="fas ...">` restants → `<Icon icon="mdi:..." />` dans `PeriodGrid`, `DatabaseView`, `EditModal`.
- Prop `icon` (string FontAwesome) retirée de `Button.vue` ; seul le slot `#icon` subsiste.
- Règle : `aria-hidden="true"` sur toutes les icônes décoratives ; taille via props `width`/`height`.

**Button :**
- `white-space: nowrap` sur `.base-button__text` — label jamais tronqué ni retourné à la ligne.
- Prop `icon?: string` et classe `.base-button__icon` supprimées.

**Nomenclature `size` :**
- Prop `compact` remplacée par `size: 'md' | 'sm'` sur `Input` et `Select` (mapping : `compact` = `sm`).
- `SearchInput` : `size: 'sm' | 'xs'` (`sm` = 36px défaut, `xs` = 32px).
- `FilterBar` : tous les champs explicitement à `size="sm"` (SearchInput, Select, Button).

**DesignSystemView :**
- Sections `Input`, `Select`, `SearchInput` restructurées : tailles démontrées côte à côte (md vs sm), états séparés, rang d'alignement inter-composants avec Button.
- Page `Iconify` ajoutée dans la rubrique **Tokens** : usage, catalogue des icônes utilisées groupé par catégorie (Navigation, Actions, États, UI, Thème), bloc de code.
- Suppression des démos `WikidataImportButton` et `ThemeToggle` en tant que composants autonomes ; `ThemeToggle` n'est plus listé dans la nav.

**Correctif transverse :**
- Remplacement de tous les guillemets typographiques (`'` `'` `"` `"`) par des guillemets droits dans l'ensemble des fichiers `.vue`, `.ts`, `.css` de `src/` (25 fichiers). Les apostrophes françaises dans les chaînes single-quoted ont été migrées vers des double-quotes ou des backticks.

Fichiers touchés : `src/components/base/Button.vue`, `src/components/base/Input.vue`, `src/components/base/Select.vue`, `src/components/base/SelectShell.vue`, `src/components/base/SearchInput.vue`, `src/components/base/select-field-shared.css`, `src/components/FilterBar.vue` (ex-`PeriodsSubHeader`), `src/components/PeriodTreeBranch.vue`, `src/views/DatabaseView/EditModal.vue`, `src/views/DatabaseView/DatabaseView.vue`, `src/views/DatabaseView/StoryDetailPanel.vue`, `src/views/HomeView/PeriodGrid.vue`, `src/views/DesignSystemView/DesignSystemView.vue`, `src/composables/useGraphModals.ts`, `.agent/COMPONENTS.md`, `.agent/CONVENTIONS.md`, `.agent/CHANGELOG-AGENT.md`.

## [2026-04-14] — Design system : PeriodsSubHeader, StoryTimeline, FinderItem story, toasts

Contexte : la page `/design-system` ne reflétait pas les évolutions récentes (`FinderItem`, sous-header périodes/événements, frise story).

Décision : `DesignSystemView.vue` — nouvelles entrées de navigation + démos (`PeriodsSubHeader` modes, `StoryTimeline`, `ThemeToggle`, `WikidataImportButton`, `ChevronIcon`, toasts via `window.showToast`) ; section Finder enrichie (props + slot `#actions`, `ModalShell` slot `header-right`) ; `.agent/COMPONENTS.md` et `.agent/ROUTES.md` mis à jour.

## [2026-04-14] — Remise au vert TypeScript + alignement suggestions

Contexte : audit code — `vue-tsc` en échec (`PeriodsSubHeader` / `StoryDetailPanel` / `StoryPeriodInput` / Home), types suggestions obsolètes (`number`), interfaces non utilisées.

Décision : `suggestions?` sur `PeriodsSubHeader` (ex. onglet événements dans `StoryDetailPanel`) ; `story` typé `Story | null` (prop optionnelle) dans `StoryDetailPanel` ; `StoryPeriodInput.categories?` ; `StorySuggestion` en ids `string` + mapping `StoryApiService.getSuggestions` ; `EventCard` / `PeriodGrid` / `useHomeNavigation.selectStory` alignés TS ; `EventCard` émet `click` avec `MouseEvent` ; suppression `StoryElement` / `StoryAnnotation` ; `StoryDetailPanel` — onglets périodes / événements sur le même `FinderItem`, retrait CSS mort `.story-detail-panel__finder-row*`, liste événements `.events-finder-list` (fond `var(--color-surface)`, sans padding vertical parasite) ; `FinderItem` — `border-bottom` sur le composant, suppression du doublon côté `finder-column-layout.css` sur les enfants, retrait refs inutilisées et classe `.droppable` ; `.agent/DATA-MODELS.md`, `COMPONENTS.md`, `ARCHITECTURE.md` harmonisés en fin de session.

Fichiers touchés (code, non exhaustif) : `src/views/GraphView/FinderItem.vue`, `src/views/DatabaseView/StoryDetailPanel.vue`, `src/styles/finder-column-layout.css`, `src/components/PeriodsSubHeader.vue`, `src/types/database.ts`, `src/types/periodTree.ts`, `src/services/StoryApiService.ts`, `src/views/HomeView.vue`, `src/views/HomeView/EventCard.vue`, `src/views/HomeView/PeriodGrid.vue`, `src/composables/useHomeNavigation.ts`, fichiers `.agent/` listés dans la décision.

## [2026-04-12] — Finder story : ancrage en en-tête + stories enfants en tête de colonne

Contexte : le bouton « Ancrer une story » était en bas de colonne ; les stories enfants ancrées s’affichaient sous les périodes.

Décision : `StoryDetailPanel` — `finder-column-header` : titre + bouton `Ancrer une story` (toutes les colonnes, ancre `null` en colonne racine) ; liste : blocs stories enfants puis séparateur puis périodes ; règle `:has` pour bordure d’en-tête si sélection ; `.agent/COMPONENTS.md` mis à jour.

## [2026-04-12] — Story : périodes en mode colonnes (finder)

Contexte : la vue Stories affichait les périodes d’une story uniquement en arbre ; besoin d’un parcours type finder `/periods`.

Décision : `StoryDetailPanel` — `Select` (Arbre / Colonnes) à gauche du bouton « Ajouter » sur l’onglet Périodes ; colonnes `FinderItem` sans drag ni bouton Edit, retrait période sur chaque ligne ; helpers `src/lib/storyPeriodFinderColumns.ts` ; `FinderItem` expose `draggable` et `hideRowAction` pour ce cas.

Alternative écartée : réutiliser `useGraphView` tel quel — couplé au store global des périodes, pas au sous-graphe `story.periods`.

## [2026-04-12] — Switch : variant `sm` + `labelFirst`

Contexte : en-têtes de colonnes finder story, besoin d’un interrupteur plus compact et libellé à gauche.

Décision : `Switch.vue` — props `variant="sm"` (piste + curseur réduits, libellé `font-size-xs`) et `labelFirst` (label avant le bouton, `for` / `id` via `useId()`). Démo dans `DesignSystemView` ; colonnes story : `variant="sm"` + `label-first`.

## [2026-04-12] — Story détail : switch « Hors story » par colonne finder

Contexte : afficher dans chaque colonne les périodes du catalogue non liées à la story.

Décision : `Switch` dans l’en-tête de colonne ; fusion racines / enfants globaux (`getGlobalRootPeriodsNotInStory`, `getGlobalChildrenNotInStory`) ; chemin finder pour sélection hors story via `buildGlobalFinderPathToPeriod` ; bouton `+` sur les lignes externes.

## [2026-04-12] — Stories liées (onglet + API + table)

Contexte : lier des stories entre elles depuis le détail d’une story.

Décision : table `public.story_related_stories` (migration `database/migrations/20260412_story_related_stories.sql`) ; `GET /stories/:id` enrichi avec `relatedStories` ; `POST` / `DELETE` …`/related/:relatedStoryId` ; onglet « Stories liées » dans `StoryDetailPanel` + `StoryRelatedPickerModal` ; `StoryApiService` / `useDatabaseView`.

## [2026-04-12] — Stories liées : migration INTEGER + client

Contexte : `POST …/related/…` renvoyait 500 tant que la table n’existait pas ou que les colonnes étaient en UUID alors que `public.stories.id` est encore en INTEGER (SERIAL) ; la validation modale ne reflétait pas le lien.

Décision : migration `20260412_story_related_stories.sql` — `story_id` / `related_story_id` en `INTEGER` alignés sur `public.stories` courant ; `useDatabaseView.addRelatedStoriesToStory` — ids normalisés en chaîne, repli optimiste si `getStory` échoue après POST ; `StoryDetailPanel` — émission `add-related-stories` avant fermeture de la modale.

Alternative écartée : ne garder que UUID — incompatible avec les bases encore en SERIAL sans conversion préalable.

## [2026-04-12] — Cleanup audit (story finder + lib)

Contexte : suite code-audit — code mort, exports inutiles, watch `deep`, UX désactivation « Hors story », typage panneau.

Décision : suppression de `buildStoryFinderColumns` ; `getStoryPeriodParentId` non exportée ; `buildGlobalFinderPathToPeriod` conservée (tests) ; `StoryDetailPanel` — props `Story`, watch sélection sur empreinte d’ids (sans `deep`), à l’off du switch « Hors story » effacement sélection + chemin si période hors story.

## [2026-04-12] — Story finder : chemin hors story sans chaîne globale

Contexte : sélectionner une sous-période hors story réécrivait `finderSelectedPath` avec `buildGlobalFinderPathToPeriod`, d’où toute la chaîne depuis la racine catalogue.

Décision : le `watch` sur la sélection ne met à jour le chemin que si la période est **dans** la story ; hors story, le chemin reste celui posé par `onFinderPeriodSelect`.

## [2026-04-12] — Story détail : switch « Hors story » global (barre d’onglets)

Contexte : une bascule par colonne était lourde ; même visibilité pour tout le finder.

Décision : un seul `Switch` dans `story-detail-panel__tabs-bar` (onglet Périodes) ; ref `showExternalInFinder` ; reset au changement de `story.id` ; `watch` sur le chemin finder pour `ensureChildrenLoaded` du dernier nœud quand la bascule est active.

## [2026-04-12] — Story détail : suppression de l’arborescence périodes

Contexte : demande de ne garder que le parcours colonnes dans le panneau détail.

Décision : retrait de `PeriodTreeView` et du sélecteur Arbre / Colonnes ; périodes toujours en finder. `PeriodTreeView` reste dans le dépôt mais n’est plus référencé par une vue (voir `.agent/COMPONENTS.md`).

## [2026-04-12] — Story : suppression cascade des périodes liées

Contexte : retirer une période d’une story (arbre ou colonnes) ne supprimait qu’une ligne `story_periods` ; les enfants restaient associés.

Décision : `collectStoryPeriodSubtreeIds` dans `storyPeriodFinderColumns.ts` ; `removePeriodFromStory` (`useDatabaseView`) supprime en API chaque id du sous-arbre puis met à jour la liste locale.

## [2026-04-11] — Initialisation de la documentation agent

Génération initiale basée sur analyse du code source.

Aucune décision architecturale antérieure documentée.


## [2026-10-29] — Navigation, lot 8

Documentation alignée avec RouterView, imports différés des vues et KeepAlive limité à HomeView. Chemins historiques conservés, onglets dérivés des noms de routes, états chargement/erreur/reprise et page introuvable décrits. Règles obsolètes de rendu manuel retirées de CLAUDE, architecture, conventions et inventaire du Header.


## [2026-10-29] — Consolidation dans le répertoire projet

Dépôt Desktop déclaré référence unique. Lots 1 à 8 intégrés en conservant les stories imbriquées, les filtres/recherches, le choix du parent, le nettoyage des copies et composants isolés, Iconify et le démarrage PM2. Routes `/periods` et `/graph` compatibles. Configuration Supabase locale transférée et serveur démarré depuis Desktop. Le journal de consolidation et ses vérifications figurent dans SUIVI-AUDIT.md.


## [2026-10-29] — Lot 9 et retrait de l’ancienne copie

Ancienne copie mise dans la Corbeille après comparaison avec la sauvegarde locale. Recherche globale, autocomplétion Wikidata et préremplissage de modale : erreurs et reprise explicites, annulation/gardes, délais nettoyés, saisies préservées et logique extraite dans les composables dédiés. A11/A12 restent partiels pour les autres consommateurs.


## 29 octobre 2026 — activation Auth (lot 19)

Migration Supabase story_access 20261029090427 appliquée après confirmation explicite. API AUTH_ENABLED=true, compte confirmé/admin, 11 stories historiques rattachées avec is_public et catégories strictement conservés. Opérations de rôle et de propriété séparées, retours de confirmation et invalidation des caches après changement de rôle corrigés. 468 tests et 19 intégrations SQL réussis. Les points PostGIS et URL au déploiement restent documentés ; aucun push.

## 29 octobre 2026 — durcissement Supabase (lot 20)

Fonctions applicatives à search_path fixe et EXECUTE retiré aux rôles API ; triggers conservés. PostGIS 3.3.7 reconstruit hors de public, dans extensions, avec transaction, RESTRICT et conservation exacte du référentiel. Dix tables applicatives et 8 500 références comparées avant/après sans différence. Alertes SQL de sécurité résolues ; protection Auth des mots de passe compromis et URL avant déploiement reportées à la revue finale. Quatre tests PostgreSQL de permissions/triggers ajoutés, 468 tests Vitest réussis ; huit lots restants estimés dans SUIVI-AUDIT.md. Aucun push.

## 29 octobre 2026 — écritures atomiques (lot 21)

Sauvegarde période/parent/catégories en une transaction, catégories conservées dès création période/story, sélections périodes/événements et stories enfants groupées. Détachement et ancres atomiques, cycles de stories et modifications croisées refusés sous verrou. Retrait des relances réseau automatiques de sauvegarde et des méthodes d’associations individuelles client devenues inutiles ; réponse perdue signalée comme non confirmée. 485 tests Vitest et 19 intégrations de vrais handlers sur PostgreSQL local jetable réussis, builds et contrôle strict inutilisés réussis. API locale rechargée, lectures et refus anonymes vérifiés. Aucun changement de schéma Supabase ni push ; sept lots restants estimés.

## 29 octobre 2026 — contrats et validation (lot 22)

Formulaires et soumissions typés, validateur de brouillon unique avec erreurs accessibles, auteur requis et fin vide cohérente. Parsers HTTP unknown avant SQL, textes/booléens/IDs int4 et historiques contrôlés ; filtrage catégories varchar corrigé sur les deux recherches. Localisation non persistée explicitement informative, sans saisie fictive. 582 tests Vitest et 23 intégrations PostgreSQL locales réussis, builds et contrôle strict inutilisés réussis. API locale rechargée, lectures/400/401 vérifiés ; aucune écriture de test ni migration Supabase, aucun push. Six lots restants estimés, architecture serveur ensuite.


## 2026-10-29 — Lot 23, séparation serveur

Routes réduites de 1 438 à 168 lignes, services transactionnels séparés des repositories SQL à client explicite, projections et agrégations typées. Règle de hiérarchie pure commune aux périodes/stories, composition des détails mutualisée, helper de maintenance Wikidata sorti du routeur. 607 tests Vitest, 44 intégrations PostgreSQL locales, 4 contrôles de connexion, builds et vérification des inutilisés réussis. Contrats HTTP et contexte Auth/RLS conservés ; lectures réelles et refus 400/401 vérifiés après rechargement local. Aucune migration ni écriture de test Supabase, aucun push ; cinq lots restants estimés.


## 2026-10-29 — Lot 24, domaine temporel partagé

Parser, comparaisons et bornes communs à l’API/au navigateur ; DateService limité à l’affichage. Anciens moteurs/composable/types retirés et formats utiles migrés vers la suite commune. Dates inconnues distinctes du présent, secondes/fuseaux/précision et calendriers contrôlés, dates futures ordonnées, intervalles géologiques invalides refusés avant SQL. Éléments non positionnables accessibles hors axe, aperçus calculés sans réécrire les textes. Bornes importées conservées, convention BP et limites Wikibase documentées. 682 tests Vitest, 48 intégrations PostgreSQL locales, builds et contrôle des inutilisés réussis ; 96 cas temporels vérifiés sous deux fuseaux supplémentaires. Contrôle visuel d’un intervalle inversé puis corrigé, brouillon annulé. Aucun changement de données/droits Supabase ni push ; quatre lots restants estimés.

## 2026-11-02 — Mesure d’audience PostHog

Projet PostHog « Universal Timeline » (organisation dédiée, région EU). Traceur `src/lib/analytics.ts` enregistré par `installAnalytics` dans `main.ts` via `registerTracker` : import dynamique de `posthog-js` après consentement, retrait = opt-out, reset et purge des cookies/stockages `ph_<clé>`. Sessions non enregistrées, pas d’identify. Politique cookies, confidentialité et registre RGPD complétés ; `CONSENT_VERSION` passé à 2. Variables `VITE_POSTHOG_*` documentées.

## 2026-11-02 — Contact et e-mails

Adresse unique `CONTACT_EMAIL` (florian@universaltimeline.net) dans les mentions légales, la confidentialité (droits, délai d’un mois) et les conditions (signalement). Page publique `/contact` (`ContactView`) : sujets pré-remplis par `mailto:`, copie de l’adresse, menu `legalMenu` partagé avec les pages légales ; liens depuis les pieds de page des landings et le profil. Six modèles d’e-mails Supabase Auth en français dans `Documentation/emails/`, à coller après configuration du SMTP Hostinger (non fait par l’agent).

## 2026-11-02 — Mot de passe oublié, changement d’e-mail, projet personnel

Page publique `/reset-password` (demande neutre, puis `verifyOtp` sur `token_hash` retiré de l’URL et nouveau mot de passe), lien « Mot de passe oublié ? » sur la connexion. Carte « Adresse e-mail » du profil : `updateUser({ email })`, adresse en attente (`new_email`) affichée, `code` de retour retiré de l’URL. Erreurs Auth mutualisées dans `src/lib/authErrors.ts`. PostHog : `before_send` masque `token_hash`, `code` et jetons dans les URL capturées. Textes légaux adaptés à un projet personnel non commercial (pas de SIREN, directeur = éditeur, responsabilité, droit français) ; nom de l’éditeur ou anonymat LCEN restant à choisir. Modèle de réinitialisation basé sur `token_hash`.

## 2026-11-02 — Vues catalogue admin, étape de confirmation d’inscription

`/periods` et `/events` portent `meta.admin` ; `navigationTabsFor(isAdmin)` masque Périodes, Événements et Design system aux comptes normaux. Après inscription, le formulaire laisse place à « Vérifiez votre boîte mail » (adresse, étapes, renvoi `auth.resend`, correction de l’adresse, passage à la connexion), titre focalisé. Retour du lien sur `/login?confirmed=1` avec message ; connexion refusée `email_not_confirmed` → renvoi du lien. Les `code` PKCE ne quittent l’URL qu’après `settleUrlSession`. Rôle admin et 27 frises transférés au compte du projet (voir server/AUTHENTICATION.md).

## 2026-11-02 — Espace d’administration

Migration `20261102204456_admin_console` (aussi dans la baseline) : schéma non exposé `admin_private`, fonctions SECURITY DEFINER `dashboard`, `list_users`, `user_detail`, `set_admin`, `set_suspended`, `delete_user` (claim admin + rôle stocké, verrou de la cible, règles soi-même/admin, journal `audit_log`). API `/api/admin/*` (`adminService` traduit les SQLSTATE `UTA0x`, `P0002`, `42501`), middleware refusant un compte suspendu. Vue `/admin` : tableau de bord (utilisateurs, frises, catalogue, relations, top frises, inscriptions, actions), liste filtrable des utilisateurs, fiche avec frises, historique et actions (lien de réinitialisation, rôle, suspension, suppression confirmées). Double test Postgres `admin.postgres.mjs`, test de suspension du middleware, doublure Auth enrichie (`created_at`, `last_sign_in_at`, `banned_until`, `is_anonymous`, `auth.sessions`).
