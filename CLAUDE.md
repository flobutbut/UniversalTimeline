> Généré le : 2026-04-11 — Source : analyse du code source

# Chronologie univers (agent)

**Projet :** application web « Universal Timeline » / chronologie (périodes, stories, événements, Wikidata). **Date de génération de ce fichier :** 2026-04-11.

## Stack (observée)

- **Frontend :** Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Vue Router 4, Pinia, Axios, D3, `@vueuse/core`, `@iconify/vue`, `lucide-vue-next`.
- **Styles :** CSS global (`src/style.css`, `src/styles/`), variables dans `src/styles/variables.css`.
- **Backend :** Express (TypeScript) sous `server/`, client `pg`, `dotenv` ; routes montées sur le préfixe `/api`.
- **Données :** PostgreSQL via SQL dans `server/src/api/routes.ts` ; schéma Prisma présent (`server/prisma/schema.prisma`) — usage Prisma côté routes : non déterminé depuis les seuls fichiers routes/database lus.

## Règles pour un agent

1. **Navigation :** le routeur déclare des routes avec `AppRouteShell` (composant qui ne rend rien) ; le contenu affiché est piloté par `App.vue` (`v-show` / `v-if` sur les vues). Toute nouvelle route doit rester alignée avec `watch(route.path)` et `currentView`.
2. **API frontend :** utiliser `apiClient` (`src/services/ApiClient.ts`, `baseURL: '/api'`) ; en dev, Vite proxifie `/api` vers `localhost:3000` et `/api/wikidata` vers Wikidata.
3. **État partagé liste :** un seul store Pinia observé — `useDataStore` (`src/stores/useDataStore.ts`) ; les services API sont en singleton (`getInstance()`).
4. **Alias :** imports applicatifs via `@/` → `src/` (voir `vite.config.ts`).
5. **Feedback UI global :** `window.showToast`, `window.showConfirm` sont branchés dans `App.vue` — ne pas les casser sans migration.
6. **Fichiers dupliqués :** présence de copies `* 2.vue` / `* 2.ts` dans le dépôt ; traiter comme dette (voir `.agent/CONVENTIONS.md`).
7. **Connexion DB serveur :** `server/src/api/database.ts` lit `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` (pas `DATABASE_URL` dans ce fichier).
8. **Ne pas supposer Prisma actif sur les routes :** les endpoints observés utilisent du SQL via `pg` dans `server/src/api/routes.ts`.

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
