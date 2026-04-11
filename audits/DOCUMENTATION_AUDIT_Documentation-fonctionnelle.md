# Audit — `Documentation/Documentation-fonctionnelle.md` vs code (2026-04-11)

## Incohérences majeures avec le produit actuel

1. **Composant `GeologicalPeriodCard`**  
   Aucun fichier de ce nom. L’équivalent est **`src/views/HomeView/PeriodCard.vue`** (et `PeriodGrid.vue`). Remplacer les mentions dans toute la doc fonctionnelle.

2. **Section « Limitations » / « Améliorations futures »**  
   Contredit l’application actuelle :  
   - **Recherche** : **`GlobalSearch.vue`** est dans le header (`Header.vue`). Les phrases « Pas de recherche directe », « Ajout d'une barre de recherche » sont **obsolètes**.  
   - **Mode sombre** : **`ThemeToggle.vue`**, `useDocumentTheme` — la mention « Mode sombre » dans les améliorations futures est **obsolète**.  
   - **Navigation « uniquement verticale »** : la timeline home est une **grille** avec défilement ; la vue Periods est en **colonnes** (finder). Reformuler.

3. **Flux « Vue Base de Données » (lignes ~572–583)**  
   Décrit encore **`DatabaseViewService`** + **`DatabaseQueryService`** (singleton, refs) : ces modules **n’existent plus**. Remplacer par **`useDataStore`** + **`StoryApiService` / `PeriodApiService` / `EventApiService`** via `ApiClient`, comme dans le code (`useDatabaseView`, etc.).

4. **« Suppression de la gestion des catégories dans l'interface principale »** (fonctionnalités principales)  
   Les formulaires / listes utilisent encore les catégories (`CategoryService`, colonne Catégories dans `EventsView`, etc.). **Retirer ou reformuler** cette ligne pour éviter une fausse information.

5. **Vue Periods — « Structure D3.js »**  
   **`Periods.vue`** n’importe pas **`d3`** (recherche dans le fichier : aucun match). La visualisation est surtout colonnes / finder + services. Corriger la description (retirer D3 ou documenter où D3 est réellement utilisé s’il l’est ailleurs).

6. **`useHomeNavigation` / chargement initial**  
   La doc parle encore beaucoup d’**éons** Wikidata comme entrée par défaut ; le code charge la story **`ENTRY_STORY_ID = '1'`** (« Univers moderne ») puis périodes associées, avec repli sur **racines API**. Mettre à jour les scénarios « quatre éons » / « Wikidata seul ».

7. **Interfaces TypeScript du milieu du document (`Period` avec `temporalData`, `isMainEon`, etc.)**  
   Ne correspondent pas à **`src/types/database.ts`** ni à **`src/types/geological.ts`**. Soit supprimer ces blocs, soit les remplacer par les types réels ou un lien vers la doc technique.

8. **Stack / endpoint Wikidata**  
   La partie « API REST Wikidata » / `wbsearchentities` est très partielle : l’app utilise aussi **SPARQL** (`WikidataQueryService`), **API REST** locale, etc. Élargir ou renvoyer à `Documentation-wikidata-properties.md` + doc technique.

## Sections encore utiles mais à harmoniser

- **Design system** : couleurs en hex fixes vs **`src/styles/variables.css`** (tokens) — indiquer que la source de vérité visuelle est le fichier de tokens.  
- **Performances / cache / debounce** : chiffrages (5 min cache, 300 ms, 10 s timeout) à **vérifier dans le code** avant de les laisser comme spécification.

## Action suggérée

Refondre le document en deux blocs : **comportement vérifié** (scénarios testés sur l’UI) vs **archive** ; traiter les sections dupliquées (« Fonctionnalités » répétées) pour une seule source par sujet.
