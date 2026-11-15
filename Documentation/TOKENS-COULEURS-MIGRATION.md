# Tokens couleur — table de migration (proposition)

Statut : **appliqué dans Figma et dans le code le 2026-11-15** (anciens noms renommés directement, sans alias). La colonne « Code actuel » donne les anciens noms. Décisions retenues : `interactive/selected` = blue/50 en clair (valeur Figma), `text/heading` fusionné dans `text/primary`, `text/on-accent` (blanc) / `text/on-data` séparés, `neutral/450` = #8b8b94, neutres sombres chauds conservés. `data/period-root` pointait sur une variable supprimée (102 liaisons) : recréée et rebranchée. Résultat : 44 rôles.
Source de vérité des valeurs : le fichier Figma (collections « Couleurs · Primitives » et « Couleurs · Usages »).
Usages = nombre de liaisons directes (remplissages et contours) relevées dans tout le fichier Figma le 2026-11-15.

## Principes

1. Trois niveaux : **primitives** (valeurs brutes, échelles complètes), **rôles** (ce que le code consomme), **tokens de composant** (seulement si un composant a une décision propre).
2. Un rôle par décision : une variable qui vaut toujours la même chose qu'une autre est fusionnée.
3. Noms en minuscules, identiques un pour un dans le code : `bg/surface` ↔ `--color-bg-surface`.
4. Migration sans casse : on **renomme** les variables Figma (les liaisons suivent), on rebranche les doublons, puis on supprime. Côté code, les anciens noms restent en alias des nouveaux le temps de la migration.

## Rôles

Valeurs : Clair | Sombre. « ⚠ » = décision à prendre.

### Fonds — `bg/`

| Ancien (Figma) | Nouveau | Code actuel | Usages | Valeur | Note |
|---|---|---|---|---|---|
| surface/canvas | `bg/app` | `--color-background-default` | 478 | neutral/0 \| 950 | Le code utilise neutral-200 \| 900 : inversion à corriger côté code |
| surface/default | `bg/surface` | `--color-surface-default` | 884 | neutral/200 \| 800 | Idem, inversé dans le code |
| surface/overlay | `bg/raised` | `--color-surface-raised` | 20 | neutral/50 \| 650 | |
| surface/muted | `bg/sunken` | `--color-surface-subtle` | 233 | neutral/100 \| 850 | |
| overlay/backdrop | `bg/scrim` | `--overlay-scrim` | 1 | alpha/black/60 \| 70 | |
| shadow/overlay | `effect/shadow` | (ombres en rgba en dur) | 0 | alpha/black/14 \| 40 | Sort des couleurs ; à brancher sur `--shadow-*` |

### Texte — `text/`

