> Généré le : 2026-04-11 — Source : analyse du code source

# Conventions (strictement observées dans le code)

## Nommage

| Domaine | Pattern observé | Exemples |
|---------|-------------------|-----------|
| Composants Vue (fichiers) | PascalCase + `.vue` | `HomeView.vue`, `ConfirmModal.vue` |
| Composables | préfixe `use` + camelCase + `.ts` | `useDataStore` est un store ; `useHomeNavigation.ts`, `useGraphView.ts` |
| Services API | suffixe `Service` + classe, fichier `XxxService.ts` | `PeriodApiService`, `ApiClient.ts` |
| Store Pinia | `use` + nom + `Store` dans `stores/*.ts` | `useDataStore` |
| Utilitaires / lib | kebab-case ou camelCase selon fichiers | `readCache.ts`, `graphFinderHelpers.ts` |
| Types | fichiers `*.ts` souvent par domaine | `database.ts`, `periodTree.ts` |
| Champs API (PostgreSQL / JSON serveur) | snake_case SQL dans `server/src/repositories/`, variantes JSON conservées par les mappers | `label_fr`, `start_date`, `wikidata_id` |
| Champs frontend après mapping | camelCase | `startDate`, `wikidata_id` parfois conservé tel quel dans les objets |

## Imports / exports

- Alias **`@/`** → répertoire `src/` (configuré dans `vite.config.ts` ; **repris par Vitest** dans `vitest.config.ts` pour que les imports `@/…` des tests résolvent comme en build Vite).
- Services : **singleton** via `static getInstance()` + constructeur `private` (pattern récurrent).
- `apiClient` : export nommé depuis `ApiClient.ts`, méthodes `get` / `post` / `put` / `patch` / `delete`.
- **Constantes Wikidata (URL MediaWiki)** : factorisées dans `src/lib/wikidataMediaWikiConstants.ts` pour éviter les divergences entre services (`SearchApiService`, `WikidataQueryService`).

## Structure de fichier Vue

- Usage majoritaire de **`<script setup lang="ts">`**.
- Composants base : `defineProps` / `defineEmits` / parfois `withDefaults`.
- Routeur : export **default** du résultat de `createRouter`.

## Iconographie

- **Bibliothèque unique : Iconify** — `import { Icon } from '@iconify/vue'` ; préfixe `mdi:` (Material Design Icons).
- **Taille** : props `width` et `height` (ex. `width="16" height="16"`) ou classe CSS. Ne pas utiliser `:size` (syntaxe Lucide).
- **Accessibilité** : `aria-hidden="true"` sur toute icône décorative.
- **Icônes dans Button** : toujours via le slot `#icon`, jamais via prop string.
- **Bibliothèques interdites** : `lucide-vue-next` (retiré), classes FontAwesome `fas/fab/far` (retirées).

## Tailles de champs (tokens partagés)

| Token | px | Composants concernés |
|-------|----|----------------------|
| `--field-height-lg` | 44 px | `Input size="md"`, `Select size="md"`, `Button size="md"` |
| `--field-height-md` | 36 px | `Input size="sm"`, `Select size="sm"`, `SearchInput size="sm"` (défaut), `Button size="sm"` |
| `--field-height-sm` | 32 px | `SearchInput size="xs"` |

Règle : tous les composants d'une même barre (toolbar, FilterBar) utilisent le **même** niveau (`sm` = 36 px en pratique).

## Patterns à éviter (inféré du code existant)

- Ajouter un rendu conditionnel ou un import statique de page dans `App.vue` : déclarer la vue par import différé dans `src/router/routes.ts`, et son onglet éventuel dans `src/router/navigation.ts`. L’onglet actif dérive du nom de la route résolue. Seule HomeView est mise en cache ; évaluer explicitement le cycle de vie avant d’étendre ce cache.
- Revenir aux identifiants PostgreSQL locaux par défaut : le backend utilise désormais `DATABASE_URL` pour Supabase (voir `server/SUPABASE.md`).

## Patterns UI / données (période parente)

- **Sélecteur parent (modales période, vue finder `/periods`)** : `PeriodSelect` avec `search-remote` utilise **`GET /search?only=periods`** ; en édition, passer `exclude-id` pour ne pas proposer la période courante comme parent. Select reste générique et sans réseau. Après création / édition, le parent côté liste colonnes (`Periods`) peut être mis à jour via `useDatabaseSave` (`updateParent` / patch parent à l’ajout selon le flux métier observé en session).

## Wikidata — logs et import (observé)

- **`WikidataQueryService`** : sorties de debug encapsulées dans **`wdLog`** (actif en **dev** uniquement ; implémentation interne sans récursion sur `wdLog` elle-même).
- **`useWikidataImport`** : parent/classes/compteur indisponibles produisent des avertissements visibles, sans effacer les choix manuels. La lecture principale reste exploitable ; le compteur inconnu vaut null. Propager le signal et conserver la garde du brouillon.
- **Transport public** : `wikidataTransport` mutualise SPARQL/MediaWiki, validation de structure et caches mémoire limités. `shared/readOperation` remplace retryAsyncOperation : reprise des seules erreurs de lecture transitoires, au plus trois tentatives et un délai total. Ne pas l’utiliser pour les mutations.

## Incohérences observées

| Sujet | Détail |
|-------|--------|
| Fichiers dupliqués | Les 69 copies suivies `* 2.*` ont été retirées ; suppression conservée pendant la consolidation du 29 octobre 2026. |
| Anciens composants isolés | SearchResults, SearchBar, DateConverter, LanguageSelector, BackButton, ArrowIcon et Favicon sont retirés. WikidataImportButton est remplacé par useWikidataImport dans EditModal. Les scripts de maintenance restent à auditer. |
| Connexion DB | Seul le pool `pg` utilise `DATABASE_URL`, avec TLS vérifié. Prisma est archivé et absent des dépendances actives. |
| Outils Docker / paquets | Le Dockerfile et le développement utilisent Yarn et les lockfiles suivis. |
| Nom `package.json` racine | `"name": "api-wikidata"` ne correspond pas au titre produit « Universal Timeline » / README « Chronologie univers ». |
