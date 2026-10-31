# Audit composants — structure, taille, responsabilités, nommage

> Généré à partir de l’audit lecture seule (2026-04-15).  
> Portée : `src/components/`, `src/views/`, alignement avec `.agent/COMPONENTS.md` et `.agent/CONVENTIONS.md`.

---

## 1. Synthèse exécutive

1. **Très gros fichiers** : `DesignSystemView.vue` (~1757 lignes) et `StoryDetailPanel.vue` (~1157 lignes) dominent par la taille ; le cœur « produit » le plus dense est **`StoryDetailPanel.vue`** (timeline, onglets, finder multi-colonnes, filtres, appels API).
2. **Composant base surchargé** : `Select.vue` (~863 lignes) cumule **UI liste + mode période + recherche distante + Pinia + `SearchApiService` / `PeriodApiService`** — frontière « composant de formulaire » / « feature » floue, comme déjà esquissé dans `.agent/COMPONENTS.md`.
3. **Modale métier lourde** : `EditModal.vue` (~831 lignes) combine formulaire, **~11 `watch`**, import Wikidata (`SearchApiService`, `PeriodApiService`), toasts et styles téléportés — responsabilités multiples malgré l’usage de composables (`useEditModal`, `useWikidataImport`).
4. **Duplication de patterns** : listes de sélection **`EventPickerModal.vue`** / **`StoryRelatedPickerModal.vue`** (même squelette : `ModalShell`, recherche, cases, pied avec `PickerSelectionCount` + `PickerModalAddButton`) ; logique de suggestion **périodes** proche entre **`Periods.vue`** et **`StoryDetailPanel.vue`** (`SearchApiService` + `PeriodApiService.getPeriod`).
5. **Cohérence doc** : `.agent/COMPONENTS.md` est globalement aligné ; petit écart possible sur le **design system** (extrait de doc dans le template de `DesignSystemView.vue` mentionne une prop `icon` pour `Button`, alors que l’inventaire impose le **slot `#icon`**).

---

## 2. Problèmes priorisés (P1 / P2 / P3)

### P1 — Impact fort sur maintenabilité / risque de régression

| Problème | Fichiers |
|----------|----------|
| **Fichier « god component »** : détail story = présentation + état d’onglets + colonnes finder + panneaux événements + recherche / fetch périodes | `src/views/DatabaseView/StoryDetailPanel.vue` |
| **Select base = UI + données + API** : double mode `list` / `period`, store, recherche remote, cache résumé parent | `src/components/base/Select.vue` |
| **Modale édition = formulaire + Wikidata + validation Q-id + nombreux watchers** | `src/views/DatabaseView/EditModal.vue` |

### P2 — Volumétrie et complexité sans être bloquants

| Problème | Fichiers |
|----------|----------|
| **Page design system monolithique** (tokens + démos composants + beaucoup de CSS) | `src/views/DesignSystemView/DesignSystemView.vue` |
| **Grille home** : layout timeline + FLIP + scaling + téléport dropdown + appel **`StoryApiService`** pour suggestions | `src/views/HomeView/PeriodGrid.vue` (~585 lignes) |
| **Vue liste événements** : toolbar + tableau redimensionnable + tri + modale | `src/views/EventsView/EventsView.vue` (~568 lignes) |
| **Vue finder `/periods`** : colonnes, drag-drop, Wikidata, filtres, modales | `src/views/GraphView/Periods.vue` (~433 lignes) |
| **`FilterBar`** : double mode `periods` / `events`, téléport dropdown, positionnement, **1 `watch`** | `src/components/FilterBar.vue` (~388 lignes) |
| **`FinderItem`** : nombreuses props (~15+ champs documentés) + logique sous-titres / survol | `src/views/GraphView/FinderItem.vue` (~347 lignes) |
| **`StoryTimeline`** : layout + tooltip téléporté + **double bloc `<style>`** (scoped + global) | `src/components/StoryTimeline.vue` (~397 lignes) |
| **`PeriodPickerModal`** : colonnes + recherche + sous-composant **`defineComponent` inline** + API | `src/views/DatabaseView/PeriodPickerModal.vue` (~366 lignes) |

