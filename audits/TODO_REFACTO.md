# TODO refactor (session — rien à corriger tout de suite)

Points relevés pour les questions « composable / lib », « import dupliqué », « valeur CSS hors token ». Les autres fichiers modifiés dans la session : uniquement styles / audit, sans nouveau code métier notable.

---

## 1. Fonction → plutôt `lib/` ou composable

| Fichier | Ligne | Détail |
|---------|-------|--------|
| `src/views/HomeView/PeriodGrid.vue` | ~239 | `getPeriodCssVars` : même famille que le layout timeline ; candidat extraction vers `src/lib/` (ex. à proximité de `timelinePeriodGridHelpers.ts`) pour tests et réutilisation. |
| `src/views/EventsView/EventsView.vue` | ~154–160 | `eventsViewGridCols` + `gridColumnVars` : si une autre vue duplique la même grille colonnes, factoriser (helper ou petit module partagé). |

---

## 2. Import dupliqué

_Rien de signalé pour les changements de cette session_ (pas d’import ajouté en doublon dans les diffs traités).

---

## 3. Valeur en dur (CSS / offset) au lieu de token

| Fichier | Ligne | Détail |
|---------|-------|--------|
| `src/styles/variables.css` | ~76–77, ~86–87, ~142, ~214–215 | Hex / noir littéral dans `color-mix` et couleurs logo Vue (`--color-asset-vue-*`, overlays, `--color-on-primary-shade*`) : définitions de tokens ; à harmoniser avec la politique « zéro hex hors neutres sémantiques » si le projet le veut strict. |
| `src/components/SearchBar.vue` | ~113 | `rect.bottom + 6` : offset vertical en px dur ; aligner sur `var(--spacing-*)` (ex. via `getComputedStyle` ou constante partagée avec les tokens). |
