> Généré le : 2026-04-11 — Source : analyse du code source

# Chronologie univers (agent)

**Répertoire de référence :** `/Users/florianbutour/Desktop/Developpement/web-chronologie-univers-2`. Tous les changements, tests et serveurs doivent partir de ce dossier ; l’ancienne copie Documents/Codex des lots 1 à 8 est dans la Corbeille et ne doit pas être recréée.

**Projet :** application web « Universal Timeline » / chronologie (périodes, stories, événements, Wikidata). **Date de génération de ce fichier :** 2026-04-11.

## Stack (observée)

- **Frontend :** Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Vue Router 4, Pinia, Axios, UUID, `@iconify/vue`.
- **Styles :** CSS global (`src/style.css`, `src/styles/`), variables dans `src/styles/variables.css`.
- **Backend :** Express (TypeScript) sous `server/`, client `pg`, `dotenv` ; routes montées sur le préfixe `/api`.
- **Données :** PostgreSQL via `pg` dans `server/` ; Prisma et son ancien updater ont été archivés hors exécution au lot 27 ; aucune dépendance Prisma/ts-node dans les manifestes actifs.

## Règles pour un agent

1. **Navigation :** `src/router/routes.ts` associe chaque route à une vue importée à la demande. `App.vue` rend `<RouterView>` et conserve uniquement `HomeView` dans `<KeepAlive include="HomeView" :max="1">`. Le nom explicite de HomeView et la clé par nom de route préservent sa période et son historique entre onglets. Déclarer les onglets dans `src/router/navigation.ts` ; `useAppNavigation` dérive l’onglet actif de la route résolue et gère chargement/erreur/reprise. Ne pas réintroduire de switch sur les chemins ou d’import statique des pages dans App.
2. **API frontend :** utiliser `apiClient` (`src/services/ApiClient.ts`, `baseURL: '/api'`) ; en dev, Vite proxifie `/api` vers `127.0.0.1:3000` et `/api/wikidata` vers Wikidata. Le lancement durable se fait par `yarn daemon:up` (PM2, `ecosystem.config.cjs`) ; arrêt `yarn daemon:down`. Vite et API écoutent sur 127.0.0.1, ports 5173 et 3000.
3. **État partagé liste :** un seul store Pinia observé — `useDataStore` (`src/stores/useDataStore.ts`) ; les services API sont en singleton (`getInstance()`).
4. **Alias :** imports applicatifs via `@/` → `src/` (voir `vite.config.ts`).
5. **Feedback UI :** `useToast()` et `useConfirm()` utilisent `useUiStore`, rendu une seule fois par `UiFeedbackHost` dans App. Les confirmations sont en file et annulées avec leur consommateur. Ne pas réintroduire de fonctions sur `window` ni de second host local.
6. **Fichiers dupliqués :** les 69 copies historiques `* 2.*` ont été supprimées dans le projet Desktop ; ne pas les réintroduire pendant une fusion.
7. **Connexion DB serveur :** `server/src/api/database.ts` charge `server/.env` ; `server/src/config/database.ts` utilise `DATABASE_URL` avec TLS vérifié pour Supabase.
8. **Ne pas supposer Prisma actif sur les routes :** les endpoints utilisent `pg` dans `server/src/repositories/`. `api/routes.ts` valide et répond ; `services/` coordonne les règles et transactions ; `domain/` reste pur. Les repositories reçoivent leur client explicitement, sans import du pool ni création de connexion. Conserver le contrôle d’architecture et les contrats HTTP.
9. **Sélecteurs :** `base/Select.vue` reçoit des options et ne dépend ni de Pinia ni des services. Pour choisir une période, utiliser `components/PeriodSelect.vue` (logique dans `usePeriodSelect`), sans prop `mode`. `SelectShell` mutualise la présentation.

10. **Tests :** `yarn test` exécute une passe ; réserver `yarn test:watch` au travail interactif. Aucune mutation de vérification sur Supabase : les tests PostgreSQL utilisent un socket et une base temporaire dédiée.
11. **Fonctionnalités conservées :** `/periods` est l’URL du finder, avec alias `/graph` et nom de route `graph`. La timeline conserve la navigation entre stories, le breadcrumb, les snapshots de périodes et les événements limités à la story courante. Le parent des périodes utilise PeriodSelect avec `search-remote` et `exclude-id`.
12. **Icônes :** utiliser Iconify (`mdi:`), conformément au projet Desktop. Ne pas réintroduire Lucide ou FontAwesome.

13. **Recherche/import Wikidata :** `useDebouncedSearch` distingue erreur/vide/chargement et annule les recherches obsolètes. Ne pas transformer une panne HTTP/API en `[]`. `useWikidataForm` porte le cycle du brouillon : un changement ou une fermeture invalide la lecture ; ne pas appliquer une réponse ancienne dans EditModal. Les enrichissements facultatifs échoués doivent rester visibles sans effacer les choix manuels.

