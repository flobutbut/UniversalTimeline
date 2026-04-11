2026-04-11 — Audit CSS

**Périmètre :** tous les fichiers `.vue` sous `src/`, et tous les fichiers sous `src/assets/`.  
**Référence tokens :** le dépôt n’a pas de fichier nommé `tokens.css` ; les design tokens sont dans `src/styles/variables.css` (ex. `--color-*`, `--spacing-*`, `--font-size-*`, `--z-index-*`, `--shadow-*`, `--radius-*`).  
**Méthode :** recherche textuelle (hex, `rgb`/`rgba`, `font-family` hors `var()`, espacements en `px` récurrents, `z-index` numériques). Aucun fichier source modifié.

---

## Valeurs hors tokens

### Par fichier

✅ FICHIER : src/assets/vue.svg
  → `fill="#41B883"` / `fill="#35495E"` (logo Vue) → couleurs hex hors tokens applicatifs ; à traiter via token de marque dédié ou laisser en asset tiers si intentionnel.

✅ FICHIER : src/components/ArrowIcon.vue
  → `color: #2196f3` → palette Material hors `var(--color-primary)` / neutres.
  → `background-color: rgba(33, 150, 243, 0.1)` → fond dérivé de la même teinte hors token.
  → `margin-left: 8px` → `var(--spacing-sm)`.

✅ FICHIER : src/components/LanguageSelector.vue
  → `border: 1px solid #ddd` → `var(--color-border)` ou neutre (`--color-neutral-300`).
  → `color: #333` → `var(--color-text)` / `--color-neutral-800`.
  → `border-color: #4CAF50` → `var(--color-success)` (ou token focus dédié).
  → `box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2)` → anneau focus aligné sur `--color-primary-light` / success existants.
  → `padding: 8px` → `var(--spacing-sm)`.
  → `border-radius: 4px` → `var(--radius-sm)`.

✅ FICHIER : src/components/base/ModalShell.vue
  → `background: rgba(0, 0, 0, 0.6)` → token d’overlay (ex. à ajouter) ou `color-mix` sur neutre documenté.
  → `z-index: 2000` → `var(--z-index-modal)` (1040) ou extension cohérente de l’échelle `--z-index-*`.
  → `width: 860px` → largeur modale en token ou `max-width` + unité relative.

✅ FICHIER : src/components/base/ConfirmModal.vue
  → `background: rgba(0, 0, 0, 0.65)` → idem overlay ; harmoniser avec `ModalShell`.
  → `z-index: 3000` → hors échelle `--z-index-*` (commentaire « plus haut que modale édition » → prévoir `--z-index-modal-nested` ou similaire).

✅ FICHIER : src/components/base/Switch.vue
  → `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` → `var(--shadow-sm)` ou token ombre dédié.
  → Dimensions `44px`, `24px`, `20px`, `2px`, `12px` (border-radius) → partie pourrait s’aligner sur `--spacing-*` / `--radius-*` si sémantique conservée.

✅ FICHIER : src/components/PeriodTreeBranch.vue
  → `color: rgb(255 255 255 / 0.85)` (et 0.8, 0.7) → token texte sur primaire (ex. `color-mix` avec `--color-text-white` ou variable dédiée « on-primary »).
  → `background: rgb(0 0 0 / 0.12)` et `0.15` → token surface / overlay.
  → Tailles fixes `28px`, `24px`, `2px`, `4px` (marges) → revoir vs `--spacing-xs` / `--font-size-*`.

✅ FICHIER : src/views/GraphView/FinderItem.vue
  → `color: rgb(255 255 255 / 0.82)` et `0.88` → idem texte sur fond `--color-primary`.
  → `border-left: 3px` → espacement / épaisseur tokenisée si possible.
  → `margin-left: 4px` → `var(--spacing-xs)`.

✅ FICHIER : src/views/DatabaseView/StoryDetailPanel.vue
  → `color: rgb(255 255 255 / 0.8)` et `0.7` → tokens « on-primary ».
  → `background: rgb(0 0 0 / 0.15)` → overlay tokenisé.
  → `width`/`height` `24px`, `28px` → icônes : tokens taille ou `--spacing-*`.

✅ FICHIER : src/components/base/Tabs.vue
  → `color: rgb(255 255 255 / 0.78)` → on-primary.
  → `min-width: 18px` → aligner grille typo / spacing.
  → `border-radius: 999px` → pill : `--radius-*` max ou token `pill` dédié.

