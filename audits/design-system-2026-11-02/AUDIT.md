# Audit du design system et de son utilisation

> Photographie avant correction. Les écarts ci-dessous ont été traités : voir [le bilan des corrections](CORRECTIONS.md).

Date : 2 novembre 2026. Application examinée : Universal Timeline, état courant du répertoire de travail, y compris les modifications non commitées déjà présentes.

## Verdict

Le produit possède un véritable socle de design system, mais son application reste partielle. Les couleurs sont largement centralisées et plusieurs composants sont bien réutilisés. Les écarts viennent principalement de mauvais rôles de couleurs, de styles ajoutés dans les écrans pour modifier l'intérieur des composants et de patterns visuels encore développés séparément.

| Question | Réponse |
| --- | --- |
| Tout ce qui est réutilisé est-il un composant ? | Non. Les boutons de contenu sans date, les tags, les états de chargement/erreur et plusieurs surfaces de listes restent dispersés. Les composants structurants, eux, sont déjà largement partagés. |
| Les tokens de couleur sont-ils employés ? | Oui, très largement. Leur rôle n'est cependant pas toujours approprié : texte blanc fixe sur accent variable selon le thème, et couleurs de données utilisées pour du petit texte. |
| Les tokens typographiques sont-ils employés ? | Majoritairement. Il manque des styles typographiques par rôle et une source unique pour les règles de taille/interligne. Un nom de token de taille est inexistant. |
| Les écrans sont-ils graphiquement cohérents ? | La palette, les familles de police et les contrôles créent une parenté claire. Les sélections, la densité des listes, les surfaces et certains états divergent. Périodes et Événements sont les deux écrans les mieux alignés. |

## Périmètre et méthode

- Lecture des 66 fichiers Vue et 10 fichiers CSS sous `src`, hors tests. Analyse syntaxique des templates Vue et des déclarations CSS, puis vérification manuelle des cas signalés.
- Parcours des imports depuis `src/main.ts` : 64 fichiers Vue atteignables, dont la page de design system. Deux anciennes modales ne sont plus atteignables.
- Observation dans le navigateur local, fenêtre de 961 × 921 pixels : accueil et voyage en sombre ; timeline en clair et sombre ; galerie en clair et sombre ; liste des frises en clair ; détail de Renaissance en clair et sombre ; catalogue Périodes et modale de création en sombre ; catalogue Événements en clair ; démonstrations Button, Input, Finder et Switch.
- Mesures des couleurs et dimensions effectivement calculées par le navigateur pour les cas précisés ci-dessous. Calcul des contrastes à partir des couleurs sRGB, sans échantillonnage des pixels anticrénelés.
- Responsive mobile examiné dans le code seulement. Pas de validation visuelle complète à 390 pixels, de comparaison avec un fichier Figma ni de certification d'accessibilité exhaustive.
- Aucune modification du code applicatif ou des données métier. Aucun formulaire de création ou de modification n'a été enregistré. Les captures et ce rapport sont les livrables de l'audit.