14. **Finder :** `useFinderNavigation` résout le chemin complet avant de changer la sélection ; conserver ses gardes d’annulation et ses états erreur/reprise. Les critères de recherche (dont la catégorie) passent par `useDebouncedSearch`. `useGraphModals` charge le détail d’édition avec garde, mais crée les brouillons Wikidata directement à partir des lignes déjà chargées. Un ancêtre absent ou cyclique doit produire une erreur, sans chemin partiel.

15. **Stories :** la sélection des périodes du panneau passe par `useStoryPeriodFinder` ; garder la séparation story/catalogue, les états réessayables et l’annulation sur changement de contexte. `usePeriodPath` mutualise les lectures des chemins complets. Les suggestions d’événements de la timeline suivent `useDebouncedSearch` et doivent être annulées dans KeepAlive.

16. **Dialogues :** ModalShell et ConfirmModal utilisent `useDialog` pour la pile, le focus et inert. Garder les suggestions d’un formulaire dans le DOM du dialogue : data-dialog-owner étend le scope de focus mais ne suffit pas à rendre un panneau body accessible sous aria-modal. Une fermeture de menu consomme Échap avant la fenêtre. Les breakpoints des media queries utilisent des valeurs CSS effectives, pas `var()`.

17. **Conflits/Q-id :** `validateEntityQid` réutilise `ConflictResolutionService` (lecture seule) et le validateur de format. Aucun résolveur automatique, stratégie de remplacement, arbre de périodes isolé ou barrel de services à réintroduire. Les anciens moteurs de dates ont été retirés au lot 24 ; utiliser le domaine partagé et DateService pour l’affichage, décrits dans README-DateConversion.

18. **Serveur HTTP :** `createApp` sépare app et écoute. Le wrapper `endpoint` des routes passe par `sendApiError` ; ne jamais exposer/consigner détails SQL, stack, body ou paramètres. `createShutdown` draine HTTP puis le pool, borne l’attente et quitte avec erreur après un incident fatal. Conserver PM2 kill_timeout supérieur au délai de drainage.

19. **Contrats API :** `types/api.ts` décrit les formes transportées ; `entityMappers` normalise toutes les entités et leurs IDs. Distinguer StorySummary et Story détaillée ; ne pas fabriquer de tableaux, dates de création ou compteur d’enfants absents. Les réponses de sauvegarde mal formées doivent laisser le store intact.

20. **Accès utilisateurs :** lire `server/AUTHENTICATION.md` avant activation. AUTH_ENABLED=true sur le serveur local après la migration 20261029090427 appliquée ; ne pas l’activer sur une base non migrée. Les 11 stories historiques ont été attribuées au compte administrateur confirmé, après autorisation explicite, avec leur visibilité publique conservée. Le serveur actif vérifie getUser et applique SET LOCAL ROLE + claims dans chaque transaction ; ne pas contourner cela avec un pool exporté. Admin via app_metadata seulement ; stories par propriétaire, timeline publique et catalogue périodes/événements partagé en attente de décision. Aucun bootstrap de premier compte automatique.

21. **Extensions et fonctions SQL :** PostGIS 3.3.7 est isolé dans `extensions` depuis le lot 20 ; ne pas le réinstaller dans public ni exposer le schéma extensions à la Data API. Les deux fonctions applicatives ont un search_path fixe et ne sont pas appelables par les rôles API. Conserver les triggers `set_updated_at` ; l’ancienne routine `maintain_period_relations` est incompatible avec le schéma actuel et réservée à la revue de maintenance. Ne pas contourner les propriétaires Supabase ni utiliser DROP CASCADE pour un déplacement d’extension.

22. **Écritures liées :** les POST/PUT période transportent aussi parent_id et catégories, sans PATCH de finalisation côté formulaire. Les sélections d’associations passent par `StoryApiService.changeAssociations` et celles de stories enfants par `linkChildStories`, une transaction par sélection ; garder les locks avant les écritures de hiérarchie et les policies RLS. Ne pas réintroduire de retry automatique des écritures sans contrat d’idempotence : après perte de réponse, demander un rechargement avant renvoi. Tester les rollbacks et la concurrence avec `server/test/atomicWrites.postgres.mjs` sur cluster local jetable, jamais sur Supabase.

23. **Validation :** `src/types/editForm.ts` sépare initialisation, brouillon et soumission ; `EditFormValidator` fournit les erreurs par champ. Toute entrée HTTP passe par les parsers unknown de `server/src/api/inputValidation.ts` avant SQL, avec catégories validées séparément. Conserver textes historiques, blancs de descriptions, parent null/omis et visibilité/catégories omises ; ne pas inventer un UUID pour un ID catalogue varchar ni un stockage de localisation. La cohérence des dates passe par le module partagé et periodDateErrors côté formulaire/API. Les champs de propriété/rôle d’un body ne donnent aucun droit.

## Carte `.agent/`

