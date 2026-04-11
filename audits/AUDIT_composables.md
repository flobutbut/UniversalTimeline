2026-04-10 — Audit fonctions hors composables

Périmètre : tous les fichiers `.vue` sous `src/components/` et `src/views/`.

## Méthodologie (heuristique)

- Bloc analysé : `<script setup>` (TypeScript attendu ; le parseur TypeScript est utilisé pour tous les scripts setup du projet).
- **Portée** : `function nom` et `const nom = (...) =>` / `const nom = function` au premier niveau. Callbacks passés à `onMounted`, `watch`, etc. : exclus.
- **Exclusion DOM** : motifs textuels dans le corps de la fonction (ex. `document.`, `querySelector`, `getBoundingClientRect`, `classList`, `innerHTML`, `focus`, `scrollIntoView`).
- **Exclusion refs locales** : tout identifiant déclaré en tête de script avec ref(), ref<...>(), computed(), reactive(), etc. (liste de regex — incomplet pour storeToRefs, toRef, etc.).
- **lib vs composable** : corps sans `props` / `emit` → piste `src/lib/` ; sinon → `src/composables/`. Le dossier `src/lib/` peut être absent : piste d’architecture seulement.
- **Limites** : APIs navigateur hors motifs DOM listés (`localStorage`, `matchMedia`, etc.) ne sont pas exclues — certaines fonctions listées comme « candidat lib » peuvent rester couplées au runtime navigateur.

**Suivi refactor** : une ligne précédée de **✅** indique que la piste a été appliquée (extrait vers `src/lib/` ou équivalent) après la rédaction initiale de l’audit.

## Résultat par fichier

FICHIER : src/components/ArrowIcon.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/BackButton.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/DateConverter.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/Favicon.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/GlobalSearch.vue
  → ✅ Libellé type + navigation curseur — `searchHitTypeFrLabel` / `moveListCursor` dans `src/lib/searchHitDisplay.ts`.
  → Fonction : selectHit — conservée (emit + `clear()`).

FICHIER : src/components/Header.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/LanguageSelector.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/PeriodTreeBranch.vue
  → Fonction : onRowClick — conservée (émission `select` sur l’id du nœud).

FICHIER : src/components/PeriodTreeRowBody.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/PeriodTreeView.vue
  → ✅ Fonction : fmt(raw: string | undefined) — remplacée par `formatTemporalBoundLabel` dans `src/lib/formatTemporalBoundLabel.ts` (plus de `fmt` locale).
  → ✅ Fonction : formatItemDates — extraite vers `formatPeriodTreeItemDates` dans `src/lib/formatPeriodTreeItemDates.ts`.
  → ✅ Fonction : labelKey(p: StoryPeriodInput) — extraite vers `src/lib/periodTreeLabelKey.ts`.
  → ✅ Fonction : sortPeriods(a, b) — extraite sous le nom `compareStoryPeriodsByLabel` dans `src/lib/periodTreeLabelKey.ts`.

FICHIER : src/components/SearchBar.vue
  → ✅ Libellé type + navigation curseur — `searchHitTypeFrLabel` / `moveListCursor` dans `src/lib/searchHitDisplay.ts`.
  → Fonction : selectHit — conservée (emit + `clear()`).

FICHIER : src/components/SearchResults.vue
  → ✅ handleSelect / handleSave / openWikidata — messages + URL dans `src/lib/wikidataSearchResultUi.ts` ; `emit('select')` branché sur la sélection.

FICHIER : src/components/StoryTimeline.vue
  → ✅ Fonction : boundLabel — `formatStoryTimelineBoundLabel` dans `src/lib/storyTimelineLabels.ts`.
  → ✅ Fonction : periodDetail — `formatStoryTimelinePeriodDetail` dans `src/lib/storyTimelineLabels.ts`.

FICHIER : src/components/ThemeToggle.vue
  → ✅ Fonction : hasUserChosenTheme — exportée depuis `src/composables/useDocumentTheme.ts`.
  → Fonction : onSystemThemeChange — conservée dans le composant (listener `matchMedia` + `setTheme` ; pas d’extrait pertinent).

FICHIER : src/components/Toast.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/WikidataImportButton.vue
  → ✅ Messages d’erreur — `WIKIDATA_IMPORT_QID_REQUIRED_MSG` / `wikidataImportErrorMessage` dans `src/lib/wikidataImportButtonHelpers.ts`.
  → Fonction : handleImport — conservée (async + emit success/error).