Les seuils de référence sont 4,5:1 pour le texte courant et 3:1 pour les informations graphiques nécessaires à l'identification d'un contrôle ou de son état. Voir [W3C — contraste du texte](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) et [W3C — contraste non textuel](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Les contrôles inactifs ne sont pas jugés avec ces mêmes exigences.

## Ce qui fonctionne déjà

- `primitives.css` distingue la palette des rôles exposés par `variables.css`, avec des valeurs pour les deux thèmes.
- `Button` adapte correctement le texte des fonds pleins : contraste mesuré/calculé de **7,37:1 en clair** et **7,15:1 en sombre** pour l'état primaire normal.
- Les tailles principales des contrôles sont réellement alignées. Les champs `Input` mesurés font 44 et 36 pixels ; les actions du catalogue et sa recherche font 36 pixels.
- `CatalogueToolbar` et `CatalogueFilters` sont utilisés pour Frises, Périodes et Événements ; `CatalogueTable` est partagé entre Périodes et Événements.
- `ModalShell`, `SearchInput`, `Select`/`SelectShell`, `Tabs`, `Switch`, `StoryTimeline`, `ItemSummary` et `StoryMembershipField` constituent déjà des points de mutualisation utiles.
- Des fondations d'accessibilité existent : focus visibles sur de nombreux contrôles, gestion des dialogues partagée, noms accessibles pour les recherches et interrupteurs, prise en compte de la réduction des animations.

Quelques chiffres de réutilisation, hors page de démonstration et hors deux modales inutilisées :

| Composant | Appels dans les templates | Fichiers utilisateurs |
| --- | ---: | ---: |
| Button | 53 | 27 |
| Input | 14 | 3 |
| SearchInput | 5 | 5 |
| Select et son alias BaseSelect | 9 | 7 |
| ModalShell | 6 | 6 |
| CatalogueToolbar | 3 | 3 |
| CatalogueTable | 2 | 2 |
| Tabs | 3 | 3 |

Ce sont des occurrences statiques, pas des nombres d'instances affichées. Un bouton natif à l'intérieur de `Tabs` ou d'un menu n'est pas en soi un défaut : le critère utile est la centralisation d'une règle visuelle et comportementale récurrente.

## Constats priorisés

### A1 — P1 : texte blanc fixe sur accent clair en thème sombre

**Constat confirmé dans le navigateur.** Le finder de la page de démonstration affiche du blanc `#ffffff` sur le bleu `#7aa3d4`, soit **2,62:1**. Les dates utilisent du blanc à 82 % d'opacité, ce qui réduit encore leur contraste. Les appels à l'action de l'accueil et du voyage ont la même association blanc/bleu.

Sources : `src/views/GraphView/FinderItem.vue:204`, `:278`, `:321` ; `src/views/LandingView.vue:143` ; `src/views/ScrollLandingView.vue:113`. Les couleurs ont été confirmées par les styles calculés des éléments affichés.

**Impact :** les actions et lignes sélectionnées perdent leur lisibilité en sombre, alors que le `Button` partagé fonctionne correctement.

**Correction :** employer `Button` avec `to` pour les actions de navigation communes. Pour une sélection, employer le couple `--color-interaction-selected` / `--color-text-on-selected`, ou définir explicitement une variante sur fond accent utilisant `--color-text-on-accent`. Faire hériter la couleur aux dates, actions et chevrons de cette variante.

Preuves : [finder en sombre](finder-dark.png), [accueil en sombre](landing-dark.png), [voyage en sombre](journey-dark.png).

### A2 — P1 : couleurs de données utilisées comme couleurs de petit texte

**Constat confirmé dans la recherche « Terre » en clair.** Le libellé « Événement », en 10 pixels, est rendu en `#b87256` sur blanc : **3,76:1**. Le rôle « Période » utilise `#5080b0`, soit **4,15:1** sur blanc, également sous le seuil du texte courant ; cette seconde association est établie par le code et les tokens.

Sources : `src/components/GlobalSearch.vue:155` et `:156` ; `src/styles/variables.css:71` et `:74`.

**Impact :** une couleur adaptée à une barre ou un marqueur ne garantit pas la lisibilité d'un texte. La présence d'un token ne suffit donc pas à valider son usage.

**Correction :** réserver les accents de données aux marqueurs, et afficher les mots dans un rôle de texte contrasté ; ou créer des rôles `text-period` / `text-event` explicitement validés dans les deux thèmes.

Preuve : [résultats de recherche en clair](search-light.png).

### A3 — P1 : état « arrêt » des interrupteurs trop peu visible

**Constat visuel confirmé dans Switch et dans le détail de Renaissance.** La piste au repos utilise `--color-surface-hover` (`#fafafa` en clair), le curseur `--color-surface` (`#ffffff`), sans bordure. Le contraste entre curseur et piste est **1,04:1**. Dans la barre blanche du détail, l'interrupteur « Périodes additionnelles » est presque invisible alors qu'il est actif et utilisable.

Source : `src/components/base/Switch.vue:79` et `:90`.

**Correction :** définir un rôle de piste au repos et/ou une bordure qui permette d'identifier le contrôle et la position du curseur dans les deux thèmes ; vérifier aussi la petite variante. L'état désactivé doit rester distinct de l'état arrêt.

Preuves : [Switch en clair](switch-light.png), [interrupteur dans l'écran réel](story-detail-light.png).

### A4 — P2 : cinq noms de tokens ne sont définis nulle part

| Nom | Emplois observés | Effet |
| --- | --- | --- |
| `--border-radius-sm` | `StoryTimeline.vue:292`, `PeriodGrid.vue:480`, `style.css:62` | Déclaration d'arrondi invalide ; les deux groupes de boutons de contenu sans date sont concernés dans le code actif. |
| `--border-radius-md` | `style.css:115` et `:124` | Arrondi invalide des classes globales de message ; le résultat dépend d'éventuelles règles locales. |
| `--font-size-md` | `StoryRelationsPanel.vue:94` | Taille des titres dépendant de l'héritage au lieu d'une valeur définie. |
| `--color-secondary` | `styles/base.css:138` et `:144` | Utilitaires globaux inutilisables tels quels ; aucune utilisation active de ces classes n'a été établie. |
| `--color-background-secondary` | `PeriodGrid.vue:633` | Le fallback blanc à 6 % est toujours utilisé au survol du menu ; il n'apporte aucun changement sur une carte blanche. |

Il s'agit de **neuf références** à cinq noms. Le dernier possède un fallback ; les quatre autres n'en ont pas. Les variables de géométrie déclarées dynamiquement dans les composants ont été exclues des faux positifs.

**Correction :** remplacer les noms d'arrondi par `--radius-sm` / `--radius-md`, choisir une taille existante pour les titres et utiliser un vrai rôle de survol. Supprimer ou définir les utilitaires secondaires selon leur usage souhaité. Ajouter un contrôle statique des références de tokens, avec prise en compte des variables locales.

### A5 — P2 : la présentation d'un composant dépend de son écran parent

`StoryDetailPanel.vue:1006–1032` modifie l'intérieur de `Tabs`, `Button`, `FilterBar` et `FinderItem` avec `:deep`. Le finder sélectionné reçoit ainsi une correction locale de ses couleurs, absente de la démonstration du composant.

**Constat supplémentaire mesuré en clair :** dans le détail, le titre et les dates sélectionnés sont bien en `#1c466f` sur `#d4e3f0`, mais le SVG du chevron reste blanc. La correction locale est donc incomplète.

Les ajouts successifs de styles sont également visibles dans `Input.vue:178`, `Tabs.vue:284` et la fin de `Header.vue`. Ils remplacent des règles encore présentes plus haut. Plusieurs blocs de styles peuvent être légitimes ; ici, le problème est la superposition de définitions concurrentes d'une même présentation.

**Correction :** déplacer les règles communes dans les composants, avec des variantes explicites pour la densité ou le contexte. Réserver les règles du parent au placement et aux dimensions de son écran. Fusionner les anciennes règles remplacées après validation du résultat calculé.

Preuves : [finder de démonstration](finder-dark.png), [finder intégré au détail](story-detail-dark.png).

### A6 — P2 : certains patterns récurrents ne sont pas encore mutualisés

| Pattern | Exemples actifs | Mutualisation utile |
| --- | --- | --- |
| Boutons de contenu sans date | `StoryTimeline.vue:292`, `PeriodGrid.vue:480` : mêmes styles, même token d'arrondi invalide | Petit composant de bouton/tag de contenu sans date, ou règle partagée si seul le style est commun. |
| Tags et éléments supprimables | `CatalogueTable.vue`, `StoryCategoriesForm.vue`, `StoryMembershipField.vue`, filtres | `Tag` / `EntityChip` avec variantes et action de retrait accessible. |
| États chargement, erreur, vide et nouvelle tentative | `DatabaseView.vue`, `StoryDetailPanel.vue`, `CatalogueTable.vue`, sélecteurs et formulaires | Composant d'état avec message, variante et action optionnelle. |
| Surfaces de menus et listes de résultats | `GlobalSearch.vue`, `FilterBar.vue`, `PeriodGrid.vue`, `AssociatedStoriesBadge.vue` | Socle de surface/espacement/ombre ; conserver les comportements de recherche et de navigation propres à chaque contexte. |

Un cas annexe mérite d'être corrigé : le checkbox de `StoryRelatedPickerModal.vue:22` n'est relié ni à un `label` ni à un nom ARIA ; le titre adjacent est un `span`. Une ligne de sélection partagée peut porter cette association correctement.

Les deux champs natifs de `LoginView.vue` contournent aussi `Input`. Leur migration suppose d'abord que `Input` transmette `name`, `autocomplete` et les autres attributs au contrôle interne : actuellement, ses attributs non déclarés retombent sur le conteneur racine. Il faut préserver le fonctionnement des formulaires de connexion.

### A7 — P2 : deux langages visuels de listes cohabitent

**Constat visuel confirmé.** La liste des frises utilise des rangées séparées comme des cartes, du texte à 13 pixels et une hauteur de ligne de tableau de 68 pixels minimum. Périodes et Événements utilisent un tableau dense à 11 pixels, des séparateurs continus et des actions de modification au survol/focus.

Sources : `StoryGallery.vue:116–128` ; `CatalogueTable.vue:186` et styles des lignes/actions.

Ce n'est pas une obligation d'avoir le même tableau pour tous les objets. Mais aucune variante commune n'explicite ces différences de densité, de surface, de titre, d'état ou d'action. Une évolution du tableau partagé ne bénéficie pas à la liste des frises.

La terminologie accentue la rupture : navigation « Periods » / « Events », onglet « Settings », colonne « Last edit », puis « Modifié » dans les autres catalogues. Les libellés doivent suivre la langue de l'interface.

**Correction :** définir des variantes documentées de liste « compacte » et « confortable » avec des règles communes, puis choisir le rendu par besoin de contenu. Harmoniser les libellés et le traitement de la dernière modification.

Preuves : [liste des frises](story-list-light.png), [tableau des événements](events-light.png).

### A8 — P2 : les styles dédiés au textarea ne s'appliquent pas

Le template de `Input.vue:10` rend un `<textarea>` sans attribut `type`. Les sélecteurs `.base-input__field[type="textarea"]` à `:163` et `:184` ne peuvent donc jamais correspondre.

**Mesure dans la démonstration :** le textarea fait 58 pixels de haut, avec un `min-height` calculé de 44 pixels ; ni la règle initiale à 120 pixels ni la règle ajoutée à 88 pixels ne s'appliquent. `StorySettingsForm.vue:91` compense localement avec un autre `:deep` pour atteindre 160 pixels.

**Correction :** cibler `textarea.base-input__field` ou une classe dédiée et proposer une taille/hauteur explicite si plusieurs contextes sont nécessaires. Définir une seule valeur par variante.

Preuve : [démonstration Input](input-dark.png).

### A9 — P2 : le catalogue du design system couvre insuffisamment les composants actuels

La page présente les fondations et les premiers composants, mais pas `CatalogueTable`, `CatalogueToolbar`, `CatalogueFilters`/`FilterBuilder`, `StoryTabsBar`, les cartes de galerie ou les principaux tags. Les éléments qui structurent les écrans actuels ne bénéficient donc pas tous d'une démonstration de référence.

La présentation de Button annonce encore une prop `icon`, alors que son API utilise le slot `#icon`. La documentation des icônes dans `.agent/CONVENTIONS.md` annonce une bibliothèque unique Iconify, tandis que l'application utilise aussi `DesignIcon` et les SVG issus de Figma. Deux sources d'icônes peuvent être un choix valable ; la règle de taille et de choix doit être explicite.

Le parcours des imports identifie deux fichiers Vue non atteignables depuis l'application : `EventPickerModal.vue` et `PeriodPickerModal.vue`. Ils ne doivent pas être pris pour des patterns actifs à factoriser. L'ancien `audits/AUDIT_composants.md` ne décrit plus fidèlement l'état actuel, notamment la séparation de `Select` et `PeriodSelect`.

**Correction :** compléter les démos avec les composants actuels, leurs variantes et leurs états ; mettre à jour les API documentées ; décider du retrait ou du statut des anciennes modales. Vérifier les deux thèmes à chaque évolution des composants.

### A10 — P3 : la typographie et les espacements ont une échelle, mais pas encore un contrat complet

Les usages de texte combinent `--color-text` et son alias `--color-text-primary`, `--color-text-light` et `--color-text-secondary`. Ce dernier est défini plusieurs fois dans `variables.css:62`, `:204`, `:240` et `:273`. Après cascade, `text-light` et `text-secondary` aboutissent à la même valeur dans les deux thèmes : les noms suggèrent une distinction qui n'existe plus.

Les interlignes sont également répartis entre `--base-line-height`, l'ancienne série `tight/normal/relaxed` et la série `micro/small/body/heading/dialog`. Le corps global utilise 18 pixels dans `base.css`, puis 22 pixels dans `App.vue` ; les composants choisissent leurs propres combinaisons.

L'analyse trouve 282 déclarations CSS `font-size` hors démonstration : 251 référencent une variable, 29 contiennent une valeur numérique sans token et 2 utilisent `inherit`. Les tailles fluides des grandes compositions éditoriales sont raisonnables ; les quatre tailles en `rem` du menu de `PeriodGrid.vue:611–654` illustrent davantage une échelle locale parallèle. La petite typographie de 10/11 pixels est très présente : cohérente dans les tableaux denses, mais à valider pour les contenus de lecture et les contextes mobiles.

Les espacements mélangent tokens, valeurs identiques écrites directement (`12px`, `16px`, `24px`) et exceptions spécifiques. Les exceptions de géométrie de timeline ou de visualisation ne sont pas automatiquement des défauts.

**Correction :** choisir un vocabulaire sémantique unique et des styles typographiques par rôle : corps, métadonnée, libellé de champ, titre de panneau, titre éditorial. Regrouper taille, interligne et graisse. Migrer progressivement les alias puis documenter les exceptions de mise en page.

## Cohérence par écran

| Écran | Appréciation | Points principaux |
| --- | --- | --- |
| Accueil | Identité éditoriale cohérente avec la marque | Serif et accents repris ; action principale en sombre à corriger (A1). |
| Voyage | Même famille éditoriale que l'accueil | Grandes échelles typographiques justifiées ; même défaut d'action principale (A1). |
| Timeline publique | Palette commune, visualisation spécifique pertinente | Recherche très petite et accents de données employés pour du texte (A2) ; menu local parallèle. |
| Galerie des frises | Bonne cohérence des cartes et aperçus | Recherche et actions partagées ; contrat de surface à clarifier (`surface` pour les cartes, malgré le rôle `card` existant). |
| Liste des frises | Cohérente avec sa galerie | Rupture de densité et de traitement avec les deux autres catalogues (A7). |
| Périodes et Événements | Meilleure cohérence transversale | Même tableau, filtres, actions et modale ; largeur horizontale importante à vérifier sur mobile, sans conclure à un défaut sur cette seule base. |
| Détail d'une frise | Structure compréhensible, styles fortement locaux | Contraste du switch (A3), correction partielle du finder et nombreuses surcharges (A5). |
| Modale de création | Bonne base de réutilisation | Champs et pied communs ; textarea incohérent avec la règle déclarée (A8). |
| Connexion, accès refusé et page introuvable | Examinés dans le code seulement | Champs de connexion hors composant ; marges et structure d'états à harmoniser si ces écrans sont repris. |

## Ordre recommandé des corrections

1. **Lisibilité immédiate :** A1, A2 et A3. Valider les couleurs réellement calculées dans les deux thèmes, y compris dates, chevrons et petites variantes.
2. **Fiabilité du socle :** corriger les cinq noms de tokens et le textarea (A4, A8), puis ramener les corrections de sélection dans `FinderItem` (A5).
3. **Réutilisation :** mutualiser en premier les tags, boutons de contenu sans date et états de feedback qui existent réellement dans plusieurs contextes (A6). Garder les interfaces simples et éviter d'ajouter des variantes sans besoin actuel.
4. **Cohérence des écrans :** formaliser les deux densités de listes, les surfaces et les styles typographiques, puis aligner la terminologie (A7, A10).
5. **Prévention :** compléter le catalogue de référence et les contrôles de tokens ; ajouter quelques vérifications visuelles ciblées en clair/sombre sur les sélections, les actions et les champs (A9).

Critères de fin : aucun token global manquant ; contrastes des cas signalés corrigés ; sélection d'un composant conforme à sa démo sans correction interne depuis le parent ; textarea à la hauteur définie ; variantes de listes et de typographie documentées ; composants actuels présents dans le catalogue.