✅ FICHIER : src/views/HomeView/PeriodCard.vue
  → `color: rgb(255 255 255 / 0.92)` → on-primary.
  → `height: 52px` / `min-height: 52px` → hauteur carte timeline : token métier (ex. `--period-card-height`) si réutilisé.
  → `min-width: 4px` (media ≥769px) → token ou commentaire design.
  → `z-index: 1` → couche locale ; préférer `--z-index-*` si empilement global.

✅ FICHIER : src/components/Header.vue
  → `font-family: 'Lora', Georgia, 'Times New Roman', serif` → `var(--font-family-base)` ou nouveau `--font-family-heading` dans `variables.css`.

✅ FICHIER : src/components/DateConverter.vue
  → `font-family: 'Courier New', monospace` (deux blocs) → `--font-family-mono` (à créer) aligné sur la stack mono du design system.
  → `border-radius: 8px` (plusieurs) → `var(--radius-lg)`.
  → `max-width: 1200px` → token breakpoint / layout.

✅ FICHIER : src/views/DesignSystemView/DesignSystemView.vue
  → `font-family: ui-monospace, monospace` → token mono.
  → `style="max-width: 360px; flex-direction: column; gap: 12px;"` (inline) → `gap: var(--spacing-md)` ; max-width token layout.
  → Multiples `width`/`max-width` en px (`220`, `320`, `420`, `880`, `960`) → tokens layout ou `--breakpoint-*`.
  → `min-height: 80px` → spacing / grille.

✅ FICHIER : src/components/GlobalSearch.vue
  → `max-height: 400px` → token dropdown (ex. `--dropdown-max-height`).
  → `gap: 8px` → `var(--spacing-sm)`.
  → `padding: 12px 16px` → `var(--spacing-md) var(--spacing-lg)`.
  → `gap: 6px` → proche `--spacing-sm` / token intermédiaire.
  → `padding: 4px 12px` → `var(--spacing-xs) var(--spacing-md)`.
  → `font-size: 10px` → `var(--font-size-xs)`.
  → `padding: 7px 12px` → 7px hors grille 4/8 ; harmoniser.
  → `padding: 1px 5px` / `border-radius: 3px` → tokens badge.
  → `width`/`height` `14px`, `10px` → tailles icône tokenisées.
  → `z-index: 2000` → `--z-index-dropdown` / `--z-index-modal` selon empilement réel.

✅ FICHIER : src/components/SearchBar.vue
  → `z-index: 9000` → très au-dessus de `--z-index-tooltip` (1060) ; à intégrer à l’échelle officielle.
  → `height: 32px` → hauteur champ (token `--control-height-sm` ou réutiliser `--spacing-*` × 4).
  → `width`/`height` `16px`, `14px` → tailles icône.
  → `max-height: 420px` → token dropdown.
  → `font-size: 10px` → `var(--font-size-xs)`.
  → `padding: 1px 5px` / `border-radius: 3px` → badges.

✅ FICHIER : src/components/SearchResults.vue
  → `max-height: 400px` → idem GlobalSearch.

✅ FICHIER : src/components/base/Button.vue
  → `gap: 8px` → `var(--spacing-sm)`.
  → `padding: 12px 16px` → `var(--spacing-md) var(--spacing-lg)`.
  → `padding: 4px 8px` / `8px` / `8px 12px` / `6px` / `36px` (min) → grille `--spacing-*` et hauteur contrôle.

✅ FICHIER : src/components/base/SearchInput.vue
  → `gap: 6px` → token intermédiaire ou `--spacing-sm`.
  → `height: 32px` → aligner SearchBar / input.
  → `width`/`height` `15px` → icônes.

✅ FICHIER : src/components/base/Select.vue
  → `max-height: 250px` → token liste.
  → `width: 6px` (scrollbar) → token scrollbar.

✅ FICHIER : src/components/base/SelectShell.vue
  → `max-height: 300px` → token liste.
  → `min-width: 240px` → token largeur minimale dropdown.

✅ FICHIER : src/views/DatabaseView/EditModal.vue
  → `min-height: 120px` (textarea) → token zone de texte.
  → `height: 40px` / `line-height: 40px` → hauteur input (token contrôle).
  → `width`/`height` `40px` (spinner) → taille loader.
  → `gap: 8px` → `var(--spacing-sm)`.
  → `padding: 38px 0 …` → 38px hors grille 8px ; token ou `calc`.

