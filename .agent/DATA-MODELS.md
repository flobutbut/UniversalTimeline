> Généré le : 2026-04-11 — Source : analyse du code source

# Modèles de données

## Types TypeScript principaux (`src/types/database.ts`)

Interfaces et types exportés observés :

- **`ListPeriod`, `ListEvent`, `ListStory`** : formes « liste » (ID chaîne normalisé, labels multilingues, dates, catégories, champs optionnels enrichis côté client comme `parentId`, `hasChildren`, `wikidata_id`, années BP).
- **`MultilingualText`** : `{ fr: string; en: string }`.
- **`Category`** : `id`, `label`, `description?`.
- **`Period`, `Event`, `Story`** : entités détaillées (relations `children`, `periods`, `events`, etc.). `StorySummary` contient les seules métadonnées, `Story` exige les tableaux périodes/événements réellement chargés. Les horodatages absents restent optionnels.
- **`StorySuggestion`** : story enfant suggérée (`id` UUID string, aligné sur l’API `/stories/suggestions`).
- **Requêtes** : `CreateStoryRequest`, `AddElementToStoryRequest`, `UpdatePeriodParentRequest`, `AddAnnotationRequest`.

## Types complémentaires (fichiers séparés)

- **`src/types/periodTree.ts`** : `StoryPeriodInput` (dont **`categories?`** optionnel), formes légères pour l’UI story.
- **`src/types/global.d.ts`** : type `Tab` pour les onglets. Notifications et confirmations typées dans `useUiStore` ; aucun ajout à `Window`.
- **`src/lib/homeStoryPeriodNav.ts`** (état **UI** timeline `/timeline`, pas une forme renvoyée par l’API) : type **`StoryPeriodNavSnapshot`** (`parentStackIds: string[]`, `currentPeriodId: string | null` — IDs au moment où l’on quitte une story pour une enfant ; réhydratation en **`ListPeriod`** après rechargement via **`resolvePeriodNavFromSnapshot`**) ; types **`StoryFrame`** / **`TimelineCrumb`** et **`buildTimelineBreadcrumb`** (chemin continu, fusion repère/racine) ; **`storyAncestorIds`** (lignée via `StorySummary.parentStoryId`, présent seulement depuis la liste des frises) ; fonction **`storyChildrenOf`** — utilisées par **`useHomeNavigation`** (`selectStory`, `navigateToBreadcrumb`, `goBack`, **`expandSingleRoot`**).

Types Wikidata / géologie : `src/types/geological.ts` (référencé par `WikidataQueryService` et le serveur `server/src/types/geological.ts` — contenu : non déterminé ligne par ligne dans cette passe).

## Schémas de réponses API (extrait du code observé)

Le frontend appelle `baseURL: '/api'` ; le serveur monte le routeur sur `/api` (`server/src/index.ts`), donc les chemins ci-dessous sont relatifs à `/api`.

### Recherche

- **`GET /search?q=`** — corps JSON consommé par `SearchApiService.ts` : `{ periods: [...], events: [...] }` avec champs typés côté client (`id`, `wikidataId`, `label`, dates pour les périodes, `date` pour les événements).
- **Paramètre `only=periods`** : réponse centrée sur les périodes ; limites serveur relevées en session : **120** par défaut, **300** lorsque `only=periods` (à vérifier si le routeur évolue). Champs SQL exposés côté recherche étendus : labels, `wikidata_id`, descriptions, cast `id::text` pour l’appariement texte.
- **Frontend** : `SearchApiService.searchLocal` accepte une option **`onlyPeriods`** pour n’interroger que les périodes (sous-header route `/periods`, sélecteur parent en modale, etc.).

### Périodes

