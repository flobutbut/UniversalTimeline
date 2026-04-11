# Audit — `Documentation/Documentation-technique.md` vs code (2026-04-11)

Comparaison avec le dépôt actuel (`src/`, `server/`, `database/`).

## Écarts à corriger (priorité haute)

1. **Navigation Home / données initiales**  
   Le diagramme mermaid et la chaîne « `HomeView` → `useHomeNavigation` → `WikidataQueryService.loadPeriod` » ne reflètent plus le flux principal : `useHomeNavigation` s’appuie sur **`useDataStore`** (Pinia), charge les périodes de la story d’entrée (`ENTRY_STORY_ID`), `ensureStoryPeriodsLoaded` / `ensureChildrenLoaded`, etc. Wikidata reste utilisé ailleurs (finder, `useGraphView`), pas comme source unique du home décrit implicitement par l’ancien schéma.

2. **`Period` / `hasParent` (commentaire sémantique)**  
   Dans `src/types/database.ts`, le commentaire sur `hasParent` parle d’« enfants » alors que le reste de la doc métier parle de parenté ; aligner la **documentation technique** avec la sémantique réelle en base (`has_parent`, `children` jsonb) et corriger le type côté code si besoin — la doc technique reproduit l’interface telle qu’écrite dans le fichier types.

## Vérifications / ajustements recommandés (moyenne)

3. **Dossier `src/validators/`**  
   La structure liste `validators/` : il existe surtout **`src/validators/editFormValidators.ts`** — préciser que le dossier est minimal ou lister le fichier réel.

4. **Vue `HomeView`**  
   Le fichier réel est **`src/views/HomeView.vue`** (à la racine de `views/`), pas uniquement sous-dossier `HomeView/` (où se trouvent `PeriodCard`, `PeriodGrid`, etc.).

5. **`DatabaseView` et `v-if` vs timeline**  
   Dans `App.vue`, la timeline utilise `v-show` (état conservé) ; **`DatabaseView` est en `v-if`**. La phrase sur le shell est correcte pour Home ; préciser que la vue base de données est démontée quand on la quitte (comportement différent).

6. **Prisma**  
   La mention « schéma partiel » est exacte (`server/prisma/schema.prisma` ne contient qu’un modèle `Event` simplifié). Préciser que l’API métier ne passe **pas** par Prisma pour la majorité des entités (SQL dans `database.ts`).

## Points globalement conformes

- Stack Vue 3 / Vite / Vitest / Express ; `docker-compose.yml` présent.  
- Composables listés (hors détail Home ci-dessus), `src/lib/*`, services `*ApiService`, `ApiClient`, `WikidataQueryService` (proxy SPARQL en dev, URL prod), `WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES`.  
- Endpoints stories `temporal-bounds`, recherche `GET /api/search` — à garder synchronisés avec `server/src/api/routes.ts` (déjà mentionné dans la doc).  
- `DateConversionService` : méthodes `convertDate`, `convertDateRange`, `formatForDisplay` présentes.

## Action suggérée

Mettre à jour le diagramme de dépendances et la section composables / Home pour **Pinia `useDataStore`** et le chargement par story API ; relire `routes.ts` pour toute route ajoutée depuis la rédaction.
