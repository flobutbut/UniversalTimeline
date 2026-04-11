# 11 avril 2026 — Audit obsolescence Documentation-technique.md

Source vérifiée : `Documentation/Documentation-technique.md`. Code de référence : dépôt courant (`src/`, et pour les API / Prisma les chemins `server/` et `database/` lorsque le document les cite).

---

✅ ## SECTION : Structure du projet — Composants de base (arborescence)

**PASSAGE :** « `components/base/` — Button, Input, Select, ModalShell, Tabs, … »

**OBSOLÈTE :** La liste est incomplète : existent notamment `SelectShell.vue`, `SearchInput.vue`, `ConfirmModal.vue`, `Switch.vue`, et des feuilles CSS partagées (`select-field-shared.css`, `select-period-toolbar.css`) sous `src/components/base/`, non mentionnées.

**PROPOSITION :** Étendre l’énumération ou remplacer par « … et coquilles associées (SelectShell, feuilles CSS partagées, …) ».

---

✅ ## SECTION : Composants de base — Finder / styles globaux

**PASSAGE :** (idée implicite que la mise en page Finder passe par `style.css` importé depuis `main.ts`)

**OBSOLÈTE :** `finder-column-layout.css` est bien importé dans `src/style.css` puis `src/main.ts` importe uniquement `./style.css`. En revanche `select-period-toolbar.css` et `select-field-shared.css` sont chargés via `<style src="...">` dans `Select.vue` et `SelectShell.vue`, pas via `main.ts` / `style.css`.

**PROPOSITION :** Préciser que certaines feuilles de style des composants base sont incluses au niveau des SFC, en plus du chaînage global `main.ts` → `style.css` → `styles/*.css`.

---

✅ ## SECTION : Composants de base — Select (`Select.vue`)

**PASSAGE :** « `components/base/Select.vue` + `select-period-toolbar.css` » (sans `SelectShell`)

**OBSOLÈTE :** `Select.vue` délègue le gabarit à `SelectShell.vue` (`<SelectShell>`) ; les styles de champ partagés vivent dans `select-field-shared.css` importé par `SelectShell.vue`.

**PROPOSITION :** Documenter la paire `Select.vue` / `SelectShell.vue` et les deux feuilles CSS (`select-field-shared.css`, `select-period-toolbar.css`).

---

✅ ## SECTION : Services — Accès aux données / vues

**PASSAGE :** « **`DatabaseQueryService`** : Interface PostgreSQL », « **`DatabaseViewService`** : Service spécialisé pour DatabaseView »

**OBSOLÈTE :** Aucun fichier `DatabaseQueryService.ts` ni `DatabaseViewService.ts` dans `src/services/` ; le barrel `src/services/index.ts` exporte `ApiClient`, `PeriodApiService`, `EventApiService`, `StoryApiService`, etc.

**PROPOSITION :** Remplacer par la couche actuelle (`ApiClient` + `*ApiService`) et le rôle de chaque service HTTP.

---

✅ ## SECTION : Services — Logique métier stories

**PASSAGE :** « **`StoryService`** : Gestion des stories »

**OBSOLÈTE :** Pas de `StoryService.ts` ; les opérations stories côté client passent par `StoryApiService.ts` (et `WikidataStoryService.ts` pour Wikidata).

**PROPOSITION :** « **`StoryApiService`** : appels HTTP CRUD / liaison stories » (et mentionner `WikidataStoryService` si pertinent).

---

✅ ## SECTION : Services (liste globale)

**PASSAGE :** Absence de mention de services pourtant présents et utilisés dans `src/`

**OBSOLÈTE :** `DateService.ts`, `SearchApiService.ts`, `ApiClient.ts`, `CategoryService.ts` (utilisé par `useEditModal.ts`) ne figurent pas dans la section Services alors qu’ils sont partie intégrante du code (ex. `DateService` cité plus haut dans le même document pour les onglets Stories).

**PROPOSITION :** Ajouter une sous-liste « Services utilitaires / transverses » alignée sur `src/services/` et sur `index.ts` (ou documenter explicitement les exclusions).

---

✅ ## SECTION : Diagramme des dépendances (Mermaid)

**PASSAGE :** Nœud **`useDatabaseDataStore`**, flèches vers **`DatabaseQueryService`**, **`DatabaseViewService`**, et **`useGraphModals` → `DatabaseQueryService`**.

**OBSOLÈTE :** Le composable `useDatabaseDataStore` n’existe plus ; le store Pinia est `useDataStore` (`src/stores/useDataStore.ts`), branché sur `PeriodApiService`, `EventApiService`, `StoryApiService`. `useGraphModals` importe `useDataStore`, `PeriodApiService`, etc., pas `DatabaseQueryService`.

**PROPOSITION :** Régénérer le diagramme : remplacer `useDatabaseDataStore` par `useDataStore` / Pinia, et les services obsolètes par `*ApiService` + `ApiClient`.

---

✅ ## SECTION : WikidataQueryService (paragraphe Accès aux données)

**PASSAGE :** « En production sans proxy Vite, l’URL SPARQL par défaut est `https://query.wikidata.org/sparql` »