- **`GET /periods`** : tableau ; éléments mappés par `mapToPeriod` (champs snake_case API → camelCase client : `label_fr` / `start_date` / `parent_id` / `has_children` / etc.).
- **`GET /periods/:id`**, **`GET /periods/wikidata/:wikidataId`** : objet période détaillé (voir réponses composées dans `server/src/services/catalogueService.ts` et `mappers.ts`).
- **`GET /periods/:id/children`** : tableau d’enfants (même style agrégé catégories que la liste racine).
- **`PATCH /periods/:id/parent`** : body `{ parent_id }` requis (chaîne ou null). Vérifie les cycles dans une transaction ; renvoie la période canonique.
- **`POST /periods` / `PUT /periods/:id`** : `parent_id` facultatif dans le même body que les métadonnées/catégories. Omission = conserver le parent en édition ; null = racine. Validation des cycles, mise à jour de parent et remplacement des catégories dans la même transaction. Le client n’enchaîne plus un PATCH après cette sauvegarde.
- **`DELETE /periods/:id`** : supprime seulement une période sans enfant et sans lien dans une story. HTTP 200 `{ id, parent: { id, hasChildren } | null }`, 404 si absente, 409 si utilisée, 503 si occupée. Les liens de catégories sont retirés dans la même transaction ; les catégories et les événements sont conservés.

### Événements

- **`GET /events`** : tableau d’événements avec `label`, `description?`, `date`, `categories`, etc. (mapping dans les services / store selon les usages).

### Stories

- **`GET /stories`** : liste avec `title_fr` / champs SQL exposés puis consommés côté client (voir `StoryApiService` pour le mapping exact).
- **`GET /stories/temporal-bounds`** : lignes `{ story_id, start_date, end_date }` (observé dans le SQL du routeur).
- **`GET /stories/:id`** : objet story avec `title`, `description`, `author`, `isPublic`, `categories`, `periods[]`, `events[]`, **`childStories[]`** (parent_story_id et ancres).
- **`POST /stories`** : métadonnées et catégories enregistrées dans la même transaction ; propriétaire issu du contexte vérifié, visibilité privée par défaut.
- **`POST /stories/:storyId/periods` / `/events`** : `{ ids: string[], operation: 'add' | 'remove' }`, de 1 à 500 IDs avant déduplication. Une transaction pour toute la sélection, autorisation d’écriture de la story requise, aucune insertion si un élément manque. HTTP 200 `{ storyId, kind, ids, operation }` après COMMIT. L’ajout ignore les liens déjà présents ; le retrait ignore les liens déjà absents. Les endpoints individuels historiques sont conservés côté API, mais le client actif n’utilise plus leur boucle.
- **`POST /stories/:parentId/child-stories`** : `{ childStoryIds: string[] }`, sélection atomique de stories du même propriétaire, refus des cycles. Le champ individuel historique `childStoryId` reste accepté. Réponse groupée `{ ids }` après COMMIT.
- **`DELETE /stories/:parentId/child-stories/:childId`** : vérifie le lien et les droits avant de supprimer les ancres et de détacher dans une seule transaction. Un refus préserve les deux.

### Profil du compte

- Table `profiles` (une ligne par compte, RLS sur la ligne propre) : `username` unique sans casse, `avatar_color`, `avatar_icon`, `terms_version`/`terms_accepted_at`. Règles partagées dans `server/src/shared/accountRules.ts` (alias front `@account-rules`).
- **`GET /profile`** (profil ou `null`), **`PUT /profile`** `{ username, avatarColor, avatarIcon }` (409 si nom pris ; renomme l’auteur des frises propres), **`POST /profile/terms`** `{ version }`, **`GET /profile/username-availability?username=`** (anonyme), **`GET /profile/export`**, **`DELETE /profile`** (frises puis compte).
- `POST /stories` et la frise créée depuis une période sont signées par le `username` ; sans profil : 412.

### Catégories

- **`GET /categories`** : lignes `id`, `label_fr`, `description_fr` (réponse SQL brute partielle selon route).

### Validation des entrées (lot 22)

`server/src/api/inputValidation.ts` transforme les entrées inconnues en contrats typés avant SQL. Bodies objets ; titres bilingues avec français non vide (255 caractères), descriptions optionnelles (1 000 caractères, retours à la ligne conservés), auteur non vide (255), visibilité booléenne si fournie, dates textuelles (255) et Q-id contrôlé/normalisé. Les dates historiques libres sont conservées ; le module partagé contrôle les dates civiles reconnues et les intervalles connus, sans transformer l’inconnu en présent. Les aperçus ne réécrivent pas les textes. Omission de visibilité/catégories et null explicite de parent gardent leurs sens documentés. Les champs hors contrat, dont propriétaire/rôle, ne sont pas copiés dans une écriture.