### P3 — Qualité / dette légère / alignement doc

| Problème | Fichiers |
|----------|----------|
| **Quasi-duplication** des modales « liste à cocher + recherche » | `src/views/DatabaseView/EventPickerModal.vue`, `src/views/DatabaseView/StoryRelatedPickerModal.vue` (structure quasi identique ; `PeriodPickerModal.vue` est plus spécifique avec colonnes + item inline) |
| **Duplication de flux** recherche / enrichissement périodes (finder) | `src/views/GraphView/Periods.vue` ↔ `src/views/DatabaseView/StoryDetailPanel.vue` |
| **`GlobalSearch.vue`** : appel direct **`SearchApiService`** dans le composant (acceptable mais couplage API dans la couche UI) | `src/components/GlobalSearch.vue` |
| **`PeriodTreeView.vue`** : documenté comme **non branché** dans `.agent/COMPONENTS.md` — risque de composant « conservé » peu utilisé | `src/components/PeriodTreeView.vue` |
| **Doc produit vs code** : `CLAUDE.md` cite encore **`lucide-vue-next`** dans la stack alors que `.agent/CONVENTIONS.md` indique son retrait (dérive doc, pas un bug Vue) | `CLAUDE.md` vs `.agent/CONVENTIONS.md` |

---

## 3. Recommandations concrètes (sans modifier le code)

1. **`StoryDetailPanel.vue`** : extraire par domaines (au minimum : barre d’onglets + contenu « périodes finder » + contenu « événements » + panneau latéral détail événement si présent) ; déplacer la logique **`SearchApiService` / `PeriodApiService`** et les `computed` de colonnes vers un **composable** `useStoryDetailFinder` (ou équivalent) pour isoler la vue.
2. **`Select.vue`** : scinder en **`SelectList`** (options, multi, recherche locale) et **`SelectPeriod`** (navigation `currentParentId`, recherche remote), avec un mince **orchestrateur** qui délègue ; garder le store/API hors du fichier « base » autant que possible.
3. **`EditModal.vue`** : regrouper les **`watch`** liés au formulaire / Wikidata dans des fonctions ou un composable dédié (`useEditModalWikidataSearch`) ; limiter les effets redondants (plusieurs watches sur champs date).
4. **`DesignSystemView.vue`** : découper en sous-sections par route ou composants enfants **un fichier par démo** (Button, Input, FilterBar, etc.) pour réduire le fichier racine à une coquille de navigation.
5. **Modales picker** : factoriser un **`PickerListModalShell`** (slots en-tête / liste / pied) ou un composable **`useCheckedIdList`** partagé entre `EventPickerModal` et `StoryRelatedPickerModal`.
6. **`FinderItem.vue`** : si les props continuent de croître, introduire un **objet de contexte** (`rowContext`) ou scinder « ligne » vs « actions » (slot déjà présent).
7. **Aligner la doc** : corriger dans le design system la mention des props `Button` (slot `#icon` uniquement, selon `.agent/COMPONENTS.md`) ; harmoniser `CLAUDE.md` avec les conventions Iconify.

---

## 4. Fichiers cités (index rapide)

| Chemin |
|--------|
| `src/views/DesignSystemView/DesignSystemView.vue` |
| `src/views/DatabaseView/StoryDetailPanel.vue` |
| `src/components/base/Select.vue` |
| `src/views/DatabaseView/EditModal.vue` |
| `src/views/HomeView/PeriodGrid.vue` |
| `src/views/EventsView/EventsView.vue` |
| `src/views/GraphView/Periods.vue` |
| `src/components/FilterBar.vue` |
| `src/views/GraphView/FinderItem.vue` |
| `src/components/StoryTimeline.vue` |
| `src/views/DatabaseView/PeriodPickerModal.vue` |
| `src/views/DatabaseView/EventPickerModal.vue` |
| `src/views/DatabaseView/StoryRelatedPickerModal.vue` |
| `src/components/GlobalSearch.vue` |
| `src/components/PeriodTreeView.vue` |