✅ FICHIER : src/components/StoryTimeline.vue
  → `padding: 4px 10px` (tooltip) → `var(--spacing-xs)` + token horizontal.
  → `gap: 1px` → minimal ; documenter ou token « tight ».
  → `height: 8px` / `10px`, `width: 8px`, `border-radius: 1px` / `3px` → géométrie timeline : tokens métier.
  → `box-shadow: … 3.5px` → valeur magique ; arrondi token ou `calc`.

✅ FICHIER : src/components/Toast.vue
  → `bottom: 20px` / `right: 20px` → `var(--spacing-xl)` (24) proche ou token « toast-offset ».
  → `min-width: 200px` / `max-width: 400px` → tokens toast.

✅ FICHIER : src/components/ThemeToggle.vue
  → `width: 40px` / `height: 40px` → `--spacing-*` × 5 ou token taille bouton icône.

✅ FICHIER : src/views/EventsView/EventsView.vue
  → `width: 220px` (toolbar) → token largeur filtre.
  → `max-width: 420px` → token.
  → `padding-right: 8px` → `var(--spacing-sm)`.
  → `gap: 6px` → voir grille.
  → `font-size: 10px` → `var(--font-size-xs)`.
  → `width: 8px` (handle) → token.
  → `border-radius: 2px` → proche `--radius-sm`.
  → `gap: 4px` / `padding: 1px 6px` (tags) → `--spacing-xs` / badge.

✅ FICHIER : src/views/HomeView/PeriodGrid.vue
  → `gap: 2px` / `height: 2px` / `margin: 2px 0` → sous `--spacing-xs` ; token « hairline » si intentionnel.
  → `z-index: 2` → `--z-index-*` si cohérence globale.

✅ FICHIER : src/views/HomeView/EventCard.vue
  → `width`/`height` `11px`, positions `4px`, `-1px`, `2px`, `32px`, `38px` → géométrie timeline : tokens ou commentaire design.
  → `z-index: 10` → échelle officielle.
  → `max-width: 240px` → token bulle.

✅ FICHIER : src/views/DatabaseView/PeriodPickerModal.vue
  → `width`/`min-width: 240px` → token colonne.
  → `width`/`height: 14px` → icônes.
  → `font-size: 11px` → `var(--font-size-sm)`.

✅ FICHIER : src/views/DatabaseView/DatabaseCard.vue
  → `border-left: 4px` (accent type) → `var(--spacing-xs)` ou token « accent stripe ».

✅ FICHIER : src/views/GraphView/Periods.vue
  → `border-radius: 4px` → `var(--radius-sm)`.

✅ FICHIER : src/components/base/Input.vue
  → `min-height: 36px` / `120px` → hauteurs contrôle / textarea tokenisées.

---

### Motifs transversaux (plusieurs fichiers)

- **`gap: 8px`** — présent notamment dans `GlobalSearch.vue`, `Button.vue`, `EditModal.vue` ; équivalent direct **`var(--spacing-sm)`**.
- **`padding: 12px 16px`** — `GlobalSearch.vue`, `Button.vue` ; **`var(--spacing-md) var(--spacing-lg)`**.
- **`font-size: 10px`** — `GlobalSearch.vue`, `SearchBar.vue`, `EventsView.vue` ; **`var(--font-size-xs)`** (déjà 10px dans `variables.css`).
- **`height: 32px`** — `SearchBar.vue`, `SearchInput.vue` ; hauteur de contrôle unifiée (token dédié recommandé).
- **`max-height: 400px`** — `GlobalSearch.vue`, `SearchResults.vue` ; même valeur → token partagé liste déroulante.
- **`z-index` hors échelle** (`2000`, `3000`, `9000`) — `ModalShell`, `ConfirmModal`, `GlobalSearch`, `SearchBar` vs `--z-index-modal` (1040) etc. dans `variables.css` : risque de dette d’empilement.

### Fichiers `.vue` parcourus sans littéral hex / `rgb`/`rgba`/`hsl` détecté dans `<style>` (recherche textuelle)

