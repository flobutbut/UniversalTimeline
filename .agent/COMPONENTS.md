> Généré le : 2026-04-11 — Source : analyse du code source

# Composants (inventaire structurant)

Référence d’usage : recherche `from '@/components/` et imports relatifs entre composants. Chemins sans suffixe ` 2.vue` (fichiers dupliqués : voir CONVENTIONS).

Légende **Utilisé dans** : vues ou composants parents observés (liste non exhaustive si le composant est transitif).

## Layout / shell

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| Header | `src/components/Header.vue` | `currentView` (`'timeline' \| 'database' \| 'graph' \| 'events' \| 'designSystem'`) | `App.vue` |

## UI partagés (`src/components/base/`)

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| Button | `src/components/base/Button.vue` | `variant`, `type`, `size`, `icon`, `iconOnly`, `disabled` | `DesignSystemView`, `EditModal`, `EventsView`, `StoryDetailPanel`, `PickerModalAddButton`, `ModalShell`, `WikidataImportButton`, … |
| Input | `src/components/base/Input.vue` | `modelValue`, `label`, `type`, `placeholder`, `error`, `hint`, `disabled`, `required`, `compact` | `DesignSystemView`, `EditModal` |
| SearchInput | `src/components/base/SearchInput.vue` | `modelValue`, `placeholder` | `DesignSystemView`, `EventsView`, `GlobalSearch`, `PeriodPickerModal`, `EventPickerModal` |
| Select | `src/components/base/Select.vue` | nombreuses (`options`, `modelValue`, `multiple`, `label`, `isPeriod`, `isList`, …) | `DesignSystemView`, `EditModal`, `EventsView` |
| SelectShell | `src/components/base/SelectShell.vue` | utilisé comme enveloppe par `Select.vue` (API interne) | `Select.vue` |
| Switch | `src/components/base/Switch.vue` | `modelValue`, `label?` | `DesignSystemView`, `EditModal` |
| Tabs | `src/components/base/Tabs.vue` | `modelValue`, `tabs`, `vertical?`, `variant?` | `Header`, `DatabaseView`, `StoryDetailPanel`, `DesignSystemView` |
| ModalShell | `src/components/base/ModalShell.vue` | `title`, `height?` ; slots corps / pied | `DesignSystemView`, `EditModal`, `PeriodPickerModal`, `EventPickerModal` |
| ConfirmModal | `src/components/base/ConfirmModal.vue` | pas de props externes documentées ; méthode exposée `show(title, message)` | `App.vue`, `DesignSystemView` |

## Métier / transverse

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| GlobalSearch | `src/components/GlobalSearch.vue` | *(aucune prop)* ; emit `select(hit)` | `Header.vue` |
| ThemeToggle | `src/components/ThemeToggle.vue` | non déterminé (fichier non relu ligne par ligne pour les props) | `Header.vue` |
| Toast | `src/components/Toast.vue` | *(aucune prop)* ; méthodes exposées `show` / `hide` | `App.vue`, `Periods.vue` |
| WikidataImportButton | `src/components/WikidataImportButton.vue` | `qid`, `type` (`'period' \| 'event'`) ; emits `import-success`, `import-error` | `EditModal.vue` |
| PeriodTreeView | `src/components/PeriodTreeView.vue` | `periods`, `selectedId` ; emits `select`, `remove` | `StoryDetailPanel.vue` |
| PeriodTreeBranch | `src/components/PeriodTreeBranch.vue` | `node`, `selectedId`, `depth` ; emits `select`, `remove` | `PeriodTreeView.vue` |
| PeriodTreeRowBody | `src/components/PeriodTreeRowBody.vue` | `label`, `datesLabel` (observés via parent) | `PeriodTreeBranch.vue` |
| StoryTimeline | `src/components/StoryTimeline.vue` | `periods?`, `events?`, `selectedPeriodId?`, `selectedEventId?` ; emits `select-period`, `select-event`, `deselect` | `StoryDetailPanel.vue` |

## Icônes

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| ChevronIcon | `src/components/icons/ChevronIcon.vue` | `width?`, `height?`, `color?` | `FinderItem.vue` |

## Vue graphe (structurant, hors `src/components/`)

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| FinderItem | `src/views/GraphView/FinderItem.vue` | `label`, `selected`, `hasChildren`, `wikidataOnly?`, `itemId`, `startDate?`, `endDate?`, `categories?` | `Periods.vue` |

## Fichiers `.vue` présents sans import détecté ailleurs (grep sur le dépôt)

Les composants suivants existent sous `src/components/` mais **aucune occurrence** de leur nom de fichier / symbole n’a été trouvée dans les imports au moment de l’analyse :

- `SearchBar.vue`, `SearchResults.vue`, `DateConverter.vue`, `BackButton.vue`, `ArrowIcon.vue`, `Favicon.vue`, `LanguageSelector.vue`

**Non déterminé :** usage dynamique ou référence hors patterns grep — à vérifier manuellement avant suppression.

## Hors périmètre (volontairement non tabulés)

- Cartes et panneaux fortement couplés à une seule vue (`PeriodCard`, `DatabaseCard`, modales métiers spécifiques, etc.) : logique locale ; seuls les modaux réutilisant `ModalShell` sont listés via les parents ci-dessus.