**OBSOLÈTE :** Le code (`getWikidataSparqlUrl` dans `WikidataQueryService.ts`) utilise aussi `/api/wikidata/sparql` lorsque `import.meta.env.DEV` est vrai, avant la bascule production.

**PROPOSITION :** Ajouter : « En développement, URL par défaut : proxy `/api/wikidata/sparql` ; en production… ».

---

✅ ## SECTION : Utilitaires `src/lib/` (liste alignée sur le dépôt)

**PASSAGE :** Liste exhaustive présentée comme alignée sur le dépôt.

**OBSOLÈTE :** Le fichier `src/lib/timelinePeriodGridHelpers.ts` existe dans le dépôt mais n’apparaît pas dans la liste du document.

**PROPOSITION :** Ajouter la ligne `timelinePeriodGridHelpers.ts` avec une courte description (helpers grille périodes / timeline).

---

✅ ## SECTION : Types principaux (bloc TypeScript)

**PASSAGE :** Interfaces `Period`, `Event`, `Story`, `Category` sans champs `createdAt` / `updatedAt`.

**OBSOLÈTE :** `src/types/database.ts` définit `createdAt` et `updatedAt` sur `Period`, `Event`, `Story` (et d’autres détails comme `StoryElement`).

**PROPOSITION :** Aligner l’extrait de documentation sur les interfaces réelles ou préciser « champs omis pour brièveté ».

---

✅ ## SECTION : Base de données — Schéma Prisma

**PASSAGE :** « **Base de données** : PostgreSQL avec Prisma ORM » / sous-section « Schéma Prisma » décrivant Events, Periods, Stories, catégories, relations.

**OBSOLÈTE :** Le fichier `server/prisma/schema.prisma` du dépôt ne contient actuellement que le modèle `Event` ; il ne reflète pas la richesse décrite (périodes, stories, liaisons). Le schéma relationnel effectif est plutôt documenté côté SQL (`database/supabase-init.sql`, migrations SQL).

**PROPOSITION :** Clarifier que la source de vérité schéma côté projet est le SQL PostgreSQL (schémas `periods`, `events`, `stories`, `categories`) et que le schéma Prisma est partiel / non synchronisé avec cette section — ou étendre Prisma pour refléter la réalité.

---

✅ ## SECTION : Base de données — Tables de liaison (SQL d’exemple)

**PASSAGE :** Blocs `CREATE TABLE period_categories` / `event_categories` / `story_categories` avec noms de tables non qualifiés et `FOREIGN KEY (period_id) REFERENCES periods(id)`, etc.

**OBSOLÈTE :** Dans `database/supabase-init.sql`, les tables équivalentes sont `categories.period_categories`, `categories.event_categories`, `categories.story_categories` ; les contraintes visibles dans l’extrait du dump ne reprennent pas forcément la même forme que l’exemple du document (schémas multiples, jeux de FK différents).

**PROPOSITION :** Remplacer l’exemple par un renvoi vers le dump / les migrations réelles, ou corriger les noms qualifiés et les FK pour coller au SQL versionné.

---

✅ ## SECTION : API Endpoints — Stories

**PASSAGE :** Liste des routes stories sans `PUT /api/stories/:id`.

**OBSOLÈTE :** `server/src/api/routes.ts` définit `router.put('/stories/:id', …)` (mise à jour d’une story).

**PROPOSITION :** Ajouter la ligne « `PUT /api/stories/:id` : modification d’une story ».

---

✅ ## SECTION : API Endpoints (couverture)

**PASSAGE :** Section « API Endpoints » centrée sur périodes, événements, stories, catégories.

**OBSOLÈTE :** Le routeur expose au moins `GET /api/search` (`router.get('/search', …)`), absente du document. Idem pour `GET /api/periods/:id/children` utile au graphe / hiérarchie.

**PROPOSITION :** Documenter la recherche globale et les enfants de période, ou ajouter une phrase indiquant que la liste n’est pas exhaustive et renvoyer vers `routes.ts`.

---

✅ ## SECTION : Performance — Métriques

**PASSAGE :** « Chargement initial : < 2s », « Navigation : < 1s », « Recherche : < 500ms », « Import Wikidata : < 1s »

**OBSOLÈTE :** Aucune mesure ni test de performance dans `src/` ne justifie ces seuils dans le dépôt (affirmations non vérifiables à partir du code).

**PROPOSITION :** Préfixer par « objectifs cibles » / « non mesuré dans le repo » ou retirer les chiffres.

---

✅ ## SECTION : Tests / Sécurité — Généralités

**PASSAGE :** « Tests d’intégration — Flux utilisateur complets, Endpoints API, Requêtes base de données » ; « Logging structuré »

**OBSOLÈTE :** Le dépôt contient surtout des tests unitaires ciblés (`src/services/__tests__/`, etc.) ; pas de suite d’intégration API/DB décrite comme telle. Le « logging structuré » n’est pas implémenté de façon homogène (nombreux `console.log` côté serveur).

**PROPOSITION :** Ajuster les formulations au niveau de couverture réel ou pointer vers la config Vitest et les tests existants ; nuancer la partie logging.

---

_Fin du rapport._