FICHIER : src/components/base/Button.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/base/ConfirmModal.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/base/Input.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/base/ModalShell.vue
  → ✅ handleOverlayClick / handleEscape — `isModalOverlayDirectClick` / `isEscapeKeyboardEvent` dans `src/lib/modalOverlayDismiss.ts`.

FICHIER : src/components/base/SearchInput.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/base/Select.vue
  → ✅ Fonction : sortPeriodsByLabel — `sortListPeriodsByLabel` dans `src/lib/selectListPeriodHelpers.ts`.
  → ✅ Fonction : formatDateBound — `formatSelectListPeriodDateBound` dans `src/lib/selectListPeriodHelpers.ts` (via `formatSelectListPeriodLine`).
  → ✅ Fonction : formatPeriodLine — `formatSelectListPeriodLine` dans `src/lib/selectListPeriodHelpers.ts`.
  → ✅ Fonction : pathFromSelectedPeriodId — `buildPeriodAncestorPathFromLeaf` dans `src/lib/selectListPeriodHelpers.ts` (injection `periodById`).
  → ✅ Fonction : showPeriodDrillChevron — `listPeriodShowsDrillChevron` dans `src/lib/selectListPeriodHelpers.ts`.
  → ✅ Fonction : isOptionSelected — `isSelectListOptionSelected` dans `src/lib/selectListPeriodHelpers.ts`.
  → Fonction : handleSearchKeydown — conservée (délégation triviale vers `handleKeydown`).

FICHIER : src/components/base/SelectShell.vue
  → ✅ handleGlobalKeydown — `shouldDismissOpenSelectOnKeydown` dans `src/lib/modalOverlayDismiss.ts`.

FICHIER : src/components/base/Switch.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/base/Tabs.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/components/icons/ChevronIcon.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/views/DatabaseView/DatabaseCard.vue
  → ✅ handleEdit — émission inline `@click` + `defineEmits` typé (plus de handler / `console.log`).

FICHIER : src/views/DatabaseView/DatabaseView.vue
  → ✅ Fonction : formatStoryListDate — remplacée par `formatStoryListTemporalBound` dans `src/lib/formatTemporalBoundLabel.ts`.
  → ✅ Fonction : storyDateRangeSublabel — `formatStoryListDateRangeSublabel` dans `src/lib/formatTemporalBoundLabel.ts`.
  → ✅ Fonction : onStoryTabSelect / onEditSelectedStory — recherche via `findById` dans `src/lib/collectionUtils.ts`.
  → Fonction : handleSave / handleDelete — conservées (async + composables save/delete).

FICHIER : src/views/DatabaseView/EditModal.vue
  → Fonction : validateQid — conservée (async + `useParentChildManagement`).
  → Fonction : handleSubmit / handleDelete — conservées (emit + composable / toast).
  → ✅ Fonction : handleWikidataImportSuccess — `applyWikidataImportPayloadToFormDraft` dans `src/lib/wikidataImportFormMerge.ts`.
  → Fonction : handleWikidataImportError — conservée (toast + `console.error`).
  → Fonction : closeModal — conservée (`emit('close')`).

FICHIER : src/views/DatabaseView/EventPickerModal.vue
  → ✅ Fonction : getYBP — `getStoryPeriodBoundaryYearsBP` dans `src/lib/storyPeriodBoundaryYbp.ts`.
  → ✅ Fonction : formatDate — `formatEventPickerListDate` dans `src/lib/listEventTableHelpers.ts`.

FICHIER : src/views/DatabaseView/PeriodPickerModal.vue
  → ✅ Fonction : buildAncestorPath — `buildPeriodIdAncestorChain` dans `src/lib/periodAncestorChain.ts` (injection store + API).

FICHIER : src/views/DatabaseView/StoryDetailPanel.vue
  → ✅ Fonction : fmt(raw: string | undefined) — remplacée par `formatTemporalBoundLabel` dans `src/lib/formatTemporalBoundLabel.ts`.
  → ✅ Fonction : formatEventDate — `formatStoryEventDateLabel` dans `src/lib/formatTemporalBoundLabel.ts`.

FICHIER : src/views/DesignSystemView/DesignSystemView.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/views/EventsView/EventsView.vue
  → ✅ Fonction : eventYbp — `listEventYearsBP` dans `src/lib/listEventTableHelpers.ts`.
  → ✅ Fonction : categoriesSortKey — `listEventCategoriesSortKey` dans `src/lib/listEventTableHelpers.ts`.
  → ✅ Fonction : updatedTs — `listEventUpdatedTimestampMs` dans `src/lib/listEventTableHelpers.ts`.
  → ✅ Fonction : formatDate — `formatEventListDateForDisplay` dans `src/lib/listEventTableHelpers.ts`.
  → ✅ Fonction : formatLastEdit — `formatListEventLastEditFr` dans `src/lib/listEventTableHelpers.ts`.

