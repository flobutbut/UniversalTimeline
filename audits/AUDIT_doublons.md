2026-04-10 — Audit doublons

Périmètre : arborescence `src/` (fichiers `.vue`, `.ts`, `.js`, `.css` pris en compte par les outils). Aucun fichier source n’a été modifié pour cet audit.

## Méthodologie

- **jscpd** (v4.0.5, exécution ponctuelle via `npx`) sur `src/` avec seuils `--min-tokens 50 --min-lines 5`, en excluant `**/*.test.ts` et `**/__tests__/**` pour la passe principale. Les clones **markup** comparent le template brut (y compris le sucre Vue), pas la sémantique runtime.
- **Relecture ciblée** : motifs de formatage de dates (`fmt`, `DateService.formatBound`), fabriques d’`id` par défaut, structures de payload API.
- **Absence dans le dépôt** : pas de `skyRenderers.js`, pas d’appels **Supabase** côté `src/` (pas de `createClient` / schéma client identique à recenser ici). Les exemples du cahier des charges qui ne correspondent à aucun fichier sont donc **non applicables**.

Les blocs ci-dessous relèvent des **similarités** (copie conforme, quasi copie, ou même intention métier réimplémentée). Aucune prescription de refactor : lecture d’audit uniquement.

---

## Doublons inter-fichiers

DOUBLON détecté :
  → `src/components/PeriodTreeView.vue` : `fmt(raw)` (lignes ~31–34)
  → `src/views/DatabaseView/StoryDetailPanel.vue` : `fmt(raw)` (lignes ~168–171)
  Détail : corps identique (`DateService.parse` / `formatBound`, cas `NOW` / `TODAY` / « aujourd’hui »).

DOUBLON détecté :
  → `src/components/PeriodTreeView.vue` : `fmt(raw)` ci-dessus
  → `src/services/SearchApiService.ts` : `fmt(raw?)` (lignes ~34–37)
  Détail : même chaîne `DateService.formatBound(DateService.parse(raw))` ; variante sur chaîne vide (`''` vs « aujourd’hui ») et absence des alias `NOW` / `TODAY` dans le service.

DOUBLON détecté :
  → `src/views/DatabaseView/DatabaseView.vue` : `formatStoryListDate(raw)` (lignes ~105–110)
  → les fonctions `fmt` ci-dessus
  Détail : même pipeline `DateService.parse` + `formatBound` avec règles proches pour `TODAY` / `NOW` / vide ; branchements et types de retour différents (`null` vs chaîne).

DOUBLON détecté :
  → `src/services/WikidataQueryService.ts` : méthode privée `retryOperation<T>` (lignes ~258–273)
  → `src/services/WikidataStoryService.ts` : méthode privée `retryOperation<T>` (lignes ~113–128)
  Détail : boucle de tentatives, temporisation `RETRY_DELAY`, agrégation d’erreur — séquence signalée comme clone par jscpd.

DOUBLON détecté :
  → `src/services/EventApiService.ts` : construction du `payload` dans `createEvent` (lignes ~75–85)
  → `src/services/PeriodApiService.ts` : construction du `payload` dans `createPeriod` (lignes ~97–110)
  Détail : même schéma `generateUUID`, `wikidata_id`, `label` / `description` bilingues avec repli `fr` / `en` ; champs métier (`date` vs `start_date` / `end_date`, etc.) diffèrent.

DOUBLON détecté :
  → `src/views/DatabaseView/EventPickerModal.vue` : bloc `<template #footer-left>` / `#footer-right` avec `Button` « Ajouter » (lignes ~42–49)
  → `src/views/DatabaseView/PeriodPickerModal.vue` : même structure de pied de modale (lignes ~60–69)
  Détail : clone markup jscpd ; libellé du compteur légèrement différent (`selection-count` / condition ternaire sur `ppm-count`).

DOUBLON détecté :
  → `src/components/base/Input.vue` : défaut de prop `id` via `() => \`input-${Math.random().toString(36).substr(2, 9)}\`` (withDefaults)
  → `src/components/base/Select.vue` : défaut de prop `id` via `() => \`select-${Math.random().toString(36).substr(2, 9)}\``
  Détail : même fabrique d’identifiant aléatoire, préfixe seul variable.

DOUBLON détecté :
  → `src/components/base/select-field-shared.css` (bloc de lignes ~6–21 signalé par jscpd)
  → `src/components/base/select-period-toolbar.css` (bloc ~18–33)
  Détail : règles CSS quasi identiques (propriétés et valeurs recoupées sur une quinzaine de lignes).

DOUBLON détecté :
  → `src/views/HomeView.vue` : enrobage `PeriodGrid` + `useHomeNavigation` + styles `.home-view`
  → `src/views/HomeView/HomeView.vue` : même logique et même template (ordre des blocs `<script>` / `<template>` différent)
  Détail : deux vues « racine » home quasi superposables ; risque de divergence à long terme si l’une seule est maintenue.

---

## Doublons intra-fichier (informationnel)

Ces cas ne relèvent pas de « plusieurs fichiers », mais du même constat de répétition locale ; utiles pour la lecture globale du dépôt.

- `src/validators/editFormValidators.ts` : plusieurs plages recoupées par jscpd (schémas de validation répétés dans le même module).
- `src/services/DateService.ts` : plages dupliquées au sein du fichier (jscpd).
- `src/services/DateConversionService.ts` : plages dupliquées au sein du fichier (jscpd).
- `src/services/WikidataQueryService.ts` : fragment dupliqué à l’intérieur du même fichier (jscpd).
- `src/services/PeriodApiService.ts` : motifs proches entre méthodes du même service (jscpd).
- `src/composables/useGraphView.ts` : séquences dupliquées dans le même composable (jscpd).
- `src/utils/dateFormatter.ts` : petit fragment dupliqué (jscpd).
- `src/views/DatabaseView/EditModal.vue` : portions de template recoupées dans le même SFC (jscpd).
- `src/components/ThemeToggle.vue` : deux blocs `<svg>` quasi identiques (structure soleil / lune) dans le même template (jscpd markup).
- `src/views/DatabaseView/StoryDetailPanel.vue` : `onSelectPeriod` et `onTimelineSelectPeriod` — corps identique (réassignations des mêmes refs) ; noms différents, même effet.

---

## Synthèse quantitative (jscpd, passe principale)

Paramètres : `min-tokens 50`, `min-lines 5`, exclusions tests. Ordre de grandeur : **~15** clones signalés au total sur l’arborescence analysée, dont une partie **intra-fichier** (voir section précédente). Les pourcentages exacts figurent dans le rapport machine généré lors de l’audit (non archivé dans ce dépôt pour éviter l’accumulation d’artefacts).

---

*Audit uniquement — aucune proposition de correction détaillée ni modification de code associée à ce document.*
