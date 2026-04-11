> Généré le : 2026-04-11 — Source : analyse du code source

# Conventions (strictement observées dans le code)

## Nommage

| Domaine | Pattern observé | Exemples |
|---------|-------------------|-----------|
| Composants Vue (fichiers) | PascalCase + `.vue` | `HomeView.vue`, `ConfirmModal.vue` |
| Composables | préfixe `use` + camelCase + `.ts` | `useDataStore` est un store ; `useHomeNavigation.ts`, `useGraphView.ts` |
| Services API | suffixe `Service` + classe, fichier `XxxService.ts` | `PeriodApiService`, `ApiClient.ts` |
| Store Pinia | `use` + nom + `Store` dans `stores/*.ts` | `useDataStore` |
| Utilitaires / lib | kebab-case ou camelCase selon fichiers | `retryAsyncOperation.ts`, `graphFinderHelpers.ts` |
| Types | fichiers `*.ts` souvent par domaine | `database.ts`, `periodTree.ts` |
| Champs API (PostgreSQL / JSON serveur) | snake_case dans `routes.ts` | `label_fr`, `start_date`, `wikidata_id` |
| Champs frontend après mapping | camelCase | `startDate`, `wikidata_id` parfois conservé tel quel dans les objets |

## Imports / exports

- Alias **`@/`** → répertoire `src/` (configuré dans `vite.config.ts`).
- Services : **singleton** via `static getInstance()` + constructeur `private` (pattern récurrent).
- `apiClient` : export nommé depuis `ApiClient.ts`, méthodes `get` / `post` / `put` / `patch` / `delete`.

## Structure de fichier Vue

- Usage majoritaire de **`<script setup lang="ts">`**.
- Composants base : `defineProps` / `defineEmits` / parfois `withDefaults`.
- Routeur : export **default** du résultat de `createRouter`.

## Patterns à éviter (inféré du code existant)

- Introduire un nouveau composant page **uniquement** dans le routeur sans l’ajouter à **`App.vue`** + **`watch(route.path)`** : le rendu ne suivra pas (pattern actuel).
- S’appuyer sur **`DATABASE_URL` seul** pour la connexion du pool `pg` dans `server/src/api/database.ts` : ce fichier utilise **`DB_*`** (voir OPERATIONS).

## Incohérences observées

| Sujet | Détail |
|-------|--------|
| Fichiers dupliqués | Nombreux fichiers nommés `* 2.vue` / `* 2.ts` coexistent avec l’original ; risque de divergence et d’imports accidentels. |
| Composants orphelins potentiels | `SearchResults.vue`, `SearchBar.vue`, `DateConverter.vue`, `LanguageSelector.vue`, `BackButton.vue`, `ArrowIcon.vue`, `Favicon.vue` : pas d’import trouvé par recherche de symbole / chemin. |
| Connexion DB | `server/src/api/database.ts` utilise `DB_HOST`, etc. ; `server/prisma/schema.prisma` référence `env("DATABASE_URL")` — deux mécanismes distincts dans le même dépôt. |
| Outils Docker / paquets | `server/Dockerfile` utilise `npm install` / `npm run build` alors que la racine documente **Yarn** dans `README.md`. |
| Nom `package.json` racine | `"name": "api-wikidata"` ne correspond pas au titre produit « Universal Timeline » / README « Chronologie univers ». |
