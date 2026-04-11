2026-04-10 — Audit code mort et legacy

## Vérification documentation « legacy » (panels)

- Chemin attendu : `src/components/panels/` — **absent du dépôt** (aucun fichier listé sous ce dossier dans l’état actuel du projet).
- Les fichiers `Documentation-technique.md` et `Documentation-fonctionnelle.md` **ne contiennent pas** la mention « panels » / « legacy » à la date de cet audit (recherche textuelle). La mention « legacy / panels » apparaît dans `audits/CURSOR_CLEANUP_PROMPTS.md` (prompts internes), pas dans la doc produit racine analysée ici.

## Méthodologie — « importé nulle part »

- **Graphe statique** : parcours en largeur depuis `src/main.ts` (point d’entrée réel, cf. `index.html`), en suivant les chemins `import … from`, `import('…')`, `import '…'`, `export … from`, et `@import` dans les blocs `<style>` des `.vue` ainsi que dans les `.css`.
- **Alias** : `@` → `src/` (comme `vite.config.ts`).
- **Hors périmètre** : dépendances npm (`vue`, `pinia`, etc.), imports dynamiques à variable, `server/`, tests (`*.test.ts`, dossiers `__tests__` exclus du listing des fichiers candidats).
- **Points d’entrée** : `src/main.ts` et `src/router/index.ts` sont considérés comme entrées applicatives — même si le routeur n’importe qu’une partie des vues, le reste du graphe passe surtout par `App.vue` et les composants chargés depuis `main.ts`.
- **Fichiers `.d.ts`** : non parcourus comme modules depuis `main.ts` ; ils sont **exclus** de la rubrique « peut être supprimé » (rôle TypeScript / ambiant).
- **Limites** : imports dynamiques à chemin variable, enregistrement global, références hors `src/` (storybook, scripts, etc.) ne sont pas vus — l’étiquette « PEUT ÊTRE SUPPRIMÉ » reflète uniquement l’absence de lien **statique** depuis `main.ts`, pas un verdict outil de suppression.

## Fichiers `src/**` non atteignables depuis `main.ts`

*(Chaîne d’imports statique uniquement ; `[aucun]` = aucun module du graphe ne référence ce fichier.)*

src/components/ArrowIcon.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/BackButton.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/DateConverter.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/Favicon.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/LanguageSelector.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/SearchBar.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/components/SearchResults.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/composables/useDateConversion.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/services/DateConversionService.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/services/WikidataSearchService.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/services/WikidataStoryService.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/services/index.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/types/geological.js
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/types/graph.ts
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/views/DatabaseView/DatabaseCard.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/views/HomeView.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

src/views/HomeView/HomeView.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

## Statistiques

- Remarque : `src/types/geological.ts` est importé ailleurs ; `src/types/geological.js` est un fichier parallèle non référencé par le graphe (vérifier doublon / historique avant toute suppression).
- Fichiers candidats sous `src/` (hors `__tests__`, hors `*.test.ts`) : **95**
- Atteignables depuis `main.ts` : **75**
- Non atteignables (hors `*.d.ts`, hors entrées explicites) : **17**
- Fichiers `*.d.ts` sous `src/` (hors graphe, conservés hors liste suppression) : **3**

---

*Audit uniquement — aucune modification de code source ; aucune action de suppression prescrite par ce document.*
