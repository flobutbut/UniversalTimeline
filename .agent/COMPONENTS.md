> Généré le : 2026-04-11 — Source : analyse du code source

# Composants (inventaire structurant)

Référence d’usage : recherche `from '@/components/` et imports relatifs entre composants. Les anciennes copies `* 2.vue` ont été supprimées (voir CONVENTIONS).

Légende **Utilisé dans** : vues ou composants parents observés (liste non exhaustive si le composant est transitif).

## Layout / shell

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| Header | `src/components/Header.vue` | `currentView: NavigationView \| ''` ; liens natifs de `router/navigation.ts`, navigation nommée, aria-current=page | `App.vue` |

## UI partagés (`src/components/base/`)

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| Button | `src/components/base/Button.vue` | `variant`, `type`, `size`, `icon`, `iconOnly`, `disabled` | `DesignSystemView`, `EditModal`, `EventsView`, `StoryDetailPanel`, `PickerModalAddButton`, `ModalShell`, `WikidataImportButton`, … |
| Input | `src/components/base/Input.vue` | `modelValue`, `label`, `type`, `placeholder`, `error`, `hint`, `disabled`, `required`, `compact` | `DesignSystemView`, `EditModal` |
| SearchInput | `src/components/base/SearchInput.vue` | `modelValue`, `placeholder` | `DesignSystemView`, `EventsView`, `GlobalSearch`, `PeriodPickerModal`, `EventPickerModal` |
| Select | `src/components/base/Select.vue` | `options`, `modelValue`, `multiple`, `searchable`, `disabled`, `loading`, `label`, `compact` ; liste générique sans store ni réseau | `DesignSystemView`, `EditModal`, `EventsView` |
| SelectShell | `src/components/base/SelectShell.vue` | enveloppe visuelle, slots trigger/dropdown, `open`, rôles/labels du panneau, fermeture extérieure/Escape ; styles partagés | `Select.vue`, `PeriodSelect.vue` |
| Switch | `src/components/base/Switch.vue` | `modelValue`, `label?`, `aria-label` si texte masqué, `disabled?` ; nom sur le bouton | `DesignSystemView`, `EditModal`, `StoryDetailPanel` |
| Tabs | `src/components/base/Tabs.vue` | `modelValue`, `tabs`, `vertical?`, `variant?` | `DatabaseView`, `StoryDetailPanel`, `DesignSystemView` |
| ModalShell | `src/components/base/ModalShell.vue` | `title`, `height?` ; slots corps / pied, **`header-right`** (optionnel, ex. recherche Wikidata). **Dropdowns** : `overflow` visible côté shell, overlay scroll, z-index distincts en-tête / corps / pied pour éviter de rogner les listes déroulantes (`Select` notamment). | `DesignSystemView`, `EditModal`, `PeriodPickerModal`, `EventPickerModal`, `StoryRelatedPickerModal` |
| ConfirmModal | `src/components/base/ConfirmModal.vue` | pas de props externes documentées ; méthode exposée `show(title, message)` | `App.vue`, `DesignSystemView` |

## Métier / transverse

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| PeriodSelect | `src/components/PeriodSelect.vue` | `modelValue: string \| null`, `disabled`, `label`, `compact` ; `searchRemote`, `excludeId` pour le parent ; navigation et lectures via `usePeriodSelect` | `EventsView`, `DesignSystemView`, `EditModal` |
| ItemSummary | `src/components/base/ItemSummary.vue` | Titre, description et métadonnées compacts ; partagé par la recherche, les lignes du finder et les onglets de frises | `GlobalSearch`, `FinderItem`, `Tabs` |
| GlobalSearch | `src/components/GlobalSearch.vue` | *(aucune prop)* ; emit `select(hit)` | `Header.vue` |
| FilterBar | `src/components/FilterBar.vue` | `mode?` (`periods` \| `events`), `title?`, `categoryOptions`, `suggestions?` (périodes), `eventSuggestions?` (événements), `hideTitle?`, `allowWikidataCreate?` ; `v-model:search`, `v-model:categoryId` ; emit `add`, `pickPeriod`, `pickEvent`, `wikidataAdd`. Tous les champs internes à `size="sm"` (36px). | `Periods.vue`, `StoryDetailPanel.vue`, `DesignSystemView` |
| ThemeToggle | `src/components/ThemeToggle.vue` | Aucune prop. Utilise `<Button variant="secondary" iconOnly>` + slot `#icon` (SVG inline soleil/lune). | `Header.vue` |
| StoryBreadcrumb | `src/components/StoryBreadcrumb.vue` | `items` (`{ id: string; title: string }[]`), `loading?` ; emit `navigate(index)` pour les ancêtres. Fil d’Ariane stories puis périodes, liste ordonnée et aria-current, retour clavier avec focus sur la destination. Dans le flux au-dessus de la frise ; libellés complets et lignes adaptables. | `HomeView.vue` |
| UiFeedbackHost / Toast / ConfirmModal | `src/components/UiFeedbackHost.vue` | Store `useUiStore` ; `useToast` et `useConfirm` ; confirmation en file, dialogue déclaratif | Un seul host dans App, aucun global window |
| ~~WikidataImportButton~~ | ~~supprimé~~ | Remplacé par `useWikidataImport` + `Button` variant secondary inline dans `EditModal`. | — |
| StoryTimeline | `src/components/StoryTimeline.vue` | `periods?`, `events?`, `selectedPeriodId?`, `selectedEventId?` ; emits `select-period`, `select-event`, `deselect` | `StoryDetailPanel.vue`, `DesignSystemView` |

