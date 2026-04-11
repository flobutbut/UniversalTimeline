# Audit — `Documentation/Documentation-status.md` vs code (2026-04-11)

## Obsolète — à mettre à jour en priorité

| Passage doc | Réalité code |
|--------------|--------------|
| Store **`useDatabaseDataStore`** | Fichier **supprimé** ; store Pinia **`useDataStore`** (`src/stores/useDataStore.ts`). |
| **`DatabaseQueryService`** | **Supprimé** ; accès données via **`ApiClient`** + **`PeriodApiService`**, **`EventApiService`**, **`StoryApiService`**, **`SearchApiService`**. |
| **`DatabaseViewService`** | **Supprimé**. |
| **`StoryService`** | **Supprimé** ; **`StoryApiService`** (+ **`WikidataStoryService`** pour Wikidata). |
| Composable **`useConflictResolution`** | **Aucun** fichier `useConflictResolution.ts` dans `src/composables/`. La logique de conflits est dans **`ConflictResolutionService`** (et usages depuis import Wikidata / save). |

## Formulations à adoucir ou prouver

- **« Logs structurés » / « Traçabilité complète »** : le code serveur utilise surtout **`console`** ; aligner avec `Documentation-technique.md` (déjà plus prudente) ou implémenter une vraie couche de logs.  
- **Métriques de performance** (`< 2s`, `< 100ms`, etc.) : présentées comme acquises ; la doc technique indique « non vérifiés » — **harmoniser** (objectifs vs mesures).  
- **« Une seule requête pour DatabaseView et la vue Periods »** : à vérifier (store + endpoints multiples, `temporal-bounds`, lazy children, etc.) ; reformuler en « mutualisation via Pinia » si c’est l’intention.

## Points encore valides

- Stack Vue / Express / PostgreSQL / Vite / Vitest.  
- Composables listés **sauf** les noms obsolètes ci-dessus (`useDatabaseView`, `useGraphView`, `useDatabaseSave`, …).  
- **`useDocumentTheme`** présent.

## Action suggérée

Rédiger une section **« État au JJ/MM/AAAA »** avec la liste des services/composables **réels** (imports depuis `src/services/index.ts` et `src/stores/`). Réutiliser / fusionner avec `Documentation/Documentation-technique.md` pour éviter la dérive.
