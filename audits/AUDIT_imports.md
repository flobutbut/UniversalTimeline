2026-04-10 — Audit imports inutilisés

Périmètre : arborescence `src/` — fichiers `.vue`, `.ts`, `.js`, `.d.ts` (dossiers `__tests__` exclus de la promenade). Le fichier `src/utils/dateFormatter.test.ts` est exclu du `tsconfig` utilisé par la commande d’audit (voir méthodologie).

## Méthodologie

- Commande : `vue-tsc --noEmit -p tsconfig.audit-unused.json` à la racine du dépôt, avec `compilerOptions.noUnusedLocals` et `noUnusedParameters` activés par rapport à `tsconfig.app.json`, et exclusion de `src/**/*.test.ts`.
- Seules les erreurs **TS6133** (symbole déclaré jamais lu), **TS6192** (import entièrement inutilisé) et **TS6196** (symbole de type déclaré jamais utilisé) sont agrégées.
- Classement heuristique : pour TS6133, si le diagnostic pointe sur une ligne commençant par `import` et contenant l’identifiant, l’entrée est rangée sous **Import inutilisé** ; pour TS6196, si la ligne est un `import type` contenant le nom, même règle ; sinon entrée sous **Variable / fonction / ref** (types ou interfaces locales non référencés) ; `props` issu de `defineProps` / `withDefaults` est rangé sous **Props**.
- **Clés de props `defineProps`** : pas d’inventaire automatique des clés « jamais lues » dans ce rapport ; seule la variable `props` explicitement inutilisée dans le script est listée lorsque `vue-tsc` la signale.

## Résultat par fichier

FICHIER : src/App.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/ArrowIcon.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/BackButton.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : liaison `props` / résultat de defineProps non lu dans le script (accès implicite au template possible)

FICHIER : src/components/DateConverter.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : isLoading (déclaré, jamais lu) ; formatForDisplay (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/Favicon.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/GlobalSearch.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/Header.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/LanguageSelector.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/PeriodTreeBranch.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/PeriodTreeRowBody.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/PeriodTreeView.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/SearchBar.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/SearchResults.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : liaison `props` / résultat de defineProps non lu dans le script (accès implicite au template possible)

FICHIER : src/components/StoryTimeline.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/ThemeToggle.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/Toast.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/WikidataImportButton.vue
  → Import inutilisé : computed (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/Button.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/ConfirmModal.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/Input.vue
  → Import inutilisé : computed (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : liaison `props` / résultat de defineProps non lu dans le script (accès implicite au template possible)

FICHIER : src/components/base/ModalShell.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/SearchInput.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/Select.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/SelectShell.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/Switch.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/base/Tabs.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/components/icons/ChevronIcon.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useDatabaseDelete.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useDatabaseSave.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useDatabaseView.ts
  → Import inutilisé : PeriodApiService (importé, jamais utilisé) ; EventApiService (importé, jamais utilisé) ; Period (import type, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useDateConversion.ts
  → Import inutilisé : DateRange (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useDocumentTheme.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useEditModal.ts
  → Import inutilisé : ref (importé, jamais utilisé) ; Period, Event, Story
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useGraphDragDrop.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useGraphModals.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : oldId (déclaré, jamais lu) ; newQid (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useGraphView.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useHomeNavigation.ts
  → Import inutilisé : PeriodApiService (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useLoadingState.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useModalState.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useParentChildManagement.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useTimelineScaling.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useToast.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/composables/useWikidataImport.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/main.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/router/index.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/ApiClient.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/CategoryService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/ConflictResolutionService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/DateConversionService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : day (déclaré, jamais lu) ; month (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/DateService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/EventApiService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/PeriodApiService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/SearchApiService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/StoryApiService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/TimelineScalingService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/WikidataCategoryMapper.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/WikidataQueryService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : dateFormatter (déclaré, jamais lu) ; isValidPeriod (déclaré, jamais lu) ; transformChildToPeriod (déclaré, jamais lu) ; groupPeriodsByLocation (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/WikidataSearchService.ts
  → Import inutilisé : FormattedPersonDate, FormattedPeriodDate, FormattedEventDate
  → Variable / fonction / ref / paramètre inutilisé(e) : WikidataResponse (type / interface locale, jamais utilisé(e)) ; WikidataEntity (type / interface locale, jamais utilisé(e)) ; DEBOUNCE_DELAY (déclaré, jamais lu) ; searchTimeout (déclaré, jamais lu) ; currentSearchPromise (déclaré, jamais lu) ; retryOperation (déclaré, jamais lu) ; instanceOf (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/WikidataStoryService.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/services/index.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/stores/useDataStore.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/database.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/date.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/geological.js
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/geological.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/global.d.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/graph.ts
  → Import inutilisé : GeologicalPeriod (importé, jamais utilisé) ; DatabasePeriod (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/jest.d.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/types/periodTree.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/utils/dateFormatter.test.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)
  → Remarque : fichier exclu du `tsconfig.audit-unused.json` — les trois rubriques ci-dessus restent « — » faute de diagnostic `vue-tsc` sur ce fichier.

FICHIER : src/utils/dateFormatter.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : type (déclaré, jamais lu) ; format (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/utils/storyTemporalBounds.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/utils/uuid.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/validators/editFormValidators.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DatabaseView/DatabaseCard.vue
  → Import inutilisé : ref (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : liaison `props` / résultat de defineProps non lu dans le script (accès implicite au template possible)

FICHIER : src/views/DatabaseView/DatabaseView.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DatabaseView/EditModal.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : isValid (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DatabaseView/EventPickerModal.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DatabaseView/PeriodPickerModal.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DatabaseView/StoryDetailPanel.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/DesignSystemView/DesignSystemView.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/EventsView/EventsView.vue
  → Import inutilisé : Input (importé, jamais utilisé)
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/GraphView/FinderItem.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : handleEdit (déclaré, jamais lu) ; onDragStart (déclaré, jamais lu) ; onDragOver (déclaré, jamais lu) ; onDragLeave (déclaré, jamais lu) ; event (déclaré, jamais lu) ; onDrop (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/GraphView/Periods.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : idx (déclaré, jamais lu) ; currentColumnIdx (déclaré, jamais lu) ; modalLoading (déclaré, jamais lu) ; onDragOver (déclaré, jamais lu)
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/HomeView.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/HomeView/EventCard.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/HomeView/HomeView.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/HomeView/PeriodCard.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/views/HomeView/PeriodGrid.vue
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

FICHIER : src/vite-env.d.ts
  → Import inutilisé : —
  → Variable / fonction / ref / paramètre inutilisé(e) : —
  → Prop(s) / liaison props : — (pas de liste automatique des clés defineProps ; voir méthodologie)

---

*Ce document est un constat d’audit uniquement : aucune proposition de correction ni modification du code n’y est associée.*