### `EditModal` (`src/views/DatabaseView/EditModal.vue`)

- **Création période ou événement** : recherche Wikidata via `SearchInput` placé dans le slot **`header-right`** de `ModalShell` (pas de libellé texte au-dessus du champ).
- **Comportement** : `importAndTransform` et le flux d’import selon le type d’entité ; `runWikidataLabelSearch` avec **`restrictToEventConcepts`** lorsque la création concerne un **événement**.
- **Erreurs** : états visibles distincts, reprise explicite, données principales conservées en cas d’échec d’un complément. Les suggestions restent dans le dialogue et se parcourent par flèches/Entrée avec le focus au champ ; Échap ferme d’abord la liste.

## Icônes

Bibliothèque unique : **Iconify** (`@iconify/vue`). Import : `import { Icon } from '@iconify/vue'`. Préfixe principal : `mdi:`. Taille via props `width`/`height` ou CSS. Toujours `aria-hidden="true"` sur les icônes décoratives. **Pas de FontAwesome, pas de lucide-vue-next.**

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| ChevronIcon | `src/components/icons/ChevronIcon.vue` | `width?`, `height?`, `color?` — wraps `<Icon icon="mdi:chevron-right">` | `FinderItem.vue`, `DesignSystemView` |

## Vue finder périodes / `/periods` (structurant, hors `src/components/`)

| Nom | Chemin | Props principales | Utilisé dans |
|-----|--------|-------------------|--------------|
| FinderItem | `src/views/GraphView/FinderItem.vue` | `label`, `selected`, `hasChildren`, `wikidataOnly?`, `itemId`, `startDate?`, `endDate?`, `categories?`, `draggable?` (défaut `true`), `hideRowAction?`, `hideChevron?` (pas de drilldown), `dateSubtitleOverride?`, `isExternalCatalog?` (ligne catalogue hors story : titres/dates atténués) ; slot **`#actions`** (boutons fin de ligne, ex. retirer / ajouter) ; **`border-bottom`** sur la racine du composant (séparateur de ligne ; la feuille `finder-column-layout.css` ne redéclare plus ce bord sur les enfants) ; pas de style `.droppable` (retiré) ; commentaire d’usage en tête du `<script setup>` | `Periods.vue`, `StoryDetailPanel.vue`, `DesignSystemView` |
| StoryDetailPanel | `src/views/DatabaseView/StoryDetailPanel.vue` | `story?` (`Story \| null`), `loading` ; onglets Périodes / Événements / **Stories enfants** ; périodes et **événements** : même ligne **`FinderItem`** (liste événements `.events-finder-list`, fond `var(--color-surface)`, sans padding vertical parasite sur la liste) ; périodes : colonnes finder + Switch « Hors story » ; en-tête colonne : titre + bouton **Ancrer une story** ; stories enfants ancrées **au-dessus** des périodes dans chaque colonne ; emits `add-child-stories`, `remove-child-story`, etc. | `DatabaseView.vue` |
| StoryRelatedPickerModal | `src/views/DatabaseView/StoryRelatedPickerModal.vue` | `excludeStoryIds` (courante + déjà liées) ; emits `confirm(ids)`, `close` | `StoryDetailPanel.vue` |

## Nettoyage composants non branchés (2026-04-12)

Supprimés du dépôt après vérification d’imports : `SearchBar.vue`, `SearchResults.vue`, `DateConverter.vue`, `BackButton.vue`, `ArrowIcon.vue`, `Favicon.vue`, `LanguageSelector.vue`, ainsi que le service mort `WikidataSearchService.ts` et `wikidataSearchResultUi.ts` (consommateur unique supprimé).

## Hors périmètre (volontairement non tabulés)

- Cartes et panneaux fortement couplés à une seule vue (`PeriodCard`, modales métiers spécifiques, etc.) : logique locale ; seuls les modaux réutilisant `ModalShell` sont listés via les parents ci-dessus.

## Sélection de périodes — lot 7

`Select` gère uniquement les options fournies par son parent. `PeriodSelect` présente le filtre métier ; `usePeriodSelect` gère les niveaux, la recherche locale et les lectures via le store partagé. `SelectShell` conserve les interactions et styles communs. Les appels actifs ne passent plus de prop `mode`. Lors de la consolidation du 29 octobre, les copies `* 2.*` retirées dans Desktop ne sont pas réintroduites. La recherche distante et l’exclusion du parent ont été portées dans PeriodSelect/usePeriodSelect. SelectShell accepte size=sm et compact pour la même taille de champ.
