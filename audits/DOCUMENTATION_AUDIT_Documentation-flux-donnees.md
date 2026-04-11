# Audit — `Documentation/Documentation-flux-donnees.md` vs code (2026-04-11)

## Verdict global

Ce document décrit une **architecture retirée du code** : composable **`useDatabaseDataStore`**, services **`DatabaseViewService`**, **`DatabaseQueryService`**, **`StoryService`**, composable **`useConflictResolution`**. Aucun de ces modules n’existe dans l’état actuel du dépôt.

## Détail des corrections nécessaires

1. **Bloc « Store partagé » (exemple TypeScript)**  
   Remplacer par le **store Pinia** `useDataStore` : structure des refs (`periods`, `events`, `stories`, loaders, erreurs) en lisant **`src/stores/useDataStore.ts`**.

2. **Diagrammes Mermaid (toutes les sections)**  
   - Remplacer **`useDatabaseDataStore`** → **`useDataStore`**.  
   - Remplacer **`DatabaseViewService` / `DatabaseQueryService`** → **`PeriodApiService`**, **`EventApiService`**, **`StoryApiService`**, **`SearchApiService`** (et **`ApiClient`**).  
   - **Flux Home** : `useHomeNavigation` ne part plus d’une chaîne « uniquement WikidataQueryService.loadPeriod » comme seul chemin ; intégrer **store** + **API** + éventuellement Wikidata pour les vues concernées.

3. **Section « Flux de Drag & Drop »**  
   **`DatabaseQueryService.updatePeriodParent`** n’existe pas. Documenter l’appel réel (**`PeriodApiService`** ou route utilisée par **`useGraphDragDrop`** — à citer depuis le composable).

4. **Section « Services clés » et « Composables »**  
   Réécrire la liste en s’appuyant sur **`src/services/index.ts`** et le dossier **`src/composables/`** (fichiers réels).  
   Supprimer **`useConflictResolution`** ou le remplacer par l’usage de **`ConflictResolutionService`**.

5. **Types `ListPeriod` / `ListEvent` / `ListStory`**  
   Ajouter les champs réellement utilisés (**`startYearsBP`**, **`endYearsBP`**, **`dateYearsBP`**, dates agrégées stories, etc.) en copiant depuis **`src/types/database.ts`**.

6. **« Logs structurés »** (comme dans status)  
   Harmoniser avec la réalité (**`console`**) ou avec la doc technique prudente.

## Action suggérée

**Réécriture ciblée** des diagrammes et listes (pas besoin de réécrire tout le fichier d’un bloc si vous appliquez la règle « diff minimal ») : une PR dédiée « alignement flux de données sur Pinia + ApiClient ».