FICHIER : src/views/GraphView/FinderItem.vue
  → ✅ Fonction : formatFinderDate — `formatFinderItemBoundLabel` / `formatFinderItemDateRangeSubtitle` dans `src/lib/finderItemDateLabels.ts`.
  → Fonction : onRowActionClick — conservée dans le composant (émission `add` / `edit` selon `wikidataOnly`).

FICHIER : src/views/GraphView/Periods.vue
  → ✅ Fonction : getParentPeriod — `getFinderColumnParentPeriod` dans `src/lib/graphFinderHelpers.ts`.
  → Fonction : onDragStart — conservée (affectation `selectionState.draggedItemId`).
  → Fonction : onDragOver — N/A (géré par `@dragover.prevent` sur colonne + `onColumnDragOver`).
  → ✅ Fonction : onColumnDragOver — `finderDragOverColumnAfterMove` dans `src/lib/graphFinderHelpers.ts`.
  → Fonction : onColumnDragLeave — conservée (réinitialise `dragOverColumnIdx` si colonne courante).
  → Fonction : onDrop / onColumnDrop — conservées (glue vers `useGraphDragDrop` + reset état drag).
  → Fonction : handleAddPeriod — conservée (toast + `useGraphModals`).
  → Fonction : handleAddSubmit — conservée (glue vers `useGraphModals`).

FICHIER : src/views/HomeView.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/views/HomeView/EventCard.vue
  → Aucune fonction de premier niveau ne correspond aux critères (ou toutes exclues : DOM, refs locales, etc.).

FICHIER : src/views/HomeView/HomeView.vue
  → ✅ Fichier supprimé (doublon de `HomeView.vue`) — périmètre composable fusionné dans `src/views/HomeView.vue` et montage via `App.vue`.

FICHIER : src/views/HomeView/PeriodCard.vue
  → ✅ Fonction : formatDate — `formatTemporalBoundLabel` dans `src/lib/formatTemporalBoundLabel.ts`.
  → ✅ Fonction : handleClick — intention via `getPeriodCardClickIntent` dans `src/lib/periodCardClickIntent.ts`.

FICHIER : src/views/HomeView/PeriodGrid.vue
  → ✅ Fonction : setPeriodRef — utilise `unwrapTemplateRefToHTMLElement` dans `src/lib/timelinePeriodGridHelpers.ts`.
  → ✅ Fonction : focusTransform — `timelineFocusTransform` dans `src/lib/timelinePeriodGridHelpers.ts`.
  → Fonction : getEventRawLeft — conservée (dépend de `getEventLayoutStyle` du composable timeline).
  → ✅ Fonction : getEventAlign — `timelineEventCardAlign` dans `src/lib/timelinePeriodGridHelpers.ts`.

## Synthèse (clôture suivi)

Les extraits **✅** regroupent la logique réutilisable dans `src/lib/` (ou parfois `src/composables/`, ex. thème). Les lignes **« conservée »** ou **N/A** désignent volontairement du glue minimal : `emit`, async vers un service, listeners (`matchMedia`, `document`), ou dépendance forte au state local.

**Inventaire `src/lib/`** (fichiers du dossier, y compris hors périmètre strict de cet audit) : `buildNewEntityCoreFields.ts`, `collectionUtils.ts`, `finderItemDateLabels.ts`, `formatPeriodTreeItemDates.ts`, `formatTemporalBoundLabel.ts`, `graphFinderHelpers.ts`, `listEventTableHelpers.ts`, `modalOverlayDismiss.ts`, `periodAncestorChain.ts`, `periodCardClickIntent.ts`, `periodTreeLabelKey.ts`, `retryAsyncOperation.ts`, `searchHitDisplay.ts`, `selectListPeriodHelpers.ts`, `storyPeriodBoundaryYbp.ts`, `storyTimelineLabels.ts`, `timelinePeriodGridHelpers.ts`, `wikidataImportButtonHelpers.ts`, `wikidataImportFormMerge.ts`, `wikidataSearchResultUi.ts`.

---

*Audit initial (2026-04-10) ; suivi refactor documenté ci-dessus — **✅** = appliqué ; le reste est clos comme « conservé » ou sans candidat pertinent.*
