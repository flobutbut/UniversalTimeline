> Généré le : 2026-04-11 — Source : analyse du code source

# Architecture

## Vue d’ensemble — rôle des dossiers principaux

| Dossier / fichier | Rôle observé |
|-------------------|--------------|
| `src/App.vue` | Shell applicatif : Header, RouterView, KeepAlive limité à HomeView, état de navigation, toasts et confirmation globaux. |
| `src/main.ts` | Bootstrap Vue + Pinia + routeur + `style.css`. |
| `src/router/` | `index.ts` crée le routeur ; `routes.ts` définit les chemins et imports différés des vues ; `navigation.ts` définit les onglets et leur type. |
| `src/views/` | Vues par domaine : `HomeView` (timeline), `DatabaseView` (stories), `GraphView/Periods` (finder colonnes), `EventsView`, `DesignSystemView`. Sous-dossiers par vue (ex. `HomeView/PeriodGrid.vue`). |
| `src/components/` | Composants transverses (header, recherche, arbre de périodes, timeline story, design system de base sous `base/`). |
| `src/composables/` | Logique réutilisable (navigation home, graphe, modales, thème, Wikidata, etc.). |
| `src/services/` | Accès HTTP (`ApiClient`), services métier par domaine (périodes, événements, stories, Wikidata, dates, recherche). |
| `src/stores/` | Pinia : au moins `useDataStore` pour listes périodes / événements / stories et chargement paresseux. |
| `src/lib/` | Fonctions pures / helpers (formatage, graphe finder, modales, etc.) ; constantes Wikidata partagées (`wikidataMediaWikiConstants.ts` — URL API MediaWiki utilisée par la recherche libellés et certaines requêtes `WikidataQueryService`) ; navigation périodes par story sur la timeline (`homeStoryPeriodNav.ts` — `storyChildrenOf`, **`resolvePeriodNavFromSnapshot`**, type **`StoryPeriodNavSnapshot`**, utilisé par **`useHomeNavigation`** / `HomeView`). |
| `src/types/` | Types TypeScript (`database.ts`, `graph.ts`, `periodTree.ts`, `global.d.ts`, etc.). |
| `src/utils/` | Utilitaires DOM ; les bornes temporelles passent directement par le domaine partagé. |
| `src/validators/` | Validateurs de formulaires. |
| `src/styles/` | Feuilles partagées (variables, layout finder…) ; `finder-column-layout.css` — séparation visuelle des lignes finder déléguée au composant `FinderItem` (`border-bottom` sur la ligne), sans règle dupliquée sur les enfants de colonne. |
| `server/src/api/` | Routes et validation HTTP, traduction des erreurs, connexion PostgreSQL et gestion transactionnelle existante. |
| `server/src/services/` | Règles métier et transactions ; composition des réponses typées. |
| `server/src/repositories/` | SQL avec client explicite et types des lignes/projections ; aucun pool implicite. |
| `server/src/domain/` | Règles pures de hiérarchie et agrégation des stories, sans Express ni connexion. |
| `server/src/shared/` | Moteur temporel pur (@temporal) et exécuteur de lectures bornées readOperation, également utilisables par le frontend ; sans import applicatif/SQL. |
| `database/` | Trois migrations Supabase appliquées, opérations explicites de propriété et documentation ; aucun runner automatique. |
| `database/archive/` | Anciens scripts, dumps et modèle Prisma en .txt, avec manifeste SHA-256 ; hors compilation/image et hors migrations actives. |

## Patterns architecturaux observés

- **Vues par dossier** (`views/<Domaine>/`) plutôt qu’une arborescence « features » isolées avec co-location stricte.
- **Couche service singleton** côté frontend pour l’API et Wikidata.
- **État serveur partiellement centralisé** dans Pinia (`useDataStore`) pour les listes ; le reste de l’état semble local aux composables / composants (non inventorié exhaustivement).
- **Stories imbriquées** : fil d’Ariane continu (chaque frise quittée garde son chemin de périodes, repère de frise fusionné avec sa racine homonyme ou sa période d’ancrage, lignée réelle à l’ouverture par lien) dans useHomeNavigation et homeStoryPeriodNav ; retours aux périodes déjà chargées sans dupliquer la pile, annulation des lectures obsolètes et restauration du focus par StoryBreadcrumb ; enfants limités au périmètre de la story, événements chargés et mis en cache par story. Relations de stories/ancres conservées dans les services et le détail Stories. Les mises à jour utilisent le cache partagé et les cibles capturées du lot 6.
- **Design system** : composants primitifs sous `src/components/base/`, documentés dans la vue `DesignSystemView`. `Select` est autonome et reçoit des options ; la sélection métier est portée par `PeriodSelect` → `usePeriodSelect` → `useDataStore`. Les deux sélecteurs partagent `SelectShell` pour la présentation et la fermeture.
- **Navigation par RouterView** : chaque vue est chargée à sa première visite. Seule la timeline est conservée en mémoire pendant la session, par son nom HomeView ; les autres vues sont démontées en quittant leur route. `useAppNavigation` porte les états de chargement, erreur et reprise, et suit la route résolue pour sélectionner l’onglet. Une entrée directe sur une autre page ne monte pas la timeline.

