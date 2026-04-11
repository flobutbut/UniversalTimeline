> Généré le : 2026-04-11 — Source : analyse du code source

# Routes (Vue Router)

Configuration : `src/router/index.ts`. Historique : `createWebHistory()`.

**Remarque :** chaque route utilise le composant `AppRouteShell` (`src/router/AppRouteShell.ts`), qui ne produit aucun rendu. Le contenu utilisateur est affiché par `src/App.vue` selon `route.path` (ref `currentView` synchronisée par `watch`).

| Path | Composant / page réellement affiché | Layout | Auth requis | Description courte |
|------|-------------------------------------|--------|-------------|-------------------|
| `/` | *(redirection)* | `App.vue` (Header + zone principale) | inconnu | Redirige vers `/timeline` (`redirect: '/timeline'`). |
| `/timeline` | `HomeView` (`src/views/HomeView.vue`) | idem | inconnu | Grille timeline / navigation périodes (`PeriodGrid` interne). |
| `/database` | `DatabaseView` (`src/views/DatabaseView/DatabaseView.vue`) | idem | inconnu | Vue « Stories » (libellé onglet header : Stories). |
| `/graph` | `Periods` (`src/views/GraphView/Periods.vue`) | idem | inconnu | Vue colonnes type finder pour les périodes. |
| `/events` | `EventsView` (`src/views/EventsView/EventsView.vue`) | idem | inconnu | Liste / filtres événements. |
| `/design-system` | `DesignSystemView` (`src/views/DesignSystemView/DesignSystemView.vue`) | idem | inconnu | Démonstration des composants de base. |

**Auth :** aucun garde de navigation (`beforeEach`, méta `requiresAuth`, etc.) trouvé dans `src/router/index.ts` ; le reste du dépôt n’a pas été audité exhaustivement pour l’authentification → **inconnu** pour toutes les lignes.

## Conventions de nommage (observées)

| Élément | Convention observée |
|---------|---------------------|
| Fichiers des vues racines | `SomethingView.vue` dans `views/` ou sous-dossier (`DatabaseView/DatabaseView.vue`). |
| Fichiers routeur | `index.ts` + helper `AppRouteShell.ts`. |
| Noms de routes (`name`) | kebab-case sémantique : `timeline`, `database`, `graph`, `events`, `design-system`. |
| Chemins URL | kebab-case pour les segments multi-mots (`/design-system`). |
| État de vue dans `App.vue` | union de literals camelCase : `'timeline' \| 'database' \| 'graph' \| 'events' \| 'designSystem'` — noter `designSystem` côté code vs path `/design-system`. |