`App.vue`, `BackButton.vue`, `DatabaseView.vue`, `EventPickerModal.vue`, `Favicon.vue`, `HomeView.vue`, `PeriodTreeView.vue`, `PeriodTreeRowBody.vue`, `PickerModalAddButton.vue`, `PickerSelectionCount.vue`, `WikidataImportButton.vue`, etc. — sans hex / `rgb`/`rgba`/`hsl` dans les styles au moment du grep ; d’autres fichiers uniquement en `px` ou `var()` sont surtout couverts dans les sections précédentes.

---

## Styles inline à extraire

**Périmètre :** attributs `style="..."` littéraux et bindings `:style="..."` dans les templates `.vue` sous `src/`, avec critère **plus de 2 propriétés CSS** dans l’objet / la chaîne, **ou** même motif **répété sur plusieurs éléments**.

**Rappel projet :** les feuilles globales sont importées depuis `src/main.ts` (pas de `main.js` dans ce dépôt) ; pas d’`@import` entre fichiers CSS ; préférer les tokens via `var(--...)` depuis `src/styles/variables.css` (le dépôt ne contient pas de fichier nommé `tokens.css`).

> Refactor styles inline : voir implémentations ci-dessous (✅).

### Par fichier

✅ FICHIER : src/views/DesignSystemView/DesignSystemView.vue
  → `style="max-width: 360px; flex-direction: column; gap: 12px;"`
     **3 propriétés** → extraire en **classe** (layout colonne + espacement) ; aligner `gap` / `max-width` sur `var(--spacing-*)` ou équivalent tokenisé.

✅ FICHIER : src/components/SearchBar.vue
  → `:style="dropdownStyle"` avec objet runtime **`position`**, **`top`**, **`left`**, **`width`** (4 propriétés)
     → séparer **règles statiques** (classe dans une feuille importée par `main.ts`) des seules valeurs mesurées (`getBoundingClientRect`) si l’objectif est de réduire l’inline.

✅ FICHIER : src/views/HomeView/PeriodGrid.vue
  → `:style="{ ...getPeriodCssVars(period), '--enter-delay': … }"` sur chaque ligne de période (`v-for`)
     Objet **`position`**, **`left`**, **`width`**, **`top`** (et parfois **`zIndex`** au hover) → **répété N fois** → candidat à **classe de base** + **variables CSS** (`--period-left`, `--period-width`, etc.) pour limiter les objets inline.

✅ FICHIER : src/components/StoryTimeline.vue
  → `:style="{ left, width, top }"` sur chaque barre de période (`v-for`)
     **3 propriétés** dynamiques, **répétées** par période → même logique (classe + custom properties pour les valeurs calculées).

✅ FICHIER : src/views/EventsView/EventsView.vue
  → `:style="gridColumnStyle"` sur **`.table-header`** et sur le **conteneur des lignes**
     **Répété 2 fois** (même `gridTemplateColumns` calculé) → éviter la duplication du binding (ex. grille sur **un parent unique** ou propagation d’une seule source de vérité).

### Hors critère strict (> 2 propriétés) mais notés

FICHIER : src/components/base/ModalShell.vue
  → `:style="modalStyle"` — au plus **`height`** et **`maxHeight`** (2 clés) selon les props ; reste du domaine « **préférer classes + tokens** » plutôt que critère « > 2 ».

FICHIER : src/views/HomeView/EventCard.vue
  → `:style="cardStyle"` — props **`width`** + **`left`** (2 clés) ; positionnement timeline, hors seuil « > 2 ».

FICHIER : src/components/StoryTimeline.vue
  → `:style="{ left, top }"` sur le tooltip — **2 propriétés** ; hors seuil « > 2 ».

### Cas `:style` à une seule propriété (non prioritaires pour cette section)

`FinderItem.vue` (opacity), `DesignSystemView.vue` (aperçu `background` dynamique), `PeriodTreeBranch.vue` (`paddingLeft` calculé), `PeriodGrid.vue` (hauteur de ligne), `StoryTimeline.vue` (hauteur du track, `left` seul sur marqueurs d’événements).

### Littéraux `style="..."` sous `src/`

Ancienne occurrence dans `DesignSystemView.vue` remplacée par la classe **`design-system__row--search-input-demo`** ; le reste du périmètre est des **bindings** `:style`.

---

*Audit lecture seule — aucune correction appliquée. Fichier écrit : `audits/AUDIT_css.md`.*