## Flux de données principal (observable)

1. **Lecture liste périodes racines :** `PeriodApiService.getInstance().getListPeriods()` → `GET /api/periods` (via proxy Vite en dev) → mapping `mapToPeriod` → fusion dans `useDataStore.ensureRootsLoaded()`.
2. **Enfants d’une période :** `ensureChildrenLoaded(parentId)` → `GET /api/periods/:id/children`.
3. **Stories / événements listes :** `StoryApiService` / `EventApiService` + mises à jour du store.
4. **Recherche globale (header) :** `SearchApiService` → `GET /api/search?q=…` + requêtes Wikidata côté service (détails dans le fichier service).
5. **Recherche périodes ciblée :** même endpoint avec **`only=periods`** (sous-header `PeriodsSubHeader`, champ parent des modales période / `EditModal`) ; côté client, `searchLocal` avec option `onlyPeriods`.
6. **Wikidata — création période / événement (base de données) :** dans `EditModal`, champ `SearchInput` dans le slot **`header-right`** de `ModalShell` ; recherche / import selon le type d’entité (`importAndTransform`, `runWikidataLabelSearch` avec restriction concepts événement le cas échéant) — voir `.agent/COMPONENTS.md` et `.agent/DATA-MODELS.md`.
7. **Persistance parent après sauvegarde période :** `useDatabaseSave` envoie le parent avec les métadonnées/catégories dans la même création ou édition. Le service backend les persiste dans une transaction. Le déplacement seul du finder utilise PATCH /periods/:id/parent avec la même règle de hiérarchie.
8. **Wikidata SPARQL (frontend) :** `WikidataQueryService` utilise en dev l’URL proxifiée `/api/wikidata/sparql` si aucune URL personnalisée ; logs de debug encapsulés (`wdLog`, dev uniquement).

## Dépendances externes notables

- **PostgreSQL** : SQL via `pg` dans `server/src/repositories/`, client fourni par les services. La connexion reste scellée au principal Auth/RLS par `api/database.ts` ; aucun pool accessible aux handlers.
- **Wikidata** : SPARQL (`query.wikidata.org`) — proxy Vite en dev pour `/api/wikidata` ; User-Agent défini dans `vite.config.ts` pour ce proxy.
- **Polices** : Google Fonts (Inter, Lora) référencées dans `index.html`.
- **Maintenance** : aucun Prisma actif. Le modèle Event et son updater historiques, incompatibles avec Supabase, sont archivés en texte avec les anciens runners SQL/Docker. Voir database/README.md avant toute opération.


## Recherches et imports — lot 9

`useDebouncedSearch` porte les lectures de recherche annulables, leur délai, les états erreur/vide/chargement et la reprise. GlobalSearch garde deux sources indépendantes (base et Wikidata), avec déduplication réactive. `useWikidataForm` gère le contexte et l’application d’un préremplissage ; EditModal présente ces états et le panneau. `useWikidataImport` effectue lecture/transformation et distingue erreur principale et enrichissements facultatifs indisponibles. Depuis le lot 25, recherches/imports propagent leur signal au transport public partagé ; un consommateur fermé n’applique pas de résultat ancien et libère sa lecture.

## Frontière serveur — lot 23

Le routeur reste plat pour conserver l’ordre des routes statiques et les contrats existants. `endpoint` traduit les erreurs sûres ; les services n’importent pas Express. `catalogueService` et `storyService` possèdent les transactions ; les opérations de hiérarchie/associations reçoivent le même client. Les repositories ne décident pas d’un propriétaire et ne relisent pas une identité globale. Les sélections et verrous s’exécutent sous le contexte SQL de la requête.