| Ancien | Nouveau | Code actuel | Usages | Valeur | Note |
|---|---|---|---|---|---|
| text/primary | `text/primary` | `--color-text-primary` | 830 | neutral/800 \| 200 | |
| text/heading | **fusion → `text/primary`** | `--color-text-heading` | 0 | neutral/900 \| 100 | ⚠ Aucun usage Figma, 4 dans le code ; écart minime avec primary |
| text/secondary | `text/secondary` | `--color-text-secondary` | 889 | neutral/600 \| 350 | |
| text/tertiary | `text/tertiary` | (à créer) | 308 | neutral/500 \| **neutral/450** | ⚠ Sombre pointait sur Landing/787882 (≈ 3,8:1, sous l'AA). Proposition : nouvelle primitive neutral/450 ≈ #8b8b94 (≈ 4,9:1 sur neutral/950) |
| text/disabled | `text/disabled` | `--color-text-disabled` | 589 | neutral/400 \| 600 | |
| text/link | `text/link` | `--color-text-link` | 105 | blue/800 \| 300 | |
| text/on-action | `text/on-accent` | (à créer) | 38 | neutral/0 \| 0 | Texte sur bouton primaire et danger, blanc dans les deux thèmes |
| text/on-accent | `text/on-data` | `--color-text-on-period` | 329 | neutral/0 \| 950 | ⚠ À vérifier : utilisé sur les barres colorées (Period bar…), pas sur les boutons |
| text/on-selected | `text/on-selected` | `--color-text-on-selected` | 51 | blue/900 \| 100 | |

### Bordures — `border/`

| Ancien | Nouveau | Code actuel | Usages | Valeur |
|---|---|---|---|---|
| border/subtle | `border/subtle` | `--color-border-light` | 69 | neutral/300 \| 650 |
| border/default | `border/default` | `--color-border-default` | 1 486 | neutral/400 \| 600 |
| border/strong | `border/strong` | `--color-border-strong` (+ `-dark`) | 10 | neutral/500 \| 400 |
| border/focus | `border/focus` | `--color-border-focus` | 94 | blue/600 \| 300 |

### Interactions neutres — `interactive/`

| Ancien | Nouveau | Code actuel | Usages | Valeur | Note |
|---|---|---|---|---|---|
| action/neutral/hover | `interactive/hover` | `--color-interaction-hover` | 40 | neutral/350 \| 650 | |
| action/neutral/pressed | `interactive/pressed` | `--color-interaction-pressed` | 0 | neutral/400 \| 600 | |
| action/Secondary/selected | `interactive/selected` | `--color-interaction-selected` | 147 | blue/50 \| 950 | ⚠ Le code utilise blue-100 en clair |
| action/Secondary/default | **fusion → `interactive/selected`** | idem | 4 | blue/100 \| 950 | Choisir blue/50 ou blue/100 pour le clair |
| action/Secondary/disabled | `interactive/disabled` | `--color-interaction-disabled` | 24 | neutral/200 \| 800 | |
| action/Primary/disabled | **fusion → `interactive/disabled`** | — | 0 | alias | |
| action/Danger/disabled | **fusion → `interactive/disabled`** | — | 0 | alias | |

### Action principale — `accent/`

| Ancien | Nouveau | Code actuel | Usages | Valeur | Note |
|---|---|---|---|---|---|
| action/Primary/default | `accent/default` | `--color-action-primary-default` (+ `--color-primary`) | 104 | blue/600 \| 600 | `--color-primary` (37 usages code) devient un alias de `accent/default` |
| action/Primary/hover | `accent/hover` | `--color-action-primary-hover` | 6 | blue/700 \| 700 | |
| action/Primary/pressed | `accent/pressed` | `--color-action-primary-pressed` | 4 | blue/800 \| 800 | |
| action/Primary/selected | **supprimé → `accent/pressed`** | — | 0 | blue/800 | Même valeur que pressed |

### Action destructive — `danger/`

| Ancien | Nouveau | Code actuel | Usages | Valeur |
|---|---|---|---|---|
| action/Danger/default | `danger/default` | `--color-action-danger-default` | 45 | red/600 \| 400 |
| action/Danger/hover | `danger/hover` | `--color-action-danger-hover` | 6 | red/700 \| 300 |
| action/Danger/pressed | `danger/pressed` | — | 0 (+ 1 via status/danger/pressed) | red/800 \| 200 |
| action/Danger/selected | **supprimé → `danger/pressed`** | — | 0 | alias |

### Retours d'état — `feedback/{success,warning,error,info}/`

Trois rôles par famille : `fg` (texte et icône), `bg` (fond d'encart), `border` (contour d'encart).

| Ancien | Nouveau | Code actuel | Usages |
|---|---|---|---|
| status/success/foreground | `feedback/success/fg` | `--color-status-success-foreground` | 60 |
| status/success/background | `feedback/success/bg` | `--color-status-success-background` | 12 |
| status/success/surface | `feedback/success/border` | — | 1 |
| status/danger/foreground | `feedback/error/fg` | `--color-status-error-foreground` | 21 |
| status/danger/background | `feedback/error/bg` | `--color-status-error-background` | 10 |
| status/danger/surface | `feedback/error/border` | — | 0 |
| status/warning/foreground | `feedback/warning/fg` | `--color-status-warning-foreground` | 2 |
| status/warning/background | `feedback/warning/bg` | `--color-status-warning-background` | 4 |
| status/warning/surface | `feedback/warning/border` | — | 0 |
| status/info/foreground | `feedback/info/fg` | — | 0 |
| status/info/background | `feedback/info/bg` | — | 0 |
| status/info/surface | `feedback/info/border` | — | 0 |
| status/info/default | **fusion → `feedback/info/fg`** | — | 2 |
| status/danger/pressed | **rebranché → `danger/pressed`** | — | 1 |
| status/*/default, hover, pressed, focus (14 autres) | **supprimés** | — | 0 |

### Données — `data/` (inchangé)

| Rôle | Code | Usages | Valeur |
|---|---|---|---|
| `data/period` | `--color-data-period` | 154 | blue/500 \| 300 |
| `data/period-root` | `--color-data-period-root` | — | green/600 \| 400 |
| `data/event` | `--color-data-event` | 365 | copper/600 \| 400 |
| `data/frise` | `--color-data-frise` | 50 | purple/600 \| 400 |

## Primitives

| Action | Variables | Note |
|---|---|---|
| Supprimer | `primary/700`, `primary/800` | Alias de blue, 0 usage : un rôle déguisé |
| Supprimer | `Landing/2563eb`, `Landing/787882` | Le premier = blue/600 ; le second est remplacé par neutral/450 |
| Ajouter | `neutral/450` | ⚠ Valeur à valider (≈ #8b8b94) |
| ⚠ Décider | `neutral/800` → `950` | Gris chauds (#3b3b3a → #1f1f1e) alors que 0 → 700 sont des zinc froids. Soit on assume une échelle neutre unique « chaude en sombre », soit on réaligne 800–950 sur les zinc |
| Compléter | `red/500`, `blue/…` déjà complète, `green`/`amber`/`red` 50 → 950 | Échelles homogènes même si toutes les teintes ne servent pas |
| Garder | `copper/*`, `purple/*`, `alpha/black/*` | Seulement les paliers utilisés |

## Bilan

- Rôles : **70 → 39** (31 fusions ou suppressions, dont 22 sans aucun usage).
- Primitives : 4 suppressions, 1 ajout, une décision sur les neutres sombres.
- Décisions ouvertes (⚠) : `interactive/selected` en clair (blue/50 ou 100), `text/heading`, `text/on-accent` / `on-data`, `neutral/450`, neutres sombres.

## Ordre d'application

1. Figma : renommer les variables conservées (les liaisons suivent), rebrancher les doublons, supprimer les variables vides, mettre à jour les codeSyntax.
2. Code : ajouter les nouveaux noms dans `variables.css` avec les valeurs Figma, garder les anciens en alias, migrer les composants, puis retirer les alias.
3. Contrôle visuel des écrans de référence en clair et en sombre.

## Corrections de contraste (2026-11-15, Figma et code)

- Clair : `data/period` → blue/700, `data/period-root` → green/700, `feedback/success/fg` → green/700.
- Sombre : `danger/default`, `hover`, `pressed` → red/600, 700, 800 (mêmes valeurs qu’en clair).

`yarn verify:design` valide les 70 contrastes dans les deux thèmes.
