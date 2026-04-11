> Généré le : 2026-04-11 — Source : analyse du code source

# Architecture

## Vue d’ensemble — rôle des dossiers principaux

| Dossier / fichier | Rôle observé |
|-------------------|--------------|
| `src/App.vue` | Shell applicatif : en-tête, bascule de vues selon la route (sans `<RouterView>` pour le contenu principal), toasts et modale de confirmation globaux. |
| `src/main.ts` | Bootstrap Vue + Pinia + routeur + `style.css`. |
| `src/router/` | Définition des chemins ; `AppRouteShell.ts` est un composant factice (`return () => null`) pour satisfaire Vue Router pendant que `App.vue` rend les vues. |
| `src/views/` | Vues par domaine : `HomeView` (timeline), `DatabaseView` (stories), `GraphView/Periods` (finder colonnes), `EventsView`, `DesignSystemView`. Sous-dossiers par vue (ex. `HomeView/PeriodGrid.vue`). |
| `src/components/` | Composants transverses (header, recherche, arbre de périodes, timeline story, design system de base sous `base/`). |
| `src/composables/` | Logique réutilisable (navigation home, graphe, modales, thème, Wikidata, etc.). |
| `src/services/` | Accès HTTP (`ApiClient`), services métier par domaine (périodes, événements, stories, Wikidata, dates, recherche). |
| `src/stores/` | Pinia : au moins `useDataStore` pour listes périodes / événements / stories et chargement paresseux. |
| `src/lib/` | Fonctions pures / helpers (formatage, graphe finder, modales, etc.). |
| `src/types/` | Types TypeScript (`database.ts`, `graph.ts`, `periodTree.ts`, `global.d.ts`, etc.). |
| `src/utils/` | Utilitaires (UUID, dates DOM, bornes temporelles stories…). |
| `src/validators/` | Validateurs de formulaires. |
| `src/styles/` | Feuilles partagées (variables, layout finder…). |
| `server/src/` | Point d’entrée Express, routeur API SQL, pool PostgreSQL. |
| `database/` | Scripts SQL, backups, migrations (hors exécution automatique : non déterminé ici). |

## Patterns architecturaux observés

- **Vues par dossier** (`views/<Domaine>/`) plutôt qu’une arborescence « features » isolées avec co-location stricte.
- **Couche service singleton** côté frontend pour l’API et Wikidata.
- **État serveur partiellement centralisé** dans Pinia (`useDataStore`) pour les listes ; le reste de l’état semble local aux composables / composants (non inventorié exhaustivement).
- **Design system** : composants primitifs sous `src/components/base/`, documentés dans la vue `DesignSystemView`.
- **Pattern routeur + shell null** : atypique — le routeur synchronise l’URL mais ne monte pas les pages ; `App.vue` fait le rendu conditionnel.

## Flux de données principal (observable)

1. **Lecture liste périodes racines :** `PeriodApiService.getInstance().getListPeriods()` → `GET /api/periods` (via proxy Vite en dev) → mapping `mapToPeriod` → fusion dans `useDataStore.ensureRootsLoaded()`.
2. **Enfants d’une période :** `ensureChildrenLoaded(parentId)` → `GET /api/periods/:id/children`.
3. **Stories / événements listes :** `StoryApiService` / `EventApiService` + mises à jour du store.
4. **Recherche globale (header) :** `SearchApiService` → `GET /api/search?q=…` + requêtes Wikidata côté service (détails dans le fichier service).
5. **Wikidata SPARQL (frontend) :** `WikidataQueryService` utilise en dev l’URL proxifiée `/api/wikidata/sparql` si aucune URL personnalisée.

## Dépendances externes notables

- **PostgreSQL** : requêtes SQL dans `server/src/api/routes.ts` via `pg`.
- **Wikidata** : SPARQL (`query.wikidata.org`) — proxy Vite en dev pour `/api/wikidata` ; User-Agent défini dans `vite.config.ts` pour ce proxy.
- **Polices** : Google Fonts (Inter, Lora) référencées dans `index.html`.
- **Prisma** : dépendances présentes racine et `server/` ; lien effectif avec les routes Express : non déterminé sans audit complet du serveur.