`domain/hierarchy.ts` mutualise la vérification finie des ascendants ; les erreurs/messages restent propres aux périodes et stories. `services/mappers.ts` regroupe les catégories et construit les variantes historiques de liste/détail. Le chargement des candidats temporels est séparé du calcul pur ; le calcul des bornes réutilise le domaine partagé du lot 24.

`server/test/architecture.test.ts` protège les dépendances entre couches. `readRoutes.test.ts` vérifie les contrats JSON ; `atomicWrites.postgres.mjs` exerce aussi les lectures sous les vraies policies, exclusivement sur PostgreSQL local jetable.

## Dates — lot 24

`server/src/shared/temporal.ts` est l’entrée commune du calcul, de la résolution des bornes numériques importées, du contrôle des intervalles et des agrégations. Son alias @temporal est aligné entre Vite, Vitest et tsconfig.app ; aucun module Node/Express n’entre dans le bundle navigateur. Le module est dans la racine source API pour préserver la compilation et le contexte Docker existants. `DateService` présente les dates ; les anciens moteurs/composable/types de conversion ont été retirés.

Les aperçus de formulaire sont calculés. Les filtres et frises n’assimilent plus une date inconnue à aujourd’hui ; les éléments sans coordonnée sont rendus hors de l’axe avec leurs actions. Les modèles d’API, propriétaires, catégories et données brutes restent conservés. Lire src/services/README-DateConversion.md pour les formats, la convention BP et les limites de provenance Wikibase.

## Transport Wikidata — lot 25

`wikidataTransport` centralise Axios/SPARQL et fetch/MediaWiki. Il valide la structure avant de mémoriser une réponse ; une panne, un JSON incomplet ou une erreur logique n’est pas un résultat vide. Les clés incluent endpoint/requête et tous les paramètres (langue, mode, limite, IDs). Les lots d’IDs sont triés pour partager les mêmes lectures. Les caches sont limités à 160 réponses SPARQL et 200 MediaWiki, avec 32 clés en cours au plus par cache ; copies indépendantes à chaque lecture et éviction des entrées les moins récemment utilisées. Durée : une minute pour les recherches, cinq pour les autres réponses. Aucune persistance ni donnée privée.

`readCache` compte les lecteurs : seule la disparition du dernier annule le chargement partagé. Une réponse tardive après annulation/purge ne remplit pas le cache. `shared/readOperation` borne chaque lecture, tentatives et attentes comprises : 15 s MediaWiki, 30 s SPARQL, au plus trois tentatives pour les erreurs transitoires, avec Retry-After respecté. Il est également utilisé par le lecteur Wikidata historique du script de maintenance, sans exécuter ce script ni réconcilier son schéma dans ce lot.

L’import période réutilise une requête de résumés des enfants, sans relire le détail de chaque enfant. À 400 résultats ou après échec du complément, le compteur exact reste inconnu (null). Le formulaire conserve les données principales, affiche les avertissements et propose une reprise qui contourne les réponses publiques mémorisées. Les classes d’événements restent bornées à 520 nœuds ; une classification incomplète produit une erreur explicite. Les guards de brouillon complètent l’annulation réseau. L’API des données utilisateurs garde son propre transport et ses règles d’invalidation.

## Clavier et mise en page — lot 26

Header présente des liens natifs dans un nav, tout en transmettant les clics ordinaires à useAppNavigation pour préserver ses erreurs/reprises. App fournit le lien d’évitement vers main. Les contrôles métier restent dans leurs composants ; useSuggestionNavigation mutualise uniquement curseur, IDs et défilement des listes de suggestions. GlobalSearch et EditModal gardent le focus dans leur champ avec aria-activedescendant. Les suggestions d’EditModal restent dans le DOM de ModalShell ; le positionnement CSS remplace Teleport et les lectures de rect à chaque scroll.

FilterBar a un panneau non modal nommé, avec des boutons distincts pour choisir et créer, navigation de focus et retour au champ. SelectShell ferme à la sortie du scope et relie les descriptions ; Select expose sa listbox et l’option active depuis le champ focalisé. Les actions du finder/tableau/liens sont disponibles au focus et sans survol. Les mouvements réduits sont pris en compte dans les styles de base.

EventsView conserve un tableau à colonnes redimensionnables dans une région défilable commune ; boutons de tri, rôles de tableau et direction annoncée. Les poignées de largeur ont une alternative clavier bornée. Les barres se replient selon l’espace disponible, y compris dans une story ouverte ; les formulaires passent sur une colonne aux petits écrans. Validation navigateur à 320/768/1024/1280 px, sans prétendre couvrir tous les lecteurs d’écran ni certifier WCAG.