IDs de catalogue/catégories = textes bornés à 200 caractères ; IDs stories = entiers positifs int4, normalisés en chaînes côté UI. Sélections bornées à 500 avant déduplication ; ancres de type period/event seulement. Les paramètres de recherche sont des chaînes uniques bornées, avec rejet des tableaux/objets ; filtre de catégorie compatible varchar sur périodes et événements. Les refus de validation répondent 400 `{ error, fields? }`, avant transaction.

`src/types/editForm.ts` distingue données initiales, brouillon et soumission ; `EditFormValidator` fournit les erreurs par champ. Le type/mode du formulaire reste réactif. Fin vide devient NOW à la soumission. La localisation est une information Wikidata non persistée, affichée comme telle et non modifiable ; aucun champ de stockage n’a été créé pour elle.

### Wikidata (frontend)

- **SPARQL** : URL déterminée dans `WikidataQueryService` (`VITE_WIKIDATA_SPARQL_URL` ou proxy `/api/wikidata/sparql` en dev). Forme des résultats : spécifique aux requêtes du service — non résumé ici.
- **API MediaWiki (recherche d’entités / entités complètes)** : URL de base partagée **`WIKIDATA_MEDIAWIKI_API_URL`** dans `src/lib/wikidataMediaWikiConstants.ts` (consommée notamment par `SearchApiService` et par `WikidataQueryService` pour des appels comme `wbgetentities` / résolution de parent).
- **`SearchApiService` (recherche libellés / enrichissement)** :
  - **Événements** : filtrage sémantique via chaîne d’instances / sous-classes (**`P31` / `P279`**) à partir de racines « occurrence », militaire, guerre (ex. **Q198**), avec **exclusion stricte** des branches géochronologiques temporelles ; utilitaire **`wikidataItemHasMainTimeClaim`** pour qualifier les items côté claims.
  - **Fallback « liste brute »** : **non** utilisé lorsque le filtre élimine toutes les suggestions d’une page encore non vide avant filtrage (évite de réinjecter des non-événements). Repli sur une recherche brute **uniquement** si la carte des entités est **vide** après `wbgetentities`, ou dans un **`catch`** (avec **`console.warn`** en environnement de développement).
  - **`wbgetentities` / map** : le mapping indexe **toutes** les clés présentes sous `entities` dans la réponse ; en dev, avertissement si une requête HTTP par paquet n’est pas **`ok`**.
- **Documentation code** : dans `WikidataQueryService`, renvoi vers la constante / doc des racines temporelles **`WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES`** (alignement périodes géochronologiques).
- **Libellé période (bindings)** : selon la requête SPARQL, le libellé peut apparaître sous une clé attendue ou sous **`itemLabel`** ; la normalisation en période côté client (`transformToPeriod`) doit couvrir ces variantes (ex. flux story / requêtes parallèles).

## Relations entre entités (observées dans le SQL / types)

- **Période** ↔ **parent** : `parent_id` sur `periods`.
- **Période / événement** ↔ **catégories** : tables de liaison `period_categories`, `event_categories`.
- **Story** ↔ **périodes / événements** : `story_periods`, `story_events` ; **story** ↔ **catégories** : `story_categories` ; **story** ↔ **stories liées** : `story_related_stories` (`story_id` → `related_story_id`, pas de lien réflexif).

Le schéma historique Prisma ne décrivait qu’un ancien modèle Event. Il est désormais conservé dans `database/archive/server/prisma/schema.prisma.txt`, hors compilation et migrations. Aucun client Prisma ni script update-dates actif. Le serveur utilise pg et les tables bilingues existantes de Supabase.

## Frontière API (lot 16)

`src/types/api.ts` décrit les DTO SQL/canoniques, leurs IDs string/number et les payloads de formulaire. `src/services/entityMappers.ts` réalise les conversions communes : catégories multilingues, IDs imbriqués, BP numériques, parenté et horodatages. Pas de Date courante par défaut ni de `hasChildren=false` quand le serveur ne donne pas cette information. `StoryApiService.getStoryPeriods` conserve un DTO partiel ; le store le fusionne en préservant les enrichissements connus.

La base Supabase observée le 29 octobre utilise des IDs integer pour stories et varchar pour périodes/événements ; le frontend utilise toujours des chaînes. Les anciennes descriptions relatedStories dans ce document sont historiques : le code actuel utilise childStories/ancres et la migration related_stories n’est pas appliquée.