| Fichier | Rôle |
|--------|------|
| [.agent/ARCHITECTURE.md](.agent/ARCHITECTURE.md) | Dossiers, flux, dépendances |
| [.agent/ROUTES.md](.agent/ROUTES.md) | Table des routes Vue |
| [.agent/COMPONENTS.md](.agent/COMPONENTS.md) | Composants structurants |
| [.agent/DATA-MODELS.md](.agent/DATA-MODELS.md) | Types TS et formes API |
| [.agent/CONVENTIONS.md](.agent/CONVENTIONS.md) | Nommage et patterns |
| [.agent/OPERATIONS.md](.agent/OPERATIONS.md) | Scripts, env, lancement |
| [.agent/CHANGELOG-AGENT.md](.agent/CHANGELOG-AGENT.md) | Journal doc agent |

24. **Dates :** `server/src/shared/temporal.ts` est l’unique moteur (alias frontend @temporal), sans dépendance applicative. Ne pas réintroduire de parser local, new Date pour comparer des dates historiques, année courante figée au chargement ou fallback inconnu → 0/NOW. DateService formate seulement ; les textes bruts restent conservés. Garder les bornes numériques importées finies selon resolveYearsBeforePresent, les coordonnées nulles distinctes du présent, le refus des intervalles connus inversés/égaux et la zone hors axe pour les éléments non datés. Le schéma ne fournit pas la provenance/calendrier Wikibase : ne pas inventer ces métadonnées ou une nouvelle époque pour les données existantes. Les tests de temporal.test.ts remplacent les suites isolées retirées.

25. **Lectures Wikidata :** passer par `wikidataTransport` (SPARQL/MediaWiki) ; `readCache` ne contient que des réponses publiques, en mémoire et à durée limitée, jamais des données de compte ou de Supabase. Clés incluant endpoint et paramètres complets ; erreurs/annulations non mémorisées, copies indépendantes pour chaque lecteur. Propager AbortSignal : l’annulation du dernier lecteur coupe le transport, pas celle d’un lecteur parmi plusieurs. `shared/readOperation` borne chaque lecture et ses reprises transitoires, au plus trois, avec Retry-After ; aucun retry d’écriture. Une panne d’enrichissement préserve le préremplissage et affiche un avertissement ; nombre d’enfants inconnu = null, jamais 0. La reprise manuelle force la relecture publique. Le lecteur et le script Prisma historiques sont désormais archivés en .txt hors des sources ; conserver les tests de readOperation et du transport actif.

26. **Clavier et reflow :** la navigation principale utilise de vrais liens et aria-current=page ; préserver clics modifiés et lien d’évitement vers main. `useSuggestionNavigation` gère seulement le curseur et les IDs des options ; le champ conserve le focus et les états/reprises restent hors listbox. FilterBar contient des actions distinctes dans un panneau non modal, pas des contrôles imbriqués dans une option. Relier erreurs/indications aux vrais contrôles et restaurer le focus après fermeture. Toute action révélée au survol doit aussi être visible au focus et sur écran sans survol. Les barres doivent se replier dans leur conteneur, y compris avec hideTitle ; conserver les régions défilables des tableaux/colonnes et leur accès clavier. Vérifier le contenu chargé et les détails sélectionnés aux petits écrans, pas seulement une vue vide. Ne pas présenter des tests DOM/AX comme une certification complète de lecteur d’écran ou WCAG.


27. **Maintenance/recherche globale :** les anciens scripts SQL/Docker/Prisma sont archivés comme textes dans database/archive avec manifeste SHA-256. Aucun replay de glob, restauration ou maintien du vieux runner update-dates ; les trois migrations conservées supposent le schéma existant. Docker est optionnel pour l’API seule (pg/Supabase), avec runtime de production non privilégié et lecture seule. GlobalSearch recherche exclusivement des stories accessibles par titre, description ou périodes/événements associés, via /api/search/stories ; Header/useAppNavigation ouvre /timeline?story=<id>. Garder RLS, validation du lien, annulation sur nouvelle intention et remise à zéro à chaque identité. Une story absente/inaccessible ne doit pas retomber sur le catalogue. Les outils catalogue conservent useSearchTarget, le chemin complet et le focus des liens directs. Leurs résultats Wikidata ouvrent des brouillons sans import/sauvegarde automatique ; le compteur non chargé reste inconnu.


28. **Installation/validation :** database/baseline/application.sql est un état initial revu pour une cible Supabase PostgreSQL 17 vide, sans données ni comptes ; garde de non-écrasement et accès RLS inclus. Ne jamais l’appliquer sur le projet existant ni rejouer ensuite les trois migrations historiques. `yarn verify:clean` / scripts/check-clean.mjs et la CI vérifient une installation vierge sans .env du poste, 798 tests isolés, types/builds/audits et 85 tests PostgreSQL 17 avec restauration fictive. Les bases et sockets restent dans des ressources Docker uniques, sans port TCP publié ; conserver leur nettoyage, leurs garde-fous et la distinction entre doublure Auth et service Supabase réel. `yarn verify:config` ne publie que des statuts, jamais des valeurs ; la revue ne modifie pas les fichiers. La production exige AUTH_ENABLED=true et la vérification du schéma avant écoute. Les URL Auth et la protection de mots de passe dans le Dashboard restent distinctes des tests locaux ; ne pas déclarer un déploiement validé sans sa cible. Le chantier UI/UX suivant est distinct de cet audit et doit conserver ses protections.
